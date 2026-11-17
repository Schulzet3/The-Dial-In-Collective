#!/usr/bin/env node
// R261 exact selected original603 #501 IXXA official-source afterproof; never infer roast from taxonomy or navigation.
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
export const entry=Object.freeze({number:501,name:'Organic Ki-Saya - Tenejapa Microlot',
 url:'https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot',
 witness:['Ki-Saya','Chiapas','Tenejapa','Chocolate','creamy caramel','honey','hazelnut']});
export function selectedEvidence(markup,heads){
 const text=ownText(markup);
 return {identity:Array.isArray(heads)&&heads.length===1&&fold(heads[0])===fold(entry.name),
  direct:entry.witness.every(x=>text.includes(fold(x)))};
}
export function selectedFields(f){
 const notes=fold(f?.tasting_notes),origin=fold(f?.origin),name=fold(f?.name);
 return {selected_name:name===fold(entry.name),
  roaster:/ixxa/i.test(f?.roaster||''),selected_origin:/tenejapa|chiapas/.test(origin)&&!/kenya|peru|guatemala|colombia|brazil/.test(origin),
  literal_notes:['chocolate','creamy caramel','honey','hazelnut'].every(x=>notes.includes(fold(x))),
  no_unsupported_roast:!f?.roast_level, no_unsupported_elevation:!f?.elevation_m,
  no_unsupported_process:!f?.process,no_unsupported_producer:!f?.producer,
  no_unsupported_variety:!f?.variety,no_unsupported_decaf:!f?.decaffeination_method,
  no_unsupported_release:!f?.release_label};
}
if(process.env.DIC_R261_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[501]'&&report?.records?.length===1,'exact_original501_only');
 check(report?.source_sha===process.env.DIC_R261_EVENT_SHA,'event_sha');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R261_CHECKOUT_SHA,'checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_intact');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'scope_and_no_false_certification');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-501.html'))}catch{}
 const own=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(own),selected=selectedEvidence(own,heads);
 let final;try{final=new URL(r.final_url)}catch{}
 const expected=new URL(entry.url);
 check(r.number===501&&r.archived_coffee===entry.name&&r.official_url===entry.url,'original_identity_and_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'actual_current_source_and_parser');
 check(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'actual_raw_hash_and_bytes');
 check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'exact_selected_handle_no_redirect');
 check(selected.identity&&selected.direct,'one_exact_selected_product_and_literal_notes');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_preview_and_source_review');
 const fields=selectedFields(f);
 for(const [field,ok] of Object.entries(fields))check(ok,field);
 check((r.conflicts||[]).length===0,'no_unresolved_canonical_conflicts');
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R261_CHECKOUT_SHA,
  report_sha256:bytes?hash(bytes):null,selected,heads,fields,raw_sha256:raw?hash(raw):null,
  html_bytes:raw?.length||0,current_fields:f,conflicts:r.conflicts||[],
  errors,passed:errors.length===0,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r261-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R261 selected501] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}