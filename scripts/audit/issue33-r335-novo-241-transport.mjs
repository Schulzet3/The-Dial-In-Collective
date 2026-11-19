#!/usr/bin/env node
// #33 R335 original603 #241: bounded runner-specific Novo Buesaco transport diagnosis.
// No cloud credentials, bypasses, fallback field admission, or production mutations.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeJson,MAX_PRODUCT_RETRY_BYTES,safeCoffeeUrl,isCoffeeSourceAccessChallenge} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const original='https://novocoffee.com/product/buesaco';
export const canonical='https://novocoffee.com/product/buesaco/';
export const storeApi='https://novocoffee.com/wp-json/wc/store/v1/products?slug=buesaco';
const sha256=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function exactNovo241Url(input){
 const u=safeCoffeeUrl(input);
 return Boolean(u&&u.hostname==='novocoffee.com'&&!u.search&&(u.pathname==='/product/buesaco'||u.pathname==='/product/buesaco/'));
}
export function evaluateSelected241(record){
 const f=record?.parsed||{};
 const match=record?.h1?.length===1&&norm(record.h1[0])==='buesaco'&&norm(f.name)==='buesaco';
 const conflicts=record?.conflicts||[];
 // The official product has competing selected hero and labeled harvest sensory lists.
 // Current parser correctly withholds such a field, while other direct fields remain testable.
 const notesReview=conflicts.length===1&&conflicts[0]==='tasting_notes'&&!f.tasting_notes;
 const allowed=conflicts.length===0||notesReview;
 const valid=Boolean(record?.fetched&&record?.html_bytes>0&&/^[0-9a-f]{64}$/.test(record?.html_sha256||'')&&
  exactNovo241Url(record?.source_url)&&match&&record?.parser_ok&&record?.add_coffee_ui&&
  record?.source_review_ui&&allowed);
 return {accepted:valid,classification:valid?(notesReview?'EXACT_SELECTED_SOURCE_TASTING_CONFLICT_REVIEW':'EXACT_SELECTED_SOURCE_VERIFIED'):
   record?.fetched?'SELECTED_SOURCE_UNVERIFIED':'UNAVAILABLE',manual_semantic_certified:false};
}
async function probeHtml(url){
 const result=await fetchPublicCoffeeHtml(url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
 const r={request_url:url,source_url:result.source_url||url,fetched:result.ok===true,
  reason:result.ok?'':result.reason||'source_unavailable'};
 if(!result.ok)return {record:r};
 const html=result.html||'';
 r.html_bytes=Buffer.byteLength(html,'utf8');r.html_sha256=sha256(Buffer.from(html,'utf8'));
 const headings=selectedProductHeadings(productMarkup(html));
 const parser=extractPublicCoffeeFacts(html,{source_url:r.source_url});
 r.h1=headings;r.parser_ok=parser?.ok===true;
 r.parsed=Object.fromEntries(Object.entries(parser?.fields||{}).filter(([k])=>['name','origin','process','variety','elevation_m','tasting_notes','producer','decaffeination_method','roast_level'].includes(k)));
 r.add_coffee_ui=parser?.ok===true&&coffeeUrlPreviewMarkup(parser).includes('coffee-url-preview');
 r.source_review_ui=parser?.ok===true&&coffeeSourceReviewSnapshot({...parser,source_url:r.source_url})?.type==='coffee_source_review';
 r.conflicts=parser?.conflicts||[];
 r.conflicts_count=r.conflicts.length;
 r.conflict_options=parser?.conflict_options||{};
 r.selected_notes_source_facts=(parser?.source_facts||[]).filter(f=>f.field==='tasting_notes').slice(0,12)
  .map(f=>({label:String(f.label||'').slice(0,90),value:String(f.value||'').slice(0,180),
   section:String(f.section||'').slice(0,90),conflicting:f.conflicting===true}));
 r.seo_fallback_fields=parser?.seo_fallback_fields||[];
 r.access_challenge=isCoffeeSourceAccessChallenge(html);
 return {record:r,html};
}
async function probeStore(){
 const r=await fetchPublicCoffeeJson(storeApi);
 const report={url:storeApi,fetched:r.ok===true,reason:r.ok?'':r.reason||'source_unavailable'};
 if(!r.ok)return report;
 report.json_bytes=Buffer.byteLength(r.json||'','utf8');
 report.json_sha256=sha256(Buffer.from(r.json||'','utf8'));
 try{
  const obj=JSON.parse(r.json||'null');
  const rows=Array.isArray(obj)?obj:Array.isArray(obj?.products)?obj.products:[];
  report.exact_slug_count=rows.filter(x=>x?.slug==='buesaco'&&norm(x?.name)==='buesaco').length;
 }catch{report.valid_json=false;return report;}
 report.valid_json=true;return report;
}
export async function diagnose(){
 const frozenPath='docs/audits/issue33-original603-source-level-adjudication-20261029.csv';
 const csvBlob=execFileSync('git',['rev-parse','HEAD:'+frozenPath],{encoding:'utf8'}).trim();
 if(csvBlob!=='3e0d3036ea727de091f304f538c6de2dfcaa10d6')throw Error('frozen603_changed');
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!process.env.DIC_R335_HEAD_SHA||head!==process.env.DIC_R335_HEAD_SHA)throw Error('checkout_head_mismatch');
 if(!process.env.DIC_R335_EVENT_SHA)throw Error('event_sha_unbound');
 const dir=process.env.DIC_R335_DIR||'/tmp/dic33-r335';
 mkdirSync(dir,{recursive:true});
 const originalProbe=await probeHtml(original);
 const slashProbe=await probeHtml(canonical);
 // Official first-party Woo Store endpoint is DIAGNOSTIC ONLY, never field authority.
 const api=await probeStore();
 const best=[originalProbe,slashProbe].find(x=>evaluateSelected241(x.record).accepted);
 const selected=best||null;
 const originalResult=evaluateSelected241(originalProbe.record);
 const slashResult=evaluateSelected241(slashProbe.record);
 const output={source_sha:head,event_sha:process.env.DIC_R335_EVENT_SHA,
  original603_csv_blob:csvBlob,original603_case:241,manual_certified:0,
  production_operations:0,attempts:[originalProbe.record,slashProbe.record],
  store_api_diagnostic_only:api,original_result:originalResult,slash_result:slashResult,
  acceptance:selected?evaluateSelected241(selected.record).classification:'UNAVAILABLE_OR_UNVERIFIED',
  manual_semantic_certified:false,all603_manual_semantic_certified:false,
  no_cache_or_third_party_fallback:true};
 if(selected){
  const bytes=Buffer.from(selected.html,'utf8');
  writeFileSync(join(dir,'case-241-selected-official.html'),bytes);
  output.selected_html_sha256=sha256(bytes);
  output.selected_source_url=selected.record.source_url;
 }
 writeFileSync(join(dir,'r335-buesaco-transport.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R335 NOVO241] '+JSON.stringify(output));
 if(!selected){
  console.error('[DIC33 R335] REQUIRED ORIGINAL SOURCE/IDENTITY/PARSER/UI UNVERIFIED; runner diagnostic not acceptance PASS');
  process.exitCode=1;
 }
 return output;
}
if(process.env.DIC_R335_RUN==='1')await diagnose();
