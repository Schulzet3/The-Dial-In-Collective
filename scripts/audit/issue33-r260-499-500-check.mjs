#!/usr/bin/env node
// R260 actual current exact IXXA selected official source afterproof; no fabricated lot evidence.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ownText=html=>fold(String(html||'').replace(/<!--[^]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[^]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/g,' '));
export const entries=Object.freeze([
 {number:499,name:'Alux',url:'https://www.ixxacoffee.com/products/alux',witness:['ALUX','medium dark roast blend','Guatemalan','Mexican','Colombian','Berries','Bakers Chocolate','Almonds']},
 {number:500,name:'Kaan',url:'https://www.ixxacoffee.com/products/kaan',witness:['Mexican and Guatemalan dark roast blend','Caramel','Dark Chocolate','Roasted Almonds']}
]);
export function selectedEvidence(n,markup,heads){
 const entry=entries.find(x=>x.number===n),text=ownText(markup);
 return {identity:Array.isArray(heads)&&heads.length===1&&fold(heads[0])===fold(entry.name),
  direct:entry.witness.every(x=>text.includes(fold(x)))};
}
export function selectedFields(n,f){
 const entry=entries.find(x=>x.number===n),origin=fold(f.origin),notes=fold(f.tasting_notes);
 const noUnsupported=!f.producer&&!f.process&&!f.elevation_m&&!f.variety&&!f.decaffeination_method&&!f.release_label;
 const shared={name:fold(f.name)===fold(entry.name),roaster:/ixxa/i.test(f.roaster||''),
  no_unsupported_fields:noUnsupported,no_unrelated_origin:!/italy|brazil|kenya|ethiopia|colombia\b.*brazil/i.test(f.origin||'')};
 if(n===499)return {...shared,roast:f.roast_level==='Medium-Dark',
  origin:['guatemala','mexico','colombia'].every(x=>origin.includes(x)),
  notes:['berries','bakers chocolate','almonds'].every(x=>notes.includes(x))};
 return {...shared,roast:f.roast_level==='Dark',
  origin:['mexico','guatemala'].every(x=>origin.includes(x))&&!origin.includes('colombia'),
  notes:['caramel','dark chocolate','roasted almonds'].every(x=>notes.includes(x))};
}
if(process.env.DIC_R260_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch{}
 check(JSON.stringify(report?.case_numbers)==='[499,500]'&&report?.records?.length===2,'two_exact_original603_rows');
 check(report?.source_sha===process.env.DIC_R260_EVENT_SHA,'event_sha');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R260_CHECKOUT_SHA,'exact_checkout');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unmodified_original603_csv');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_false_certification');
 const items=[];
 for(const e of entries){
  const r=report?.records?.find(x=>x.number===e.number)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+e.number+'.html'));}catch{}
  const own=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(own),selected=selectedEvidence(e.number,own,heads);
  let final;try{final=new URL(r.final_url);}catch{}
  const expected=new URL(e.url);
  check(r.archived_coffee===e.name&&r.official_url===e.url,e.number+'_immutable_identity_url');
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,e.number+'_fresh_original_identity_parser');
  check(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),e.number+'_raw_html_sha256_bytes');
  check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,e.number+'_same_selected_product_handle');
  check(selected.identity&&selected.direct,e.number+'_same_current_direct_selected_product');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,e.number+'_explicit_add_coffee_and_source_review');
  const fchecks=selectedFields(e.number,f);
  for(const [field,ok] of Object.entries(fchecks))check(ok,e.number+'_'+field);
  check((r.conflicts||[]).length===0,e.number+'_canonical_no_conflicts');
  items.push({number:e.number,url:r.final_url,status:r.status,selected,headings:heads,fields:f,checks:fchecks,raw_sha256:raw?hash(raw):null,html_bytes:raw?.length||0,conflicts:r.conflicts||[]});
 }
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R260_CHECKOUT_SHA,report_sha256:bytes?hash(bytes):null,items,errors,
  passed:errors.length===0,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r260-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R260 IXXA ORIGINAL499/500] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
