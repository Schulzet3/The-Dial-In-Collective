#!/usr/bin/env node
// Issue33 R102 only: selected original603 #533/#539; never universal certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
 {number:533,name:'Early Bird',host:'www.nunatakcoffee.com',path:'/products/early-bird',
  own:['Thoughtfully chosen beans from Central and South America','flavors of orange, brown sugar and medjool dates']},
 {number:539,name:'Cosa Nueva — Flagship Blend',host:'www.radialcoffee.com',path:'/products/cosa-nueva-flagship-blend',
  own:['Washed Process','Medium Light Roast','milk chocolate base is complemented with notes of stone fruit and honey']}
]);
export function selectedProof(html,headings,e){
 const chosen=productMarkup(String(html||''));
 const own=fold(chosen.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' '));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(e.name),
  direct:e.own.map(x=>own.includes(fold(x)))};
}
if(process.env.DIC_ISSUE33_R102_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let report=null,bytes=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'))}catch{}
 const failures=[],assert=(ok,name)=>{if(!ok)failures.push(name)};
 assert(JSON.stringify(report?.case_numbers)==='[533,539]'&&report?.records?.length===2,'exact_selected_two_cases');
 assert(report?.source_sha===process.env.GITHUB_SHA,'checkout_exact_source_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_603_original_csv_unchanged');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'source_corpus_and_no_member_provider_writes');
 const observations=[];
 for(const entry of cases){
  const record=report?.records?.find(x=>x.number===entry.number)||{},f=record.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'))}catch{}
  let url=null;try{url=new URL(record.final_url)}catch{}
  assert(record.official_url==='https://'+entry.host+entry.path&&record.archived_coffee===entry.name,'exact_selected_frozen_identity_'+entry.number);
  assert(url?.protocol==='https:'&&url?.hostname===entry.host&&url?.pathname.replace(/\/$/u,'')===entry.path&&!url?.search&&!url?.hash,'selected_not_neighbor_or_redirect_'+entry.number);
  assert(record.status==='FETCHED'&&record.parser_ok===true&&record.selected_heading_identity_verified===true,'actual_guarded_current_source_parser_'+entry.number);
  assert(Boolean(raw)&&raw.length===record.html_bytes&&sha(raw)===record.html_sha256,'actual_raw_source_bound_sha_'+entry.number);
  const selected=productMarkup(raw?.toString('utf8')||'');
  const headings=selectedProductHeadings(selected),proof=selectedProof(selected,headings,entry);
  assert(proof.uniqueH1&&proof.direct.every(Boolean),'exact_h1_direct_own_printed_facts_'+entry.number);
  assert(fold(f.name)===fold(entry.name)&&!(record.conflicts||[]).includes('name'),'chosen_identity_not_reused_slug_'+entry.number);
  assert(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'actual_add_coffee_source_review_'+entry.number);
  if(entry.number===533){
   assert(/Central America/i.test(f.origin||'')&&/South America/i.test(f.origin||''),'selected_broad_two_origin_regions_533');
   assert(['orange','brown sugar','medjool dates'].every(x=>fold(f.tasting_notes).includes(x)),'selected_full_three_notes_533');
   assert(!f.roast_level&&!f.process&&!f.producer&&!f.variety&&!f.elevation_m,'no_unpublished_specifics_or_roast_533');
  }else{
   assert(fold(f.roast_level)==='medium light','selected_medium_light_roast_539');
   assert(fold(f.process)==='washed','selected_washed_process_539');
   assert(['milk chocolate','stone fruit','honey'].every(x=>fold(f.tasting_notes).includes(x)),'direct_full_three_sensory_notes_539');
   assert(!f.origin&&!f.producer&&!f.variety&&!f.elevation_m,'seasonal_partners_not_specific_origin_539');
  }
  assert(!/Guatemala Pablo|Colombia Arquimedes|other coffee natural anaerobic/i.test(JSON.stringify(f)),'no_other_product_source_contamination_'+entry.number);
  observations.push({number:entry.number,url:record.final_url,raw_html_sha256:record.html_sha256,
   selected_h1:headings,printed_source_proof:proof,parser_fields:f,conflicts:record.conflicts||[],
   own_source_facts:(record.source_facts||[]).slice(0,20)});
 }
 const result={source_sha:report?.source_sha,evidence_sha256:bytes?sha(bytes):null,
  selected_original_case_numbers:cases.map(x=>x.number),observations,
  manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r102-533-539-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R102 STRICT SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
