#!/usr/bin/env node
// R262 exact current original603 #503: validate selected Guji, not arbitrary site copy.
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
export const entry=Object.freeze({number:503,name:'Ethiopia - Natural Guji',
 url:'https://www.kamiakcoffeeco.com/products/ethiopia-guji',
 witness:['blackberry','vanilla bean','botanical','Guracho','Typica','1900','2100']});
export function selectedEvidence(markup,heads){
 const t=ownText(markup);
 return {identity:Array.isArray(heads)&&heads.length===1&&fold(heads[0])===fold(entry.name),
  direct:entry.witness.every(x=>t.includes(fold(x)))};
}
export function selectedFields(f){
 const origin=fold(f?.origin),notes=fold(f?.tasting_notes),roast=fold(f?.roast_level);
 return {selected_name:fold(f?.name)===fold(entry.name),
  correct_roaster:/kamiak/i.test(f?.roaster||''),
  direct_origin:origin.includes('ethiopia')&&origin.includes('guji')&&!origin.includes('kenya'),
  direct_roast:roast.includes('medium light'),
  direct_process:fold(f?.process)==='natural',
  direct_variety:fold(f?.variety).includes('typica'),
  direct_elevation:/1900/.test(f?.elevation_m||'')&&/2100/.test(f?.elevation_m||''),
  direct_smallholders:/guracho/i.test(f?.producer||''),
  direct_notes:['blackberry','vanilla bean','botanical'].every(x=>notes.includes(x)),
  no_unpublished_decaf:!f?.decaffeination_method,
  no_unpublished_release:!f?.release_label};
}
if(process.env.DIC_R262_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[503]'&&report?.records?.length===1,'exact_original503_only');
 check(report?.source_sha===process.env.DIC_R262_EVENT_SHA,'event_sha');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R262_CHECKOUT_SHA,'checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_intact');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'scope');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-503.html'))}catch{}
 const markup=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(markup),selected=selectedEvidence(markup,heads);
 let final;try{final=new URL(r.final_url)}catch{}
 const expected=new URL(entry.url);
 check(r.number===503&&r.archived_coffee===entry.name&&r.official_url===entry.url,'original_identity_url');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_current_source_parser');
 check(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_source_bytes_hash');
 check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'exact_product_handle');
 check(selected.identity&&selected.direct,'exact_selected_heading_and_own_witness');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 const fields=selectedFields(f);for(const [key,ok] of Object.entries(fields))check(ok,key);
 check((r.conflicts||[]).length===0,'canonical_conflicts');
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R262_CHECKOUT_SHA,
  report_sha256:bytes?hash(bytes):null,selected,heads,fields,raw_sha256:raw?hash(raw):null,
  html_bytes:raw?.length||0,current_fields:f,conflicts:r.conflicts||[],
  errors,passed:errors.length===0,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r262-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R262 selected503] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
