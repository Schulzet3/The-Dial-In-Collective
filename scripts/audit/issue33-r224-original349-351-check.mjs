#!/usr/bin/env node
// #33 R224 exact-current chosen original349-351 guarded HTTPS afterproof.
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
catch{errors.push('missing_current_evidence_summary')}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==process.env.DIC_R224_HEAD)errors.push('wrong_checkout_sha');
if(JSON.stringify(summary.case_numbers)!=='[349,350,351]'||summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('immutable_original603_register_invalid');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)errors.push('unsupported_global_certification_or_provider_writes');
const required=[
 [349,'https://spirituscoffee.com/products/aether-dark-roast-blend','Aether Dark Roast'],
 [350,'https://spirituscoffee.com/products/guatemala-manos-de-mujer','Guatemala Manos de Mujer'],
 [351,'https://spirituscoffee.com/products/mountain-water-process-decaf','Colombia Valle del Cauca Sugarcane Decaf']
];
for(const [num,url,name] of required){
 const bad=[],r=summary.records?.find(x=>x.number===num)||{};
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+num+'.html'))}catch{bad.push('missing_html')}
 const digest=createHash('sha256').update(raw).digest('hex');
 const selected=productMarkup(raw.toString('utf8'));
 const h1=selectedProductHeadings(selected);
 const text=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)bad.push('source_url_unavailable_or_changed');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==digest)bad.push('primary_raw_hash_mismatch');
 if(!r.selected_heading_identity_verified||!h1.includes(name)||f.name!==name)bad.push('exact_chosen_product_identity_not_verified');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)bad.push('Add_Coffee_or_Source_Review_missing');
 if((p.conflicts||[]).includes('name'))bad.push('conflicting_selected_name');
 if(num===349){
  if(f.roast_level!=='Dark'||!/Mexico/i.test(String(f.origin||''))||
   !/dark chocolate/i.test(String(f.tasting_notes||''))||!/molasses/i.test(String(f.tasting_notes||'')))
   bad.push('selected_dark_roast_tasting_origin_missing');
  if(f.decaffeination_method||f.espresso_recipe)bad.push('unsupported_decaf_or_espresso');
 }else if(num===350){
  if(f.roast_level!=='Medium'||f.process!=='Washed'||
   !/Guaya.b|Manos de Mujer/i.test(String(f.producer||'')))bad.push('selected_washed_roast_producer_missing');
  const hero=/Citrus\s+Stone fruit\s+Milk chocolate/i.test(text);
  const story=/Tasting Notes:\s*Dark chocolate,\s*hazelnut,\s*vanilla,\s*dried cherry/i.test(text);
  if(!hero||!story)bad.push('selected_source_notes_changed');
  // Contradictory exact-current selected-product flavor claims cannot be
  // silently promoted to one verified value; require actual review conflict.
  const conflict=(p.conflicts||[]).includes('tasting_notes')||
   (p.source_facts||[]).some(x=>x.field==='tasting_notes'&&x.conflicting===true);
  if(hero&&story&&!conflict)bad.push('current_selected_notes_conflict_unflagged');
  if(f.decaffeination_method||f.espresso_recipe)bad.push('unsupported_decaf_or_espresso');
 }else{
  if(f.decaffeination_method!=='Sugar Process'||f.process!=='Washed'||
   f.roast_level!=='Medium'||!/Valle del Cauca/i.test(String(f.origin||'')))
   bad.push('sugarcane_decaf_washed_green_process_missing');
  if(/Mountain Water Process Decaf/i.test(String(f.name||''))||f.espresso_recipe)
   bad.push('old_slug_or_unsourced_espresso');
 }
 errors.push(...bad.map(e=>num+':'+e));
 cases.push({num,html_bytes:raw.length,html_sha256:digest,selected_h1:h1,
  current_fields:f,conflicts:p.conflicts||[],
  source_fact_conflicts:(p.source_facts||[]).filter(x=>x.conflicting).slice(0,8),errors:bad});
}
const report={source_sha:sha,passed:errors.length===0,original603_manual_certification:false,provider_writes:0,cases,errors};
writeFileSync(join(dir,'r224-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R224 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(report).slice(0,26000));
if(errors.length)throw Error(errors.join(','));
