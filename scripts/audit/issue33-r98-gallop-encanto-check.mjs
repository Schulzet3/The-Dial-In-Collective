#!/usr/bin/env node
// Issue #33 R98: current exact selected original603 #464/#466 source validation.
// This is bounded source/actual parser acceptance, NOT individual 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
 {number:464,name:'Gallop',path:'/products/gallop',host:'www.congregationcoffee.com',
  own:['When the day calls for a faster pace, we opt for Gallop',
   'While the blend changes with each harvest',
   'Red Apple',"S'mores",'Black Cherry']},
 {number:466,name:'Jardines del Encanto',path:'/products/encanto-maragesha-washed-colombia',host:'www.corvuscoffee.com',
  own:['Washed Maragesha','Quindio, Colombia',
   'Felipe Arcila is a fourth-generation coffee farmer',
   'This lot undergoes washed processing',
   'Strawberry, Peach, Red Wine']}
]);
function selectedText(html){
 return String(html||'').replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<(?:section|div)\b[^>]*class=["'][^"']*(?:related-products|product-recommendations|recommendations)[^"']*["'][^>]*>[\s\S]*?<\/(?:section|div)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/&#(?:39|x27);/giu,"'")
  .replace(/\s+/gu,' ').trim();
}
export function selectedProof(html,headings,entry){
 const own=fold(selectedText(html));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
  direct:entry.own.map(v=>own.includes(fold(v)))};
}
if(process.env.DIC_ISSUE33_R98_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],assert=(v,k)=>{if(!v)failures.push(k)};
 let report=null,reportBytes=null;
 try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'))}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[464,466]'&&report?.records?.length===2,'selected_subset');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_certification_or_production');
 const items=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'))}catch{}
  let final;try{final=new URL(r.final_url)}catch{}
  assert(r.official_url==='https://'+entry.host+entry.path&&r.archived_coffee===entry.name,'original_selected_product_'+entry.number);
  assert(final?.protocol==='https:'&&final?.hostname===entry.host&&final?.pathname.replace(/\/$/,'')===entry.path&&!final?.search&&!final?.hash,'exact_official_product_final_url_'+entry.number);
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_identity_and_parser_'+entry.number);
  assert(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_selected_html_sha256_'+entry.number);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected),proof=selectedProof(selected,headings,entry);
  assert(proof.uniqueH1&&proof.direct.every(Boolean),'own_current_selected_claims_'+entry.number);
  assert(fold(f.name)===fold(entry.name),'actual_parser_correct_product_'+entry.number);
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_review_'+entry.number);
  assert(!(r.conflicts||[]).includes('name'),'no_chosen_identity_conflict_'+entry.number);
  if(entry.number===464){
   assert(/Colombia/i.test(f.origin||'')&&/Guatemala/i.test(f.origin||''),'current_two_country_blend_464');
   assert(['Red Apple',"S'mores",'Black Cherry'].every(t=>fold(f.tasting_notes).includes(fold(t))),'selected_own_printed_notes_464');
   assert(!f.process&&!f.variety&&!f.producer&&!f.roast_level,'no_invented_blend_method_cultivar_roast_grower_464');
  }else{
   assert(/Quindio/i.test(f.origin||'')&&/Colombia/i.test(f.origin||''),'current_selected_origin_466');
   assert(/Washed/i.test(f.process||''),'direct_current_selected_washed_466');
   assert(/Maragesha/i.test(f.variety||''),'direct_current_selected_cultivar_466');
   assert(/Felipe Arcila/i.test(f.producer||''),'direct_current_selected_producer_466');
   assert(['Strawberry','Peach','Red Wine'].every(t=>fold(f.tasting_notes).includes(fold(t))),'selected_printed_tasting_notes_466');
   assert(!f.roast_level&&!f.elevation_m,'no_unsupported_roast_or_elevation_466');
  }
  assert(!/Other Coffee|Raspberry Yogurt|Papua New Guinea|Sumatra Peaberry/i.test(JSON.stringify(f)),'no_neighbor_product_bleed_'+entry.number);
  items.push({number:entry.number,status:r.status,final_url:r.final_url,html_sha256:r.html_sha256,headings,proof,
    fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,18)});
 }
 const result={source_sha:report?.source_sha,case_numbers:cases.map(c=>c.number),
  source_evidence_sha256:reportBytes?sha(reportBytes):null,items,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r98-464-466-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R98 EXACT OFFICIAL SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
