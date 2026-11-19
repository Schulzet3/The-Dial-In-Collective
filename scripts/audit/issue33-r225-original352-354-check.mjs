#!/usr/bin/env node
// R225: exact selected originals #352–354 raw guarded HTTPS and parser afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_evidence_directory_required');
const errors=[],cases=[];
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch{errors.push('missing_focused_source_evidence')}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==process.env.DIC_R225_HEAD)errors.push('wrong_exact_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[352,353,354]'||summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('original_immutable_corpus_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)errors.push('unearned_global_certification_or_operations');
const required=[
 [352,'https://staccatoroasters.com/products/colombia-valle-del-cauca-ea-decaf','Colombia EA Sugarcane Decaf Coffee Beans'],
 [353,'https://staccatoroasters.com/products/ethiopia-sasaba-natural-coffee','Ethiopia Sasaba Natural Coffee'],
 [354,'https://staccatoroasters.com/products/honduras-elvin-suazo-natural-coffee','Honduras Elvin Suazo Coffee Beans']
];
for(const [n,url,name] of required){
 const bad=[],r=summary.records?.find(x=>x.number===n)||{};
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('missing_raw_official_html')}
 const digest=createHash('sha256').update(raw).digest('hex');
 const sel=productMarkup(raw.toString('utf8'));
 const headings=selectedProductHeadings(sel);
 const text=sel.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ')
  .replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
  bad.push('original_exact_selected_url_or_parser_unavailable');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==digest)
  bad.push('current_raw_sha256_or_length_not_bound');
 if(!r.selected_heading_identity_verified||!headings.includes(name)||f.name!==name)
  bad.push('current_selected_h1_name_drift');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)
  bad.push('Add_Coffee_or_Source_Review_missing');
 if((p.conflicts||[]).includes('name'))bad.push('selected_product_name_conflicted');
 if(n===352){
  if(f.process!=='Washed'||f.decaffeination_method!=='Sugar Process'||
    f.roast_level!=='Medium'||!/Valle del Cauca/i.test(String(f.origin||'')))
   bad.push('washed_green_vs_EA_decaf_or_roast_incorrect');
  if(!/Strawberry/i.test(String(f.tasting_notes||''))||
    !/Chocolate/i.test(String(f.tasting_notes||''))||
    !/Vanilla/i.test(String(f.tasting_notes||''))||
    !/smallholder/i.test(String(f.producer||'')))
   bad.push('exact_selected_notes_or_producer_missing');
 }else if(n===353){
  if(f.process!=='Natural'||f.roast_level!=='Light'||!/Guji|Kercha/i.test(String(f.origin||'')))
   bad.push('sasaba_natural_light_or_origin_missing');
  if(!/Berry|Stone Fruit/i.test(String(f.tasting_notes||''))||
    /Tsegay Hagos Tesfaye/i.test(String(f.producer||'')))
   bad.push('sasaba_selected_notes_or_station_founder_misattributed');
  if(f.decaffeination_method)bad.push('unsupported_sasaba_decaf');
 }else{
  if(f.process!=='Natural'||f.roast_level!=='Light'||
   !/Elvin Suazo/i.test(String(f.producer||''))||
   !/IHCAFE 90/i.test(String(f.variety||'')))
   bad.push('current_elvin_lot_processing_or_owner_missing');
  if(!/Bright Citrus|Citrus/i.test(String(f.tasting_notes||''))||
   !/Blueberry/i.test(String(f.tasting_notes||'')))
   bad.push('current_elvin_core_tasting_missing');
  if(!/Harvest:\s*December\s*[–—-]\s*March/iu.test(text))
   bad.push('current_harvest_window_disappeared_review_required');
  if(f.release_label)bad.push('recurring_harvest_window_misused_as_distinct_release');
  if(f.decaffeination_method)bad.push('unsourced_elvin_decaf');
 }
 if(f.espresso_recipe)bad.push('brew_recommendation_not_numeric_espresso_recipe');
 errors.push(...bad.map(x=>n+':'+x));
 cases.push({number:n,url,current_h1:headings,raw_bytes:raw.length,sha256:digest,
  current_fields:f,conflicts:p.conflicts||[],errors:bad});
}
const report={source_sha:sha,passed:errors.length===0,manual_semantic_certification_of_603:false,
 provider_writes:0,cases,errors};
writeFileSync(join(dir,'r225-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R225 EXACT CURRENT PRIMARY AFTERPROOF] '+JSON.stringify(report).slice(0,26000));
if(errors.length)throw Error(errors.join(','));
