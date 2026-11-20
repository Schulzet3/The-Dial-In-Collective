#!/usr/bin/env node
// Issue #33 R350: bounded, credential-free original #241 transport diagnosis.
// Store API is auxiliary first-party diagnostics, NEVER a substitute for exact selected HTML.
import https from 'node:https';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {safeCoffeeUrl,guardedLookup,fetchPublicCoffeeHtml,MAX_HTML_BYTES,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {source241} from './issue33-r171-241-check.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const ORIGINAL='https://novocoffee.com/product/buesaco';
export const CANONICAL='https://novocoffee.com/product/buesaco/';
export const STORE='https://novocoffee.com/wp-json/wc/store/v1/products?slug=buesaco';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function classify241Transport({original={},canonical={}}={}){
 const match=x=>x.ok===true&&x.selected_identity===true&&x.parser_ok===true&&
  x.add_coffee_rendered===true&&x.source_review_rendered===true&&
  x.selected_sensory_verified===true&&
  /^[0-9a-f]{64}$/.test(x.html_sha256||'')&&Number(x.html_bytes)>0;
 return match(original)||match(canonical)?'CURRENT_SELECTED_PRIMARY_HTML_AND_PARSER_OBSERVED':'UNAVAILABLE_NO_PRIMARY_PROOF';
}
async function headRedirect(){
 const u=safeCoffeeUrl(ORIGINAL);
 if(!u)return {ok:false,reason:'invalid_url'};
 return new Promise(resolve=>{
  let done=false,req;
  const end=x=>{if(!done){done=true;clearTimeout(timer);resolve(x)}};
  const timer=setTimeout(()=>{req?.destroy();end({ok:false,reason:'timeout'})},7000);
  try{
   req=https.request({protocol:'https:',hostname:u.hostname,servername:u.hostname,port:443,
    path:u.pathname+u.search,method:'HEAD',lookup:guardedLookup(),family:4,
    agent:false,rejectUnauthorized:true,timeout:6500,maxHeaderSize:32000,
    headers:{'User-Agent':'DialInCollective-CoffeePreview/1.0',Accept:'text/html',Connection:'close'}},res=>{
      const location=typeof res.headers.location==='string'?new URL(res.headers.location,u).toString():null;
      res.resume();
      end({ok:true,status:res.statusCode||0,redirect_to_canonical:location===CANONICAL,
        same_origin_redirect:!!location&&safeCoffeeUrl(location)?.hostname===u.hostname});
    });
   req.on('error',()=>end({ok:false,reason:'head_transport_failed'}));
   req.on('timeout',()=>{req.destroy();end({ok:false,reason:'head_timeout'})});
   req.end();
  }catch{end({ok:false,reason:'head_transport_failed'})}
 });
}
async function htmlProbe(url,label,dir){
 // Suppress automatic redirects: original GET, canonical GET and first-party Store GET
 // each consume exactly ONE bounded network request. No challenge bypass.
 const r=await fetchPublicCoffeeHtml(url,{maxBytes:MAX_PRODUCT_RETRY_BYTES},0);
 if(!r?.ok)return {ok:false,reason:r?.reason||'source_unavailable'};
 const html=r.html||'',source=r.source_url||url;
 const selected=selectedProductHeadings(productMarkup(html));
 const identity=selected.length===1&&norm(selected[0])==='buesaco';
 const seller=identity?source241(html):null;
 let parser,preview=false,review=false;
 if(identity){
  try{
   parser=extractPublicCoffeeFacts(html,{source_url:source});
   if(parser?.ok===true){
    const result={...parser,source_url:source,ok:true};
    preview=!!coffeeUrlPreviewMarkup(result);
    review=!!coffeeSourceReviewSnapshot(result);
   }
  }catch{parser={ok:false,reason:'parser_or_review_exception'}}
 }
 const conflict=(parser?.conflicts||[]).some(x=>(typeof x==='string'?x:(x?.field||x?.key))==='tasting_notes');
 const sensory=!!seller?.identity&&!!seller?.distinct_selected_lists&&
   Object.values(seller.direct||{}).every(Boolean)&&conflict&&
   !parser?.fields?.tasting_notes&&!parser?.fields?.espresso_recipe&&
   norm(parser?.fields?.process)==='washed';
 const summary={ok:true,source_url:source,html_bytes:Buffer.byteLength(html,'utf8'),
  html_sha256:hash(html),selected_h1:selected.slice(0,2),selected_identity:identity,
  parser_ok:parser?.ok===true,parser_reason:parser?.reason||null,
  add_coffee_rendered:preview,source_review_rendered:review,
  selected_sensory_verified:sensory,selected_conflicts:identity?parser?.conflicts||[]:[],
  canonical_fields:identity&&parser?.ok===true?parser.fields||{}:{}};
 if(identity)writeFileSync(join(dir,label+'.html'),html,'utf8');
 return summary;
}
async function storeProbe(){
 // One JSON GET, no redirect following and no use as selected HTML.
 const r=await fetchPublicCoffeeHtml(STORE,{maxBytes:MAX_HTML_BYTES,responseType:'json'},0);
 if(!r?.ok)return {ok:false,reason:r?.reason||'store_unavailable'};
 try{
  const j=JSON.parse(r.json||'null'),items=Array.isArray(j)?j:[];
  return {ok:true,body_sha256:hash(r.json||''),product_count:items.length,
   exact_buesaco_count:items.filter(x=>norm(x?.name)==='buesaco').length,
   auxiliary_not_selected_html:true};
 }catch{return {ok:false,reason:'store_invalid_json'}}
}
if(process.env.DIC_ISSUE33_R350_RUN==='1'){
 const run=async()=>{
  const dir=resolve(process.env.DIC_ISSUE33_R350_DIR||'/tmp/dic33-r350');
  mkdirSync(dir,{recursive:true});
  const head=await headRedirect();
  // At most one guarded GET per pinned URL and one first-party Store API GET.
  const original=await htmlProbe(ORIGINAL,'original-241',dir);
  const canonical=await htmlProbe(CANONICAL,'canonical-241',dir);
  const store=await storeProbe();
  const classification=classify241Transport({original,canonical});
  const evidence={source_sha:process.env.GITHUB_SHA||null,original_url:ORIGINAL,
   canonical_url:CANONICAL,store_url:STORE,head,original,canonical,store,
   classification,live_primary_verified:classification==='CURRENT_SELECTED_PRIMARY_HTML_AND_PARSER_OBSERVED',
   manual_603_certified:false,provider_writes:0};
  writeFileSync(join(dir,'transport-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('[DIC33 R350 official runner transport] '+JSON.stringify({
   source_sha:evidence.source_sha,head,original:{...original,canonical_fields:undefined},
   canonical:{...canonical,canonical_fields:undefined},store,classification}));
  if(!evidence.live_primary_verified)process.exitCode=1;
 };
 run().catch(e=>{console.error('[DIC33 R350] FAILED '+String(e?.code||e?.name||'probe_exception'));process.exitCode=1});
}
