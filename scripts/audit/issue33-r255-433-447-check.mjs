#!/usr/bin/env node
// Source-bound audit-only afterproof for two previously unresolved original603 URLs.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const ownText=html=>productMarkup(String(html||'')).replace(/<(script|style|nav|aside|footer|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ').replace(/<[^>]{0,2000}>/gu,' ').replace(/\s+/gu,' ');
export const cases={
 433:{name:'AM',url:'https://www.blackcoffeeroastingco.com/product/am-blend',
   proof:['Graham cracker','cashew','hibiscus','hint of lemon','Roast Level: Lighter']},
 447:{name:'Sumatra Mandheling',url:'https://www.bluejazzcoffee.com/products/sumatra-mandheling',
   proof:['Jegarang','1375','1600','deep fruit','Medium-Dark Roast']}
};
export function direct(n,html,headings){
 const c=cases[n];if(!c)throw Error('unknown_case');
 const own=norm(ownText(html));
 return {selected_heading:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm(c.name),
  own_evidence:c.proof.every(p=>own.includes(norm(p)))};
}
export function fields(n,f){
 const taste=norm(f.tasting_notes),origin=norm(f.origin);
 const shared={name:norm(f.name)===norm(cases[n].name),
   no_unpublished_method:!f.decaffeination_method,
   no_unpublished_producer:!f.producer,
   no_invented_harvest:![f.harvest_year,f.release_year,f.crop_year].some(Boolean),
   no_unpublished_dose:![f.dose_g,f.yield_g,f.time_s].some(Boolean)};
 if(n===433)return {...shared,merchant:/black coffee roasting/i.test(f.roaster||''),
  graham:taste.includes('graham cracker'),cashew:taste.includes('cashew'),
  hibiscus:taste.includes('hibiscus'),lemon:taste.includes('lemon'),
  no_figurative_sunrise:!taste.includes('sunrise'),
  unsupported_lighter_left_blank:!f.roast_level,
  no_fabricated_growing_origin:!f.origin,no_fabricated_elevation:!f.elevation_m};
 if(n===447)return {...shared,merchant:/blue jazz/i.test(f.roaster||''),
  direct_fruit:taste.includes('deep fruit'),no_grinding_aroma_as_cup_note:!taste.includes('aromatics')&&!taste.includes('grinding'),
  roast:f.roast_level==='Medium-Dark',
  growing_origin:origin.includes('jegarang')&&origin.includes('sumatra')&&!origin.includes('kansas'),
  two_elevations:/1375/.test(String(f.elevation_m))&&/1600/.test(String(f.elevation_m))};
 throw Error('unknown_case');
}
if(process.env.DIC_R255_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],assert=(v,key)=>{if(!v)errors.push(key)};
 let report,bytes;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[433,447]'&&report.records?.length===2,'exact_cohort');
 assert(report?.source_sha===process.env.DIC_R255_EVENT_SHA,'event_source_sha');
 assert(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R255_SOURCE_SHA,'checkout_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_csv_bytes');
 assert(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'safety');
 const evidence=[];
 for(const n of [433,447]){
  const c=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const html=raw?.toString('utf8')||'',headings=selectedProductHeadings(productMarkup(html));
  const source=direct(n,html,headings),checks=fields(n,f);
  let final;try{final=new URL(r.final_url)}catch{}
  const expected=new URL(c.url);
  assert(r.archived_coffee===c.name&&r.official_url===c.url,n+'_original_identity');
  assert(final?.protocol==='https:'&&final.host===expected.host&&final.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,n+'_exact_url');
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,n+'_parser_and_selected_identity');
  assert(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),n+'_independent_html_digest');
  assert(source.selected_heading&&source.own_evidence,n+'_direct_selected_source');
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_actual_add_coffee_source_review');
  for(const [name,passed] of Object.entries(checks))assert(passed,n+'_'+name);
  assert((r.conflicts||[]).length===0,n+'_no_canonical_conflicts');
  evidence.push({number:n,url:r.final_url,raw_sha256:raw?hash(raw):null,html_bytes:raw?.length||0,
   headings,source,checks,current_fields:f,conflicts:r.conflicts||[]});
 }
 const verdict={source_sha:process.env.DIC_R255_SOURCE_SHA,event_sha:report?.source_sha,
  report_sha256:bytes?hash(bytes):null,evidence,errors,passed:errors.length===0,manual_certified:0};
 writeFileSync(join(dir,'r255-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R255] '+JSON.stringify(verdict));
 if(errors.length)process.exitCode=1;
}
