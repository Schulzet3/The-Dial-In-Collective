#!/usr/bin/env python3
"""Keyless, local OCR triage of captured selected-product galleries.

This is independent audit evidence, not the production extractor or a factual
oracle. OCR text requires human confirmation. No account, paid API, or model
service is used. It never changes application data or original source packets.
"""
import concurrent.futures
import hashlib
import io
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from PIL import Image

ROOT=Path(sys.argv[1]);OUT=ROOT/'image-audit';OUT.mkdir(exist_ok=True)
RETRY_FAILURES='--retry-failures' in sys.argv
MAX_BYTES=8_000_000 if RETRY_FAILURES else 4_000_000
OCR_TIMEOUT=45 if RETRY_FAILURES else 16
MAX_PIXELS=25_000_000;Image.MAX_IMAGE_PIXELS=MAX_PIXELS
manifest=json.loads((ROOT/'manifest.json').read_text())
selected={u for row in manifest['roasters'] for u in row['selected_urls']}
lock=threading.Lock();semaphores={}

def target(raw):
 if isinstance(raw,dict):raw=raw.get('src') or raw.get('url') or raw.get('contentUrl')
 if not isinstance(raw,str):return None
 if raw.startswith('//'):raw='https:'+raw
 try:
  u=urllib.parse.urlsplit(raw)
  if u.scheme!='https' or not u.hostname or u.username or u.password or u.port is not None or len(raw)>3000:return None
 except ValueError:
  return None
 if '.' not in u.hostname or re.search(r'\.(?:local|localhost|internal|invalid|test)$',u.hostname,re.I):return None
 try:ipaddress.ip_address(u.hostname);return None
 except ValueError:pass
 return urllib.parse.urlunsplit((u.scheme,u.netloc,urllib.parse.quote(u.path,safe='/%:@-._~!$&\'()*+,;='),urllib.parse.quote(u.query,safe='=&%/:?@-._~!$\'()*+,;'),''))

class Redirect(urllib.request.HTTPRedirectHandler):
 max_redirections=2
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if not target(newurl) or urllib.parse.urlsplit(req.full_url).hostname!=urllib.parse.urlsplit(newurl).hostname:
   raise ValueError('unreviewed_image_redirect')
  return super().redirect_request(req,fp,code,msg,headers,newurl)

tasks={};cases=[]
for file in (ROOT/'cases').glob('*/source-packet.json'):
 packet=json.loads(file.read_text())
 if packet['source_url'] not in selected:continue
 endpoint=packet.get('public_product_endpoint',{}).get('data',{})
 images=endpoint.get('images',[])
 source='exact_product_endpoint_gallery'
 if not images:
  images=[];source='structured_product_images'
  for product in packet.get('page',{}).get('structured_products',[]):
   value=product.get('image',[])
   images.extend(value if isinstance(value,list) else [value])
  if not images:
   images=[m['value'] for m in packet.get('page',{}).get('metadata',[]) if m['key']=='og:image'];source='product_og_image'
 urls=list(dict.fromkeys(url for x in images if (url:=target(x))))
 if not urls and images:
  # Some Product schemas declare obsolete HTTP CDN URLs while their exact
  # gallery image is already present over HTTPS in HTML. Match the filename,
  # not arbitrary site images or an invented secure-URL substitution.
  def basename(value):
   if isinstance(value,dict):value=value.get('src') or value.get('url') or value.get('contentUrl')
   return urllib.parse.unquote(urllib.parse.urlsplit(value or '').path.split('/')[-1]).casefold()
  names={basename(x) for x in images if basename(x)}
  urls=list(dict.fromkeys(url for img in packet.get('page',{}).get('images',[]) if basename(img.get('src')) in names and (url:=target(img.get('src')))))
  if urls:source='html_https_image_matching_structured_product_filename'
 case={'case_id':packet['id'],'source_url':packet['source_url'],'gallery_source':source,'image_urls':urls,'gallery_truncated':len(urls)>24}
 cases.append(case)
 for url in urls[:24]:
  image_id=hashlib.sha256(url.encode()).hexdigest()
  task=tasks.setdefault(url,{'image_id':image_id,'url':url,'case_ids':[]})
  task['case_ids'].append(packet['id'])

(OUT/'selection.json').write_text(json.dumps({'cases':cases,'images':list(tasks.values()),'not_ground_truth':True},indent=2))

def run(task):
 folder=OUT/task['image_id'];folder.mkdir(exist_ok=True)
 cache=folder/'ocr.json'
 cached=json.loads(cache.read_text()) if cache.exists() else None
 cached_bytes=None
 if cached:
  # Version-one preprocessing discarded alpha, hiding black label text on
  # transparent backgrounds. Repair only affected saved originals locally;
  # do not re-download source images or erase the earlier audit receipt.
  missing_original=not (folder/'original-image').exists()
  if missing_original and '--restore-originals' not in sys.argv:return cached
  if not missing_original:
   retry=RETRY_FAILURES and cached.get('status')!='ocr_completed'
   if cached.get('image_preprocessing_version')==2 and not retry:return cached
   with Image.open(folder/'original-image') as original:
    transparent=('A' in original.getbands() or 'transparency' in original.info) and original.convert('RGBA').getchannel('A').getextrema()[0]<255
   if not transparent and not retry:return cached
   cached_bytes=(folder/'original-image').read_bytes()
   if hashlib.sha256(cached_bytes).hexdigest()!=cached.get('source_sha256'):raise ValueError('cached_original_hash_mismatch')
  previous=folder/('ocr-before-bounded-retry.json' if RETRY_FAILURES else 'ocr-before-original-recovery.json' if missing_original else 'ocr-before-alpha-repair.json')
  if not previous.exists():previous.write_text(json.dumps(cached,indent=2,ensure_ascii=False))
 started=time.monotonic();record={**task,'not_ground_truth':True,'method':'local_tesseract_english','status':'started'}
 host=urllib.parse.urlsplit(task['url']).hostname
 with lock:sem=semaphores.setdefault(host,threading.BoundedSemaphore(2))
 try:
  with sem:
   if cached_bytes is not None:
    data=cached_bytes
    for key in ['http_status','bytes','content_type','resolved_url']:record[key]=cached.get(key)
    record['repair']='local_alpha_composite_from_hash_verified_original'
   else:
    opener=urllib.request.build_opener(Redirect())
    with opener.open(urllib.request.Request(task['url'],headers={'User-Agent':'DialInCollective-CoffeeSourceAudit/1.0','Accept':'image/avif,image/webp,image/png,image/jpeg;q=0.9'}),timeout=15) as response:
     data=response.read(MAX_BYTES+1);record.update(http_status=response.status,bytes=len(data),content_type=response.headers.get('Content-Type',''),resolved_url=response.url)
   if len(data)>MAX_BYTES:raise ValueError('image_byte_limit')
   with Image.open(io.BytesIO(data)) as im:
    record['dimensions']=[im.width,im.height]
    if im.width*im.height>MAX_PIXELS:raise ValueError('image_pixel_limit')
    im.load()
    if 'A' in im.getbands() or 'transparency' in im.info:
     rgba=im.convert('RGBA');im=Image.alpha_composite(Image.new('RGBA',rgba.size,'white'),rgba)
    im=im.convert('RGB');im.thumbnail((1800,1800));im.save(folder/'ocr-input.png')
    record['image_preprocessing_version']=2
    record['ocr_input_sha256']=hashlib.sha256((folder/'ocr-input.png').read_bytes()).hexdigest()
   record['source_sha256']=hashlib.sha256(data).hexdigest()
   if cached and cached.get('source_sha256'):
    record['matches_previous_original']=record['source_sha256']==cached['source_sha256']
   (folder/'original-image').write_bytes(data)
  result=subprocess.run(['tesseract',str(folder/'ocr-input.png'),'stdout','--psm','11','tsv'],capture_output=True,timeout=OCR_TIMEOUT,env={**os.environ,'OMP_THREAD_LIMIT':'1'})
  if result.returncode:raise ValueError('tesseract_failed')
  tsv=result.stdout.decode('utf-8',errors='replace');(folder/'ocr.tsv').write_text(tsv)
  words=[];scores=[]
  for line in tsv.splitlines()[1:]:
   cells=line.split('\t')
   if len(cells)>=12 and cells[11].strip():
    words.append(cells[11]);scores.append(float(cells[10]))
  text=' '.join(words);(folder/'ocr.txt').write_text(text)
  record.update(status='ocr_completed',text=text,word_count=len(words),mean_word_confidence=round(sum(scores)/len(scores),1) if scores else None,
    coffee_fact_labels_found=sorted(set(re.findall(r'\b(?:variety|varietal|cultivar|process|washed|natural|honey|origin|elevation|altitude|masl|producer|farm|harvest|notes|roast)\b',text,re.I))))
 except Exception as exc:record.update(status='unreviewed',error=type(exc).__name__+': '+str(exc)[:160])
 record['elapsed_ms']=round((time.monotonic()-started)*1000);cache.write_text(json.dumps(record,indent=2,ensure_ascii=False))
 print(json.dumps({'image_id':record['image_id'],'status':record['status'],'words':record.get('word_count',0)}),flush=True)
 return record

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:results=list(executor.map(run,tasks.values()))
(OUT/'results.json').write_text(json.dumps({'not_ground_truth':True,'image_count':len(results),'cases':cases,'results':results},indent=2,ensure_ascii=False))
print(json.dumps({'complete':True,'images':len(results),'ocr_completed':sum(x['status']=='ocr_completed' for x in results),'cases':len(cases)}),flush=True)
