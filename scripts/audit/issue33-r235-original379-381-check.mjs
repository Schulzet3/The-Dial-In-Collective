#!/usr/bin/env node
// R235: selected current original #379-381 Thrive source-bound afterproof.
// Preserve the original frozen603 oracle, scorer and 603-row CSV.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_bounded_source_directory');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:379,name:'AAPOSA COOPERATIVE',url:'https://thrivefarmers.com/products/aaposa-cooperative',
  note:'Toffee',other:'Syrupy'},
 {n:380,name:'Horizon Organic',url:'https://thrivefarmers.com/products/horizon-organic',
  note:'Toasted Cereal',other:'Juicy Peach'},
 {n:381,name:'Layover Organic Decaf',url:'https://thrivefarmers.com/products/layover-organic-decaf',
  note:'Dark Chocolate',other:'Juicy Peach'}
];
const has=(text,needle)=>String(text||'').toLocaleLowerCase().includes(String(needle).toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R235_HEAD)failures.push('wrong_exact_git_source');
if(JSON.stringify(summary.case_numbers)!=='[379,380,381]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('immutable_original603_or_targets_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('invalid_certification_or_production_claim');
for(const c of cases){
 const row=summary.records.find(r=>r.number===c.n)||{},errors=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'))}catch{errors.push('raw_source_missing')}
 const hash=createHash('sha256').update(bytes).digest('hex');
 const selected=productMarkup(bytes.toString('utf8'));
 const headings=selectedProductHeadings(selected);
 const p=bytes.length?extractPublicCoffeeFacts(bytes.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_original_current_official_source_missing');
 if(bytes.length<1000||bytes.length!==row.html_bytes||hash!==row.html_sha256)
  errors.push('raw_source_hash_or_size_mismatch');
 if(headings.length!==1||headings[0].toLowerCase()!==c.name.toLowerCase()||
  String(f.name||'').toLowerCase()!==c.name.toLowerCase()||
  row.selected_heading_identity_verified!==true)
  errors.push('selected_H1_and_identity_not_proven');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_Add_Coffee_Source_Review_missing');
 if(!has(f.tasting_notes,c.note)&&!conflicts.includes('tasting_notes'))
  errors.push('own_selected_literal_tasting_missing_without_conflict_review');
 if(has(f.tasting_notes,c.other))errors.push('sibling_sensory_contamination');
 if(c.n===379){
  if(!has(f.origin,'Guatemala'))errors.push('selected_Guatemala_missing');
  if(f.process!=='Washed')errors.push('selected_AAPOSA_Washed_missing');
  if(f.decaffeination_method)errors.push('borrowed_decaf_from_sibling');
  if(has(f.producer,'Marta Solares'))errors.push('other_product_farmer_borrowed');
 }
 if(c.n===380){
  if(!has(f.origin,'Guatemala')||!has(f.origin,'Nicaragua'))
   errors.push('current_selected_two_country_blend_lost');
  if(f.roast_level!=='Medium')errors.push('explicit_selected_Medium_roast_lost');
  if(f.process!=='Washed')errors.push('selected_Washed_missing');
  if(has(f.producer,'Marta Solares')||has(f.producer,'La Esperanza'))
   errors.push('meet_farmer_bio_incorrectly_promoted_to_blend_producer');
  if(has(f.origin,'Concepcion Pinula')||has(f.origin,'Concepción Pinula'))
   errors.push('featured_farmer_bio_confused_with_blend_origin');
  if(f.decaffeination_method)errors.push('nondecaf_sibling_method_borrowed');
 }
 if(c.n===381){
  if(!has(selected,'Swiss Water Decaffeination Process'))
   errors.push('direct_selected_water_method_source_missing');
  if(!has(f.origin,'Nicaragua'))errors.push('selected_Nicaragua_missing');
  if(f.process!=='Washed')errors.push('selected_green_Washed_missing');
  if(f.roast_level!=='Medium')errors.push('selected_Medium_missing');
  if(f.decaffeination_method!=='Water Process')
   errors.push('direct_selected_water_decaf_method_missing');
  if(has(f.producer,'Marta Solares'))errors.push('unrelated_farmer_borrowed');
 }
 failures.push(...errors.map(s=>c.n+':'+s));
 records.push({number:c.n,url:c.url,html_bytes:bytes.length,sha256:hash,
  selected_h1:headings,parser_ok:p.ok===true,fields:f,
  conflicts,errors});
}
const report={exact_git_sha:head,passed:failures.length===0,
 current_selected_positive_cases:failures.length===0?[379,380,381]:[],
 original603_all_semantically_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r235-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R235 CURRENT SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
