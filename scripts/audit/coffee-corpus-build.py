#!/usr/bin/env python3
"""Credential-free discovery for the independent 600-coffee source audit.

This script does not invoke the extractor or use its output to select sources.
Every attempt is retained, including blocked or ineligible candidates. Directory
locations are leads, not verification of a roaster's U.S. location. The manifest
must be manually reviewed before it becomes the acceptance oracle.
"""
import argparse
import concurrent.futures
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from lxml import html

USER_AGENT = 'DialInCollective-CoffeeSourceAudit/1.0'
MAX_BYTES = 3_000_000
USA_STATES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())
COUNTRIES = re.compile(r'\b(?:Colombia|Ethiopia|Kenya|Guatemala|Costa Rica|Brazil|Brasil|Honduras|El Salvador|Nicaragua|Peru|Mexico|Rwanda|Burundi|Indonesia|Sumatra|Panama|Ecuador|Bolivia|Papua New Guinea|Tanzania|Uganda|Yemen|Haiti|India|Vietnam|Kona|Hawaii)\b', re.I)
NON_COFFEE = re.compile(r'\b(?:gift cards?|gift certificates?|subscriptions?|samplers?|sample packs?|bundles?|tasting sets?|taster sets?|brewers?|grinders?|mugs?|tumblers?|t-shirts?|tees?|sweatshirts?|hoodies?|hats?|caps?|kettles?|filters?|drippers?|aeropress|chemex|v60|gift (?:box|set)|tea|matcha|cocoa|chocolate bars?|syrup|cold brew|instant|concentrate|pods?|capsules?|k-cups?|green coffee|unroasted|wholesale|coffee passport|coffee of the month|roaster.s choice|taste . learn|\d[ -]pack|nano.?lotes)\b', re.I)
COFFEE_SIGNALS = re.compile(r'\b(?:coffee|espresso|roast|washed|natural|honey|anaerobic|varietal|variety|bourbon|caturra|geisha|gesha|tasting notes|decaf|blend)\b', re.I)
FACT_SIGNALS = re.compile(r'\b(?:origin|varietal|variety|cultivar|process|processing|harvest|altitude|elevation|producer|farm|tasting|notes|masl|m\.a\.s\.l)\b', re.I)
LOCK = threading.Lock()
AUDIT_HOSTS = threading.local()


def safe_url(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or not u.hostname or u.username or u.password or u.port or len(url) > 3000:
        raise ValueError('not_public_https')
    if '.' not in u.hostname or u.hostname.endswith('.'):
        raise ValueError('invalid_host')
    if u.hostname not in getattr(AUDIT_HOSTS, 'allowed', set()):
        raise ValueError('redirect_outside_reviewed_roaster_hosts')
    try:
        ipaddress.ip_address(u.hostname)
        raise ValueError('literal_address_not_allowed')
    except ValueError as exc:
        if str(exc) == 'literal_address_not_allowed':
            raise
    # The local workspace's managed HTTPS proxy resolves destinations itself;
    # direct DNS is unavailable. Exact discovered-host allowlisting remains.
    # These are source captures, not evidence that production DNS pinning ran.
    # Production transport code and its isolated security tests are unchanged.
    if not os.environ.get('HTTPS_PROXY'):
        for answer in socket.getaddrinfo(u.hostname, 443, type=socket.SOCK_STREAM):
            if not ipaddress.ip_address(answer[4][0]).is_global:
                raise ValueError('non_public_address')
    return url


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 3

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def clean_document(body):
    d = html.fromstring(body)
    for el in d.xpath('//script|//style|//svg|//nav|//select|//noscript|//template'):
        el.drop_tree()
    text = '\n'.join(re.sub(r'\s+', ' ', x).strip() for x in d.itertext() if x.strip())
    return d, text


def read_public(url, folder, label, requests):
    started = time.monotonic()
    record = {'url': url, 'label': label, 'status': None}
    try:
        safe_url(url)
        parsed = urllib.parse.urlsplit(url)
        transport_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc,
            urllib.parse.quote(parsed.path, safe='/%:@-._~!$&\'()*+,;='),
            urllib.parse.quote(parsed.query, safe='=&%/:?@-._~!$\'()*+,;'), ''))
        opener = urllib.request.build_opener(PublicRedirect())
        with opener.open(urllib.request.Request(transport_url, headers={'User-Agent': USER_AGENT, 'Accept': 'text/html,application/json,application/xml;q=0.9'}), timeout=18) as response:
            data = response.read(MAX_BYTES + 1)
            record.update(status=response.status, final_url=response.url, content_type=response.headers.get('Content-Type', ''), bytes=len(data))
            if len(data) > MAX_BYTES:
                record['error'] = 'discovery_size_limit'
                return None, response.url
            name = label + ('.json' if 'json' in record['content_type'] else '.html')
            (folder / name).write_bytes(data)
            record.update(file=name, sha256=hashlib.sha256(data).hexdigest())
            return data.decode('utf-8', errors='replace'), response.url
    except Exception as exc:
        record['error'] = type(exc).__name__ + ': ' + str(exc)[:160]
        if isinstance(exc, urllib.error.HTTPError):
            record['status'] = exc.code
        return None, url
    finally:
        record['elapsed_ms'] = round((time.monotonic() - started) * 1000)
        requests.append(record)


def product_score(p):
    title = str(p.get('title') or '')
    description = re.sub('<[^>]+>', ' ', str(p.get('body_html') or p.get('description') or ''))
    kind = str(p.get('product_type') or '')
    tags = ' '.join(p.get('tags', [])) if isinstance(p.get('tags'), list) else str(p.get('tags') or '')
    if not title or NON_COFFEE.search(title) or NON_COFFEE.search(kind):
        return -1
    if not (COFFEE_SIGNALS.search(title + ' ' + description + ' ' + kind + ' ' + tags) or COUNTRIES.search(title)):
        return -1
    variants = p.get('variants') or []
    if variants and not any(v.get('available', True) for v in variants):
        return -1
    return len(FACT_SIGNALS.findall(description)) * 4 + min(len(description), 2000) / 500 + bool(COUNTRIES.search(title)) * 3


def visible_product_links(document, base):
    found = []
    for a in document.xpath('//a[@href]'):
        url = urllib.parse.urljoin(base, a.get('href'))
        u = urllib.parse.urlsplit(url)
        if u.scheme != 'https' or u.netloc != urllib.parse.urlsplit(base).netloc:
            continue
        if re.search(r'/(?:products?|coffee|coffees|beans)/[^/?#]+', u.path) or re.search(r'/shop/p/[^/?#]+', u.path):
            name = re.sub(r'\s+', ' ', a.text_content()).strip()
            canonical = urllib.parse.urlunsplit((u.scheme, u.netloc, u.path.rstrip('/'), '', ''))
            if not NON_COFFEE.search(name) and canonical not in [x['url'] for x in found]:
                found.append({'url': canonical, 'link_text': name[:200], 'selection_source': 'official_product_link'})
    return found


def inspect_roaster(item, root):
    domain = item['candidate_domain']
    plain_domain = domain.removeprefix('www.')
    AUDIT_HOSTS.allowed = {domain, plain_domain, 'www.'+plain_domain}
    key = re.sub(r'[^a-z0-9]+', '-', domain.lower()).strip('-')
    folder = root / 'sources' / key
    folder.mkdir(parents=True, exist_ok=True)
    requests = []
    result = {**item, 'id': key, 'status': 'discovery_only', 'requests': requests, 'products': [], 'capture_transport': 'managed_https_proxy' if os.environ.get('HTTPS_PROXY') else 'public_dns_checked_urllib'}
    cached = folder / 'discovery.json'
    if cached.exists():
        previous=json.loads(cached.read_text())
        if previous.get('capture_transport'):
            return previous
        (folder/'discovery-direct-dns-failure.json').write_text(cached.read_text())
    try:
        body, final = read_public('https://' + domain + '/', folder, 'home', requests)
        if not body:
            result['status'] = 'homepage_unavailable'
            return result
        result['official_homepage_candidate'] = final
        document, text = clean_document(body)
        (folder / 'home-visible.txt').write_text(text)
        result['home_title'] = ' '.join(document.xpath('//title/text()'))[:250]
        result['location_candidates'] = [text[max(0,m.start()-140):m.end()+140] for m in re.finditer(r'\b(?:'+'|'.join(sorted(USA_STATES))+r')\s+\d{5}(?:-\d{4})?\b', text)][:12]
        city = item.get('directory_location', '').rsplit(',', 1)[0]
        if city and len(city) > 2:
            result['city_mentions'] = [text[max(0,m.start()-100):m.end()+140] for m in list(re.finditer(re.escape(city), text, re.I))[:8]]
        result['roasting_mentions'] = [text[max(0,m.start()-80):m.end()+120] for m in list(re.finditer(r'\b(?:we roast|our roastery|roasted in|roasting in|coffee roasters?|locally roasted|roasting facility)\b',text,re.I))[:8]]
        # Platform detection does not relax the application fetcher. This public
        # catalog is used only to discover distinct current coffee URLs.
        shopify = bool(re.search(r'Shopify\.|cdn/shop/|cdn\.shopify\.com', body))
        result['platform_hint'] = 'shopify' if shopify else 'woocommerce' if re.search(r'woocommerce|wp-content',body,re.I) else 'squarespace' if 'squarespace' in body.lower() else 'other'
        if shopify:
            catalog_url = urllib.parse.urljoin(final, '/products.json?limit=100')
            catalog, _ = read_public(catalog_url, folder, 'catalog', requests)
            if catalog:
                try:
                    products = json.loads(catalog).get('products', [])
                    eligible = [(product_score(p), p) for p in products]
                    eligible = sorted([(score,p) for score,p in eligible if score >= 0], key=lambda row:(-row[0],row[1].get('handle','')))
                    result['eligible_catalog_products'] = len(eligible)
                    for score,p in eligible[:8]:
                        handle = str(p.get('handle') or '')
                        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,160}',handle):
                            continue
                        result['products'].append({'url':urllib.parse.urljoin(final,'/products/'+handle),'title':p['title'],'product_id':p.get('id'),'handle':handle,'description':p.get('body_html') or '', 'selection_source':'official_public_catalog','source_score':score})
                except (ValueError, TypeError, AttributeError):
                    result['catalog_error'] = 'invalid_catalog'
        if len(result['products']) < 3:
            links = visible_product_links(document, final)
            category_links = []
            for a in document.xpath('//a[@href]'):
                url = urllib.parse.urljoin(final, a.get('href'))
                u = urllib.parse.urlsplit(url)
                label = a.text_content().strip()
                if u.netloc != urllib.parse.urlsplit(final).netloc or u.scheme != 'https':
                    continue
                if re.search(r'\b(?:shop coffee|all coffee|all coffees|single origin|coffee beans|buy coffee|our coffees)\b', label, re.I) and url not in category_links:
                    category_links.append(url)
            for i,url in enumerate(category_links[:2]):
                category, category_final = read_public(url,folder,'coffee-list-'+str(i),requests)
                if category:
                    category_doc,_ = clean_document(category)
                    links.extend(visible_product_links(category_doc,category_final))
            urls = {x['url'] for x in result['products']}
            for link in links:
                if link['url'] not in urls:
                    result['products'].append(link);urls.add(link['url'])
                if len(result['products'])>=8:
                    break
        result['status'] = 'needs_manual_roaster_and_product_review' if len(result['products']) >= 3 else 'insufficient_discovered_products'
        return result
    except Exception as exc:
        result['status'] = 'discovery_error'
        result['error'] = type(exc).__name__ + ': ' + str(exc)[:160]
        return result
    finally:
        cached.write_text(json.dumps(result,indent=2,ensure_ascii=False))


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',required=True)
    parser.add_argument('--limit',type=int,default=260)
    parser.add_argument('--offset',type=int,default=0)
    parser.add_argument('--workers',type=int,default=5)
    args=parser.parse_args()
    root=Path(args.root)
    items=json.loads((root/'discovery-order.json').read_text())[args.offset:args.offset+args.limit]
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(6,args.workers)) as pool:
        for result in pool.map(lambda item:inspect_roaster(item,root),items):
            results.append(result)
            print(json.dumps({'id':result['id'],'status':result['status'],'products':len(result['products'])}),flush=True)
    (root/f'discovery-results-{args.offset}.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))


if __name__=='__main__':
    main()
