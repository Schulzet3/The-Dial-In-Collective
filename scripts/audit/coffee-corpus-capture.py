#!/usr/bin/env python3
"""Freeze independent public source packets; never import the application parser."""
import concurrent.futures
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import urllib.parse

from lxml import html

spec=importlib.util.spec_from_file_location('builder',Path(__file__).with_name('coffee-corpus-build.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
root=Path(sys.argv[1])
manifest=Path(sys.argv[2]) if len(sys.argv)>2 else root/'enriched-candidates.json'


def normalized_text(element):
    return re.sub(r'\s+',' ',element.text_content()).strip()


def product_nodes(value,depth=0):
    if depth>12:return []
    if isinstance(value,list):return [p for v in value[:200] for p in product_nodes(v,depth+1)]
    if not isinstance(value,dict):return []
    types=value.get('@type',[])
    if isinstance(types,str):types=[types]
    result=[value] if any(t in ['Product','ProductGroup'] for t in types) else []
    for key in ['@graph','mainEntity','itemListElement','hasVariant','isVariantOf']:
        if key in value:result.extend(product_nodes(value[key],depth+1))
    return result


def packet_from_html(body):
    d=html.fromstring(body)
    metadata=[{'key':m.get('property') or m.get('name'),'value':m.get('content')} for m in d.xpath('//meta[@content]') if m.get('property') or m.get('name')]
    products=[]
    for script in d.xpath('//script[@type="application/ld+json"]'):
        try:products.extend(product_nodes(json.loads(script.text or '')))
        except (ValueError,TypeError):pass
    for el in d.xpath('//script|//style|//svg|//nav|//footer|//header|//select|//noscript|//template|//iframe|//button|//input'):
        el.drop_tree()
    mains=d.xpath('//main')
    content=mains[0] if len(mains)==1 else d
    blocks=[]
    for el in content.xpath('.//h1|.//h2|.//h3|.//h4|.//h5|.//h6|.//p|.//li|.//dt|.//dd|.//tr|.//figcaption'):
        if el.tag in ['li','p'] and el.xpath('.//p|.//li|.//table'):continue
        if el.tag=='tr':value=' | '.join(normalized_text(c) for c in el.xpath('./th|./td'))
        else:value=normalized_text(el)
        if value:blocks.append({'tag':el.tag,'text':value})
    # Bare metric DIVs are also retained in the full text. Reviewers can read
    # original markup when adjacent labels require structure to interpret.
    visible=re.sub(r'[ \t]+',' ',content.text_content())
    visible='\n'.join(line.strip() for line in visible.splitlines() if line.strip())
    images=[{'alt':img.get('alt',''),'src':img.get('src') or img.get('data-src'),'title':img.get('title')} for img in content.xpath('.//img')]
    return {'metadata':metadata,'structured_products':products,'blocks':blocks,'visible_text':visible,'images':images}


def capture(item,product):
    url=product['url'];u=urllib.parse.urlsplit(url)
    label=(product.get('handle') or u.path.rstrip('/').split('/')[-1])[:80]
    cid=item['id']+'__'+re.sub(r'[^a-zA-Z0-9_-]','-',label)+'-'+hashlib.sha256(url.encode()).hexdigest()[:8]
    folder=root/'cases'/cid;folder.mkdir(parents=True,exist_ok=True)
    cached=folder/'source-packet.json'
    if cached.exists():return {'id':cid,'roaster_id':item['id'],'url':url,'packet':str(cached)}
    plain=u.hostname.removeprefix('www.');b.AUDIT_HOSTS.allowed={u.hostname,plain,'www.'+plain}
    requests=[]
    packet={'id':cid,'roaster_id':item['id'],'roaster_candidate':item['name'],'source_url':url,'discovered_title':product.get('title') or product.get('link_text'),'capture_transport':'managed_https_proxy','not_production_transport_acceptance':True,'requests':requests}
    body,final=b.read_public(url,folder,'page',requests)
    packet['resolved_url']=final
    if body:
        packet['page']=packet_from_html(body)
    # These documented public endpoints require neither merchant credentials
    # nor a member account. Exact returned product identity is reviewed later.
    actual=urllib.parse.urlsplit(final)
    match=re.match(r'^/(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:collections/[^/]+/)?products/([^/]+)/?$',actual.path,re.I)
    endpoint=None
    if match and item.get('platform_hint')=='shopify':
        endpoint=urllib.parse.urljoin(final,'/products/'+match.group(1)+'.js')
    elif item.get('platform_hint')=='woocommerce':
        slug=actual.path.rstrip('/').split('/')[-1]
        endpoint=urllib.parse.urljoin(final,'/wp-json/wc/store/v1/products/'+slug)
    if endpoint:
        payload,_=b.read_public(endpoint,folder,'product-endpoint',requests)
        if payload:
            try:packet['public_product_endpoint']={'url':endpoint,'data':json.loads(payload)}
            except (ValueError,TypeError):packet['public_product_endpoint_error']='not_valid_json'
    cached.write_text(json.dumps(packet,indent=2,ensure_ascii=False))
    text=[f"CASE {cid}",f"ROASTER CANDIDATE: {item['name']}",f"URL: {url}",f"RESOLVED URL: {final}"]
    if body:
        text += ['\nVISIBLE PAGE BLOCKS:']+[x['tag'].upper()+': '+x['text'] for x in packet['page']['blocks']]
        text += ['\nFULL VISIBLE TEXT:',packet['page']['visible_text'],'\nSTRUCTURED PRODUCT DATA:',json.dumps(packet['page']['structured_products'],ensure_ascii=False)]
        text += ['\nIMAGE TEXT:']+[json.dumps(x,ensure_ascii=False) for x in packet['page']['images'] if x['alt'] or x.get('title')]
    if 'public_product_endpoint' in packet:
        data=packet['public_product_endpoint']['data']
        chosen={k:v for k,v in data.items() if k in ['name','title','vendor','slug','handle','permalink','description','body_html','short_description','attributes','tags','options','variants','prices','available','is_in_stock']} if isinstance(data,dict) else data
        text += ['\nEXACT PUBLIC PRODUCT ENDPOINT:',json.dumps(chosen,ensure_ascii=False)]
    (folder/'source-review.txt').write_text('\n'.join(text))
    return {'id':cid,'roaster_id':item['id'],'url':url,'packet':str(cached),'page_available':bool(body),'requests':len(requests)}


def roaster(item):
    products=item.get('products',[])[:3]
    if item.get('selected_urls'):
        known={x['url']:x for x in item.get('products',[])}
        products=[known.get(url,{'url':url}) for url in item['selected_urls']]
    output=[]
    for product in products:output.append(capture(item,product))
    print(json.dumps({'roaster':item['id'],'captured_cases':len(output)}),flush=True)
    return output


items=json.loads(manifest.read_text())
if isinstance(items,dict):items=items['roasters']
items=[item for item in items if item.get('eligible') is not False and len(item.get('products',item.get('selected_urls',[])))>=3]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    batches=list(pool.map(roaster,items))
(root/('capture-index-'+manifest.stem+'.json')).write_text(json.dumps([x for batch in batches for x in batch],indent=2))
