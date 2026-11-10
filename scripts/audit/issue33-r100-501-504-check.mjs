#!/usr/bin/env node
// Issue #33 R100; original selected coffee #501 and #504 only, not full-603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
 {number:501,name:'Organic Ki-Saya - Tenejapa Microlot',host:'www.ixxacoffee.com',
  path:'/products/organic-ki-saya-tenejapa-microlot',
  own:['organic gem from Chiapas','This lot hails from Tenejapa','Chocolate, creamy caramel, honey, hazelnut']},
 {number:504,name:'Tanzania AA - AMCOS',host:'www.kamiakcoffeeco.com',
  path:'/products/tanzania-aa-amcos',
  own:['coffee out of Tanzania','honeydew, agave sweetness','AMCOS Cooperative','1870 masl','Washed']}
]);
export function selectedProof(html,headings,entry){
 const selected=productMarkup(String(html||''));
 const body=selected.replace(/<!--[\\s\\S]*?-->/gu,' ')
   .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\\b[^>]*>[\\s\\S]*?<\\/\\1>/giu,' ')
   .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
   .replace(/&#(?:39|x27);/giu,"'").replace(/\\s+/gu,' ');
 const own=fold(body);
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
  direct:entry.own.map(s=>own.includes(fold(s)))};
}
if(process.env.DIC_ISSUE33_R100_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});const failures=[],assert=(b,k)=>{if(!b)failures.push(k)};
 let report=null,reportBytes=null;
 try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'))}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[501,504]'&&report?.records?.length===2,'exact_two_original_selected');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_full_certification_or_provider_writes');
 const observations=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'))}catch{}
  let url=null;try{url=new URL(r.final_url)}catch{}
  assert(r.official_url==='https://'+entry.host+entry.path&&r.archived_coffee===entry.name,'exact_original_identity_'+entry.number);
  assert(url?.protocol==='https:'&&url?.hostname===entry.host&&url?.pathname.replace(/\/$/u,'')===entry.path&&!url?.search&&!url?.hash,'exact_selected_final_url_'+entry.number);
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_selected_current_identity_parser_'+entry.number);
  assert(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'bound_selected_raw_sha_'+entry.number);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected),proof=selectedProof(selected,headings,entry);
  assert(proof.uniqueH1&&proof.direct.every(Boolean),'chosen_h1_and_direct_selected_printed_'+entry.number);
  assert(fold(f.name)===fold(entry.name)&&!(r.conflicts||[]).includes('name'),'actual_parser_identity_'+entry.number);
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_add_coffee_source_review_'+entry.number);
  if(entry.number===501){
   assert(/Tenejapa/i.test(f.origin||'')&&/Chiapas/i.test(f.origin||''),'selected_own_location_501');
   assert(['chocolate','caramel','honey','hazelnut'].every(n=>fold(f.tasting_notes).includes(n)),'selected_own_notes_501');
   assert(!f.roast_level&&!f.process&&!f.variety&&!f.producer&&!f.elevation_m,'no_unprinted_roast_process_variety_grower_elevation_501');
  }else{
   assert(/Tanzania/i.test(f.origin||'')&&/Mbeya/i.test(f.origin||''),'selected_country_region_504');
   assert(/Washed/i.test(f.process||''),'selected_washed_504');
   assert(/Bourbon/i.test(f.variety||''),'selected_bourbon_derivatives_504');
   assert(/1870/.test(f.elevation_m||''),'selected_1870_masl_504');
   assert(['honeydew','agave','peat'].every(n=>fold(f.tasting_notes).includes(n)),'selected_own_notes_504');
  }
  assert(!/related decaf|other bag|swiss water|different roast strawberry/i.test(JSON.stringify(f)),'no_neighbor_contamination_'+entry.number);
  observations.push({number:entry.number,url:r.final_url,html_sha256:r.html_sha256,headings,proof,fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,20)});
 }
 const result={source_sha:report?.source_sha,evidence_sha256:reportBytes?sha(reportBytes):null,
  case_numbers:cases.map(x=>x.number),observations,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r100-501-504-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R100 SELECTED SOURCE AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
