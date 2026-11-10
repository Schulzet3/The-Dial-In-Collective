#!/usr/bin/env node
// R97 Buona Caffe selected current products: strictly bounded official-source evidence.
// This verifies identities/facts, NOT all 603 manual product certifications.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const cases=Object.freeze([
 {
  "number": 448,
  "name": "Guatemala Huehuetenango Los Laureles",
  "path": "/products/guatemala-huehuetenango-los-laureles",
  "own": [
   "Variety: Bourbon, Caturra",
   "Variety: Caturra, Pache, Maragogype, others",
   "one of most impresive valleys of Huehuetenango",
   "Mario Jr. got charge of the farm"
  ]
 },
 {
  "number": 449,
  "name": "Sumatra Ketiara (Dark Roast)",
  "path": "/products/sumatra-gayo-dark-roast",
  "own": [
   "Aceh highlands of northwestern Sumatra in the Indonesia Islands",
   "Shade-grown coffee not only produces a better taste in the cup"
  ]
 },
 {
  "number": 450,
  "name": "Tanzanian peaberry (Dark Roast)",
  "path": "/products/tanzanian-peaberry-dark-roast",
  "own": [
   "grown at an elevation of 4,492 feet in rich, volcanic soil",
   "Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a light chocolate finish"
  ]
 }
]);
function selectedText(html){
 return String(html||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<(?:section|div)\b[^>]*class=["'][^"']*(?:related-products|product-recommendations|recommendations)[^"']*["'][^>]*>[\s\S]*?<\/(?:section|div)>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/g,' ').trim();
}
export function ownSelectedProof(selected,headings,entry){
 const t=fold(selectedText(selected));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
 direct:entry.own.map(v=>t.includes(fold(v)))};
}
if(process.env.DIC_ISSUE33_R97_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],require=(ok,code)=>{if(!ok)failures.push(code)};
 let raw,report;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
 require(JSON.stringify(report?.case_numbers)==='[448,449,450]'&&report.records?.length===3,'original_three_identity_rows');
 require(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 require(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_immutable_hash');
 require(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_certification_or_production');
 const items=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let bytes;try{bytes=readFileSync(join(dir,'case-'+entry.number+'.html'));}catch{}
  const scope=productMarkup(bytes?.toString('utf8')||''),headings=selectedProductHeadings(scope),p=ownSelectedProof(scope,headings,entry);
  let final;try{final=new URL(r.final_url)}catch{}
  require(r.official_url==='https://www.buonacaffe.com'+entry.path&&r.archived_coffee===entry.name,'original_selected_identity_'+entry.number);
  require(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'current_identity_parser_'+entry.number);
  require(Boolean(bytes)&&digest(bytes)===r.html_sha256&&bytes.length===r.html_bytes,'actual_html_sha_and_bytes_'+entry.number);
  require(final?.protocol==='https:'&&final?.hostname==='www.buonacaffe.com'&&final?.pathname.replace(/\/$/,'')===entry.path&&!final?.search&&!final?.hash,'actual_official_handle_'+entry.number);
  require(p.uniqueH1&&p.direct.every(Boolean),'one_selected_h1_and_direct_own_facts_'+entry.number);
  require(fold(f.name)===fold(entry.name),'actual_parser_identity_'+entry.number);
  require(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_source_review_'+entry.number);
  require(!/Ethiopia|Colombia|Kenya|Rwanda|Blue Jazz|Chromatic/i.test(JSON.stringify(f)),'unrelated_coffee_fields_'+entry.number);
  if(entry.number===448){
   require(f.origin==='Huehuetenango, Guatemala','direct_current_selected_valley_refinement_448');
   require((f.process||'')==='Washed','direct_selected_fully_washed_448');
   // Different printed cultivar lists are *not* permission to invent one definitive lot variety.
   // A nonempty canonical variety is only acceptable if explicitly flagged conflicting.
   require(!f.variety||(r.conflicts||[]).includes('variety'),'incompatible_current_variety_lists_must_be_reviewable_448');
  }else if(entry.number===449){
   require(f.roast_level==='Dark','selected_dark_roast_title_449');
   require(/Sumatra/i.test(f.origin||'')&&/Indones/i.test(f.origin||''),'own_selected_sumatra_indonesia_449');
   require(!f.process&&!f.producer&&!f.elevation_m&&!f.variety,'do_not_infer_unpublished_process_farmer_height_cultivar_449');
  }else{
   require(f.roast_level==='Dark','selected_dark_roast_title_450');
   require(/Tanzania/i.test(f.origin||''),'selected_country_450');
   require(!f.process&&!f.producer&&!f.variety,'do_not_infer_process_farmer_cultivar_450');
  }
  items.push({number:entry.number,status:r.status,final_url:r.final_url,html_sha256:r.html_sha256,
   selected_headings:headings,direct_own:p,fields:f,conflicts:r.conflicts||[],
   source_facts:(r.source_facts||[]).slice(0,15)});
 }
 const result={source_sha:report?.source_sha,case_numbers:cases.map(c=>c.number),source_evidence_sha256:raw?digest(raw):null,
 items,manual_certified:0,production_operations:0,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r97-buona-448-450-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R97 BUONA EXACT SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
