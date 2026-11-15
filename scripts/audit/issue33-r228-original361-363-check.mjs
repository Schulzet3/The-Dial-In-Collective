#!/usr/bin/env node
// #33 R228: selected raw independent afterproof for #361/#363 and #362 changed identity negative.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_evidence_directory_required');
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const errors=[],results=[];
if(head!==process.env.DIC_R228_HEAD)errors.push('incorrect_exact_source_sha');
if(JSON.stringify(summary.case_numbers)!=='[361,362,363]'||
 JSON.stringify(summary.negative_identity_case_numbers)!=='[362]'||summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('frozen_original603_source_register_or_case_identity_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)errors.push('false_full_corpus_or_production_claim');
const selected=[
 [361,'https://subterracoffee.com/products/decaf-colombia-sugarcane-medium-roast','decaf colombia sugarcane medium roast'],
 [362,'https://subterracoffee.com/products/ethiopia-guji-hambela-buliye-natural-light-roast','ethiopia guji hambela natural light roast'],
 [363,'https://subterracoffee.com/products/mexico-chiapas-bellavista-medium','mexico chiapas bellavista medium']
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
for(const [n,url,name] of selected){
 const bad=[],r=summary.records.find(x=>x.number===n)||{};
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('raw_current_source_missing')}
 const hash=createHash('sha256').update(raw).digest('hex');
 const selectedMarkup=productMarkup(raw.toString('utf8'));
 const h1=selectedProductHeadings(selectedMarkup);
 const txt=selectedMarkup.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
  bad.push('exact_public_selected_url_missing_or_parser_failed');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==hash)
  bad.push('source_bytes_or_sha256_not_bound');
 if(!h1.some(x=>x.toLowerCase()===name)||String(f.name||'').toLowerCase()!==name)
  bad.push('actual_current_selected_product_heading_or_name_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)
  bad.push('Add_Coffee_or_Source_Review_not_rendered');
 if(n===362){
  if(r.selected_heading_identity_verified!==false||r.original_product_not_certified!==true||
   r.current_identity_exception!=='CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS')
   bad.push('recycled_handle_current_identity_not_qualified_negative');
  if(!has(r.archived_coffee,'sidama ayla bombe')||has(f.name,'sidama')||
   !has(txt,'guji hambela')||has(f.decaffeination_method,'Water Process'))
   bad.push('current_guji_identity_contaminated_by_archived_sidama');
  if(!has(f.process,'Natural')||f.roast_level!=='Light')
   bad.push('selected_current_guji_processing_or_roast_missing');
 }else{
  if(r.selected_heading_identity_verified!==true)
   bad.push('positive_current_original_identity_not_proven');
  if(n===361){
   for(const s of ['cocoa','nut','browned sugar'])
    if(!has(f.tasting_notes,s)||!has(txt,s))bad.push('own_decaf_note_missing_'+s);
   if(f.decaffeination_method!=='Sugar Process'||f.roast_level!=='Medium')
    bad.push('explicit_sugarcane_decaf_or_medium_missing');
   if(f.process&&f.process!=='Other/Unknown')bad.push('decaf_confused_with_green_processing');
  }else{
   if(!has(f.tasting_notes,'nutty')||!has(f.tasting_notes,'chocolate')||
     !has(txt,'nutty')||!has(txt,'chocolate'))
    bad.push('Bellavista_own_notes_missing');
   if(f.process!=='Washed'||!has(f.origin,'Mexico'))
    bad.push('Bellavista_washed_Mexico_missing');
   if(f.decaffeination_method||f.roast_level==='Dark')bad.push('unpublished_decaf_or_dark_inferred');
  }
 }
 if(f.espresso_recipe)bad.push('generic_grind_recommendation_claimed_numeric_espresso');
 errors.push(...bad.map(e=>n+':'+e));
 results.push({number:n,url,raw_bytes:raw.length,raw_sha256:hash,
  selected_h1:h1,archived_coffee:r.archived_coffee||null,original_identity_positive:n!==362,
  current_fields:f,conflicts:p.conflicts||[],errors:bad});
}
const report={source_sha:head,passed:errors.length===0,positive_original_cases:errors.length?[]:[361,363],
 changed_original_identity_negative_cases:errors.length?[]:[362],all603_semantically_certified:false,
 original603_total:603,production_operations:0,cases:results,errors};
writeFileSync(join(dir,'r228-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R228 EXACT SELECTED PRIMARY SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,30000));
if(errors.length)throw Error(errors.join(','));
