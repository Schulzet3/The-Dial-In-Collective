#!/usr/bin/env node
// Issue33 R320: Buesaco runner origin access diagnosis only, NOT source acceptance.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeJson,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
import {source241} from './issue33-r171-241-check.mjs';
export const routes=[
 {name:'original',url:'https://novocoffee.com/product/buesaco'},
 {name:'canonical-slash',url:'https://novocoffee.com/product/buesaco/'},
 {name:'first-party-store-api',url:'https://novocoffee.com/wp-json/wc/store/v1/products?slug=buesaco'}
];
const hash=b=>createHash('sha256').update(b).digest('hex');
export const ownWooIdentity=items=>Array.isArray(items)&&
 items.filter(x=>x?.slug==='buesaco'&&String(x?.name||'').toLowerCase()==='buesaco'&&Number.isSafeInteger(x?.id)&&x.id>0).length===1 &&
 items.filter(x=>x?.slug==='buesaco').length===1;
export function selectedBuesacoEvidence(html,url=routes[0].url){
 const s=productMarkup(html),heads=selectedProductHeadings(s),
  parsed=extractPublicCoffeeFacts(html,{source_url:url}),facts=parsed?.fields||{},
  own=parsed?.ok===true&&heads.length===1&&identicalCurrentSelectedTitle('Buesaco',heads[0],facts.name);
 let preview=false,review=false;
 if(own){
  try{preview=/coffee-url-preview/.test(coffeeUrlPreviewMarkup(parsed));}catch{}
  try{review=coffeeSourceReviewSnapshot({...parsed,source_url:url})?.type==='coffee_source_review';}catch{}
 }
 const src=source241(html);
 const conflicting=(parsed?.conflicts||[]).some(c=>(typeof c==='string'?c:c?.field||c?.key)==='tasting_notes');
 return {selected_h1:heads,parser_ok:parsed?.ok===true,selected_identity:own,
  preview,source_review:review,distinct_selected_flavor_lists:src.distinct_selected_lists,
  conflict_preserved:conflicting&&!facts.tasting_notes,
  direct_selected:src.direct,product_fields:own?facts:null,
  verified_selected_pipeline:own&&preview&&review&&(!src.distinct_selected_lists||(conflicting&&!facts.tasting_notes))};
}
if(process.env.DIC_R320_RUN==='1'){
 const dir=process.env.DIC_R320_DIR||'/tmp/dic33-r320';
 mkdirSync(dir,{recursive:true});
 const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!process.env.DIC_R320_EXPECTED_SHA||checkout!==process.env.DIC_R320_EXPECTED_SHA)throw Error('exact_checkout_sha_mismatch');
 const readings=[],defects=[];
 for(const route of routes){
  const kind=route.name==='first-party-store-api'?'json':'html';
  const response=kind==='json'?await fetchPublicCoffeeJson(route.url):
   await fetchPublicCoffeeHtml(route.url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
  const r={route:route.name,requested_url:route.url,final_url:response?.source_url||null,
   transport_ok:response?.ok===true,unavailable_reason:response?.ok?null:response?.reason||'unavailable',
   selected_official_product_accepted:false};
  if(response?.ok){
   const finalHost=new URL(response.source_url||route.url).hostname;
   r.same_official_host=finalHost==='novocoffee.com';
   const bytes=Buffer.from(String(kind==='json'?response.json:response.html),'utf8');
   r.bytes=bytes.length;r.sha256=hash(bytes);
   if(r.same_official_host){
    r.raw_artifact='case-'+route.name+(kind==='json'?'.json':'.html');
    writeFileSync(join(dir,r.raw_artifact),bytes);
    if(kind==='json'){
     let items;try{items=JSON.parse(bytes.toString());}catch{}
     r.first_party_identity=ownWooIdentity(items);
     r.product_json_secondary_only=true;
    }else{
     r.source=selectedBuesacoEvidence(bytes.toString(),r.final_url||route.url);
     r.selected_official_product_accepted=r.source.verified_selected_pipeline;
     if(r.source.selected_h1.some(h=>String(h).trim().toLowerCase()==='buesaco')&&!r.selected_official_product_accepted)
      defects.push(route.name+'_real_selected_h1_parser_ui_or_sensory_conflict_gap');
    }
   }
  }
  readings.push(r);
 }
 const originalFetched=readings.filter(r=>r.selected_official_product_accepted);
 const diagnosis={purpose:'DIAGNOSIS_ONLY_NOT_ORIGINAL603_ACCEPTANCE',
  checkout_sha:checkout,event_sha:process.env.DIC_R320_EVENT_SHA||null,
  original603_case:241,original_official_url:routes[0].url,
  attempts:3,source_accessible:originalFetched.length>0,
  source_unavailable_or_unverified:originalFetched.length===0,
  manual_semantic_certification:false,production_operations:0,
  frozen_corpus_changed:false,defects,readings};
 writeFileSync(join(dir,'diagnostic.json'),JSON.stringify(diagnosis,null,2)+'\n');
 console.log('[DIC33 R320 DIAGNOSIS ONLY] '+JSON.stringify(diagnosis));
 if(defects.length)process.exitCode=1;
}
