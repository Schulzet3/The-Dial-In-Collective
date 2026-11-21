#!/usr/bin/env node
// #33 original603 #241: bounded runner-only transport diagnostic, not certification.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeJson,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const ORIGINAL='https://novocoffee.com/product/buesaco';
export const CANONICAL=ORIGINAL+'/';
export const STORE='https://novocoffee.com/wp-json/wc/store/v1/products?slug=buesaco';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sha=s=>createHash('sha256').update(s).digest('hex');
export function exactStoreIdentity(body){
 let a;try{a=typeof body==='string'?JSON.parse(body):body}catch{return false}
 if(!Array.isArray(a)||a.length!==1)return false;
 const p=a[0];if(p?.slug!=='buesaco'||norm(p.name)!=='buesaco')return false;
 try{const u=new URL(p.permalink);return u.protocol==='https:'&&u.hostname==='novocoffee.com'&&
  /^\/product\/buesaco\/?$/.test(u.pathname)&&!u.search&&!u.hash&&!u.username&&!u.password}catch{return false}
}
export function classification(a,b,s){
 if(a.selected_html_parser_ui||b.selected_html_parser_ui)return 'HTML_REACHABLE_STRICT_241_AFTERPROOF_REQUIRED';
 if(a.reason==='source_access_challenge'&&b.reason==='source_access_challenge')return 'BOTH_HTML_URLS_CHALLENGED';
 if(a.ok||b.ok)return 'HTML_READABLE_BUT_IDENTITY_UNVERIFIED';
 return s.exact_store_identity?'STORE_ONLY_HTML_UNAVAILABLE':'OFFICIAL_HTML_UNAVAILABLE';
}
export async function diagnose({htmlFetch=fetchPublicCoffeeHtml,jsonFetch=fetchPublicCoffeeJson}={}){
 const parts=[];
 for(const [kind,url] of [['original',ORIGINAL],['canonical',CANONICAL]]){
  let r;try{r=await htmlFetch(url,{maxBytes:MAX_PRODUCT_RETRY_BYTES})}catch{r={ok:false,reason:'source_fetch_failed'}}
  const body=r?.ok&&typeof r.html==='string'?r.html:null;
  const row={kind,url,ok:r?.ok===true,reason:r?.ok?null:String(r?.reason||'source_unavailable').slice(0,100),
   source_url:r?.source_url||null,bytes:body?Buffer.byteLength(body):0,sha256:body?sha(body):null,
   selected_html_parser_ui:false};
  if(body){
   const h=selectedProductHeadings(productMarkup(body));
   row.h1=h.map(v=>String(v).slice(0,120));
   row.exact_selected_heading=h.length===1&&norm(h[0])==='buesaco';
   if(row.exact_selected_heading){
    try{const p=extractPublicCoffeeFacts(body,{source_url:r.source_url||url});
     row.selected_html_parser_ui=p?.ok===true&&coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
      coffeeSourceReviewSnapshot({...p,source_url:r.source_url||url})?.type==='coffee_source_review';
    }catch{row.selected_html_parser_ui=false}
   }
  }
  parts.push(row);
 }
 let j;try{j=await jsonFetch(STORE)}catch{j={ok:false,reason:'source_fetch_failed'}}
 const body=j?.ok&&typeof j.json==='string'?j.json:null;
 const store={url:STORE,ok:j?.ok===true,reason:j?.ok?null:String(j?.reason||'source_unavailable').slice(0,100),
  bytes:body?Buffer.byteLength(body):0,sha256:body?sha(body):null,exact_store_identity:Boolean(body&&exactStoreIdentity(body))};
 return {kind:'ORIGINAL241_TRANSPORT_DIAGNOSIS_ONLY',original:parts[0],canonical:parts[1],store,
  verdict:classification(parts[0],parts[1],store),hard_original241_source_acceptance:'NOT_RUN',
  manual_certification:false,source_fields_promoted:false,member_save:false,production_writes:0};
}
if(process.env.DIC_R369_RUN==='1'){
 const dir=process.env.DIC_R369_DIR||'/tmp/dic33-r369';mkdirSync(dir,{recursive:true});
 const r=await diagnose();
 r.checkout_sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 r.event_sha=process.env.GITHUB_SHA||null;
 r.source_matches=r.checkout_sha===process.env.DIC_R369_HEAD&&r.event_sha===process.env.DIC_R369_EVENT;
 writeFileSync(join(dir,'diagnosis.json'),JSON.stringify(r,null,2)+'\n');
 console.log('[DIC33 R369 DIAGNOSIS IS NOT ORIGINAL241 SOURCE PASS] '+JSON.stringify(r));
 if(!r.source_matches)process.exitCode=1;
}
