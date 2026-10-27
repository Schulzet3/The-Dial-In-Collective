#!/usr/bin/env python3
"""Expand source discovery, before any extractor result is examined."""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import re
import sys
import urllib.parse

spec=importlib.util.spec_from_file_location('builder',Path(__file__).with_name('coffee-corpus-build.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
root=Path(sys.argv[1])


def identity(title):
    title=re.sub(r'\b(?:\d+(?:\.\d+)?\s*(?:oz|ounce|ounces|g|grams?|kg|lbs?|pounds?)|whole bean|ground|retail|wholesale)\b',' ',title,flags=re.I)
    return re.sub(r'[^a-z0-9]','',title.lower())


def enrich(d):
    folder=root/'sources'/d['id'];cached=folder/'enriched-discovery.json'
    if cached.exists():return json.loads(cached.read_text())
    domain=urllib.parse.urlsplit(d['official_homepage_candidate']).hostname
    plain=domain.removeprefix('www.');b.AUDIT_HOSTS.allowed={domain,plain,'www.'+plain}
    d['additional_requests']=[]
    # Re-select from the complete cached catalog, deduplicating retail vs
    # wholesale and bag-size listings before fixing three distinct coffees.
    if (folder/'catalog.json').exists():
        try:
            catalog=json.loads((folder/'catalog.json').read_text()).get('products',[])
            scored=sorted([(b.product_score(p),p) for p in catalog if b.product_score(p)>=0],key=lambda x:(-x[0],x[1].get('handle','')))
            products=[];seen=set()
            for score,p in scored:
                title=p.get('title','');key=identity(title)
                if key in seen or not key:continue
                seen.add(key)
                products.append({'url':urllib.parse.urljoin(d['official_homepage_candidate'],'/products/'+p['handle']),'title':title,'product_id':p.get('id'),'handle':p['handle'],'description':p.get('body_html')or'','selection_source':'official_public_catalog','source_score':score})
            d['products']=products[:12]
        except (ValueError,AttributeError,TypeError):pass
    else:
        d['products']=[p for p in d['products'] if not b.NON_COFFEE.search(p.get('title','')+' '+p.get('link_text','')+' '+urllib.parse.unquote(urllib.parse.urlsplit(p['url']).path).replace('-',' '))]
    if d['id']=='sweetbloomcoffee-com':
        target='https://sweetbloomcoffee.com/products/arbey-cordoba-26'
        selected=next((p for p in d['products'] if p['url']==target),None)
        if not selected:
            selected={'url':target,'title':'Arbey Cordoba','selection_source':'owner_reported_regression'}
        d['products']=[selected]+[p for p in d['products'] if p['url']!=target]
    d['location_pages']=[]
    document,text=b.clean_document((folder/'home.html').read_text())
    links=[]
    for a in document.xpath('//a[@href]'):
        label=re.sub(r'\s+',' ',a.text_content()).strip()
        if not re.search(r'\b(?:about|our story|our story|contact|locations?|caf[eé]s?|visit|find us|roastery)\b',label,re.I):continue
        url=urllib.parse.urljoin(d['official_homepage_candidate'],a.get('href'));u=urllib.parse.urlsplit(url)
        if u.scheme!='https' or u.hostname not in b.AUDIT_HOSTS.allowed or u.fragment or url==d['official_homepage_candidate']:continue
        if url not in [x[1] for x in links]:
            rank=0 if re.search(r'contact|locations?|find us|visit',label,re.I) else 1
            links.append((rank,url,label))
    # Homepages without an address need primary location evidence, even when
    # the directory already calls the roaster American.
    if not d.get('location_candidates'):
        for i,(_,url,label) in enumerate(sorted(links)[:2]):
            body,final=b.read_public(url,folder,'location-'+str(i),d['additional_requests'])
            if body:
                _,visible=b.clean_document(body)
                (folder/('location-'+str(i)+'-visible.txt')).write_text(visible)
                state=d.get('directory_location','').split(',')[-1].strip()
                patterns=r'\b(?:'+'|'.join(sorted(b.USA_STATES))+r')\s+\d{5}(?:-\d{4})?\b'
                matches=[visible[max(0,m.start()-100):m.end()+100] for m in re.finditer(patterns,visible)]
                city=d.get('directory_location','').rsplit(',',1)[0]
                if len(city)>2:
                    matches += [visible[max(0,m.start()-80):m.end()+120] for m in list(re.finditer(re.escape(city),visible,re.I))[:4]]
                d['location_pages'].append({'url':final,'label':label,'file':'location-'+str(i)+'-visible.txt','evidence_candidates':matches[:8]})
    d['status']='needs_manual_roaster_and_product_review' if len(d['products'])>=3 else 'insufficient_distinct_coffees'
    cached.write_text(json.dumps(d,indent=2,ensure_ascii=False))
    return d


items=json.loads((root/'roaster-review-candidates.json').read_text())
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    output=[]
    for result in pool.map(enrich,items):
        output.append(result)
        print(json.dumps({'id':result['id'],'status':result['status'],'products':len(result['products']),'location_pages':len(result['location_pages'])}),flush=True)
(root/'enriched-candidates.json').write_text(json.dumps(output,indent=2,ensure_ascii=False))
