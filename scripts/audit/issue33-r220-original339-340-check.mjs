#!/usr/bin/env node
// R220: current official exact selected-product afterproof, cases #339/#340 only.
// Individual case evidence is NOT the full original603 semantic review.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';

const rows=[
 {n:339,url:'https://snowyelk.com/products/the-summit',name:'The Summit',
  roast:'Dark',notes:['Chocolate brownie','pomegranate','dried cherry'],
  raw:[/Chocolate Brownie/i,/Pomegranate/i,/Dried Cherry/i,/Colombia\s*(?:&|and)\s*Brazil/i,/Washed\s*(?:&|and)\s*Natural/i]},
 {n:340,url:'https://sodality.coffee/products/las-brisas-nicaragua',name:'Las Brisas',
  roast:null,notes:['Lemon Lime Soda','Greek Yogurt','Dried Fruit','Graham','Rooibos Tea'],
  raw:[/Las Brisas Microfarm/i,/Centroamericano/i,/1300\s*-\s*1500\s*masl/i,/Washed/i]}
];
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.'),errors=[],products=[];
mkdirSync(dir,{recursive:true});
let summary={};try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}
catch{errors.push('missing_original603_capture_summary');}
const hash=b=>createHash('sha256').update(b).digest('hex');
const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(checkout!==process.env.DIC_R220_EXACT_CHECKOUT_SHA)errors.push('not_exact_checkout');
if(JSON.stringify(summary.case_numbers)!=='[339,340]'||summary.records?.length!==2)
 errors.push('wrong_original603_case_set');
if(summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('original603_source_register_changed');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errors.push('unearned_corpus_or_provider_claim');
for(const row of rows){
 const r=summary.records?.find(x=>x.number===row.n)||{},e=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+row.n+'.html'));}catch{e.push('missing_raw_selected_source');}
 const html=raw.toString('utf8'),selected=productMarkup(html),heads=selectedProductHeadings(selected);
 const p=raw.length?extractPublicCoffeeFacts(html,{source_url:r.final_url||row.url}):{},f=p.fields||{};
 const visible=selected.replace(/<[^<>]{0,2500}>/gu,' ').replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ').replace(/&amp;/giu,'&').replace(/\s+/gu,' ');
 if(r.status!=='FETCHED'||r.official_url!==row.url||r.final_url!==row.url||!r.parser_ok)
  e.push('source_or_parser_unavailable');
 if(raw.length<1000||raw.length!==r.html_bytes||hash(raw)!==r.html_sha256)
  e.push('source_hash_or_bytes_mismatch');
 if(!r.selected_heading_identity_verified||!heads.includes(row.name)||f.name!==row.name)
  e.push('selected_current_product_identity_mismatch');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)e.push('Add_Coffee_or_Source_Review_unavailable');
 if((p.conflicts||[]).includes('name')||f.espresso_recipe||f.decaffeination_method)
  e.push('identity_conflict_or_unpublished_espresso_decaf');
 if(row.roast?f.roast_level!==row.roast:Boolean(f.roast_level))
  e.push('own_roast_or_unpublished_roast_misclassified');
 for(const note of row.notes)if(!String(f.tasting_notes||'').toLowerCase().includes(note.toLowerCase()))
  e.push('selected_notes_missing:'+note);
 for(const pattern of row.raw)if(!pattern.test(visible))e.push('current_selected_primary_spec_changed:'+pattern);
 if(row.n===339){
  if(!/Colombia/i.test(String(f.origin||''))||!/Brazil/i.test(String(f.origin||'')))
   e.push('selected_blend_origin_missing');
  // Two different green processes in one blend are not a single Washed assertion.
  if(f.process==='Washed'||f.process==='Natural')e.push('mixed_green_process_collapsed');
  // Direct selected-product source facts are stricter than a cached third-party
  // rendering. Live source now says Blend, Washed & Natural (not old Semi-Washed).
  const direct=p.source_facts||[];
  if(!direct.some(x=>x.field==='process'&&x.source_type==='html'&&
     /Blend,\s*Washed\s*(?:&|and)\s*Natural/i.test(String(x.value||''))))
   e.push('selected_current_mixed_process_html_fact_missing');
  if(!direct.some(x=>x.field==='roast_level'&&x.source_type==='html'&&
     /Dark/i.test(String(x.value||''))))
   e.push('selected_current_dark_roast_html_fact_missing');
  if(/Greek Yogurt|Rooibos|Swiss Water/i.test(String(f.tasting_notes||'')))
   e.push('borrowed_adjacent_product_or_decaf_sensory');
 }else{
  if(f.process!=='Washed'||!String(f.producer||'').includes('Las Brisas Microfarm')||
     !String(f.variety||'').includes('Centroamericano'))
   e.push('own_processing_producer_or_variety_missing');
  if(!/Jinotega|Nicaragua/i.test(String(f.origin||''))||!/13[0-9]{2}/.test(String(f.elevation_m||'')))
   e.push('selected_origin_or_elevation_missing');
  if(/pomegranate|dried cherry|Cold Brew/i.test(String(f.tasting_notes||'')))
   e.push('borrowed_Snowy_Elk_or_brew_sensory');
 }
 errors.push(...e.map(s=>'#'+row.n+':'+s));
 products.push({number:row.n,source_url:row.url,selected_h1:heads,
  raw_sha256:raw.length?hash(raw):null,raw_bytes:raw.length,fields:f,
  conflicts:p.conflicts||[],passed:e.length===0,errors:e});
}
const report={passed:errors.length===0,errors,checkout_sha:checkout,
 original603_individual_manual_certification_complete:false,production_operations:0,products};
writeFileSync(join(dir,'r220-original339-340-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R220 selected source and parser] '+JSON.stringify(report).slice(0,20000));
if(errors.length)throw Error('r220_exact_current_source_not_verified:'+errors.join(','));
