#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=x=>String(x||'').replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases={
 415:{name:'El Salvador#',url:'https://woodwarblercoffee.com/products/el-salvador-smbc-rfa',proof:['Milk Chocolate, Brown Sugar, Orange','Medium-Dark Roast','Milling Process: Fully Washed'],country:'el salvador',roast:'Medium-Dark',notes:['milk chocolate','brown sugar','orange']},
 416:{name:'Guatemala*',url:'https://woodwarblercoffee.com/products/guatemala-huehuetanango',proof:['Honey, Lime, Orange','Medium Roast','Milling Process: Fully Washed'],country:'guatemala',roast:'Medium',notes:['honey','lime','orange']},
 417:{name:'Honduras - Washed*',url:'https://woodwarblercoffee.com/products/honduras-legacy-farms',proof:['Washed Process','Chocolate, Almond, Caramel','Medium Roast','Very similar to a Colombian Coffee'],country:'honduras',roast:'Medium',notes:['chocolate','almond','caramel']}
};
export function direct(n,html,heads){
 const c=cases[n],own=norm(clean(productMarkup(html)));
 return {identity:Array.isArray(heads)&&heads.length===1&&norm(heads[0])===norm(c.name),own_facts:c.proof.every(s=>own.includes(norm(s)))};
}
export function fields(n,f){
 const c=cases[n];if(!c)throw Error('unknown_case');
 const origin=norm(f.origin),taste=norm(f.tasting_notes);
 return {
  name:norm(f.name)===norm(c.name),roaster:/wood warbler/i.test(f.roaster||''),
  roast:f.roast_level===c.roast,washed:f.process==='Washed',
  origin:origin.includes(c.country),
  no_comparison_country:n===417?!origin.includes('colombia'):true,
  own_taste:c.notes.every(s=>taste.includes(s)),
  no_educational_taste:n===417?!taste.includes('nut flavors'):true,
  no_unpublished_elevation:!f.elevation_m,no_unpublished_producer:!f.producer,
  no_unpublished_decaf:!f.decaffeination_method,
  no_unpublished_lot_year:![f.harvest_year,f.release_year,f.crop_year].some(Boolean)
 };
}
if(process.env.DIC_R252_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,fail=[],ok=(v,s)=>{if(!v)fail.push(s)};
 let report,rawReport;try{rawReport=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(rawReport.toString('utf8'))}catch{}
 ok(JSON.stringify(report?.case_numbers)==='[415,416,417]'&&report.records?.length===3,'cohort');
 ok(report?.source_sha===process.env.DIC_R252_EVENT_SHA,'event_sha');
 ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R252_SOURCE_SHA,'checkout_sha');
 ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','csv_sha');
 ok(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'safety');
 const evidence=[];
 for(const n of [415,416,417]){
  const c=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const heads=raw?selectedProductHeadings(productMarkup(raw.toString('utf8'))):[];
  let uri;try{uri=new URL(r.final_url)}catch{}
  const expected=new URL(c.url),d=direct(n,raw?.toString('utf8')||'',heads);
  ok(r.archived_coffee===c.name&&r.official_url===c.url,n+'_original_identity');
  ok(uri?.protocol==='https:'&&uri.hostname===expected.hostname&&uri.pathname.replace(/\/$/,'')===expected.pathname&&!uri.search&&!uri.hash,n+'_exact_url');
  ok(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,n+'_actual_parser');
  ok(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),n+'_raw_sha');
  ok(d.identity&&d.own_facts,n+'_selected_facts');
  ok(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_preview_review');
  const checks=fields(n,f);for(const [key,val] of Object.entries(checks))ok(val,n+'_'+key);
  ok((r.conflicts||[]).length===0,n+'_conflicts');
  evidence.push({number:n,source:d,checks,headings:heads,raw_sha256:raw?hash(raw):null,fields:f});
 }
 const verdict={source_sha:process.env.DIC_R252_SOURCE_SHA,raw_report_sha256:rawReport?hash(rawReport):null,evidence,fail,passed:fail.length===0,manual_certified:0};
 writeFileSync(join(dir,'r252-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[R252] '+JSON.stringify(verdict));
 if(fail.length)process.exitCode=1;
}
