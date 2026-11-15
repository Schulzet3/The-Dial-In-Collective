#!/usr/bin/env node
// R234: original603 #376-378 current exact selected official raw-HTML afterproof.
// No corpus-oracle regrading or global 603 manual-certification claim.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_focused_original_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:376,name:'Meseta de Popayan DECAF - Colombia',
  url:'https://tenfoldcoffee.com/products/meseta-de-popayan-decaf-colombia',
  country:'Colombia',note:'Grapefruit',other:'Yuzu'},
 {n:377,name:'San Lorenzo X',
  url:'https://tenfoldcoffee.com/products/san-lorenzo-x',
  country:'Guatemala',note:'Yuzu',other:'Grapefruit'},
 {n:378,name:'Bulaago Natural',
  url:'https://tenfoldcoffee.com/products/umoja-pb-copy',
  country:'Uganda',note:'Apricot',other:'Bergamont'}
];
const errors=[],records=[],has=(s,v)=>String(s||'').toLowerCase().includes(String(v).toLowerCase());
if(head!==process.env.DIC_R234_HEAD)errors.push('wrong_exact_source_commit');
if(JSON.stringify(summary.case_numbers)!=='[376,377,378]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('protected_original603_or_target_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)errors.push('invalid_scope_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},bad=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+c.n+'.html'))}catch{bad.push('missing_raw_selected_html')}
 const hash=createHash('sha256').update(bytes).digest('hex');
 const raw=bytes.toString('utf8'),scope=productMarkup(raw);
 const h1=selectedProductHeadings(scope);
 const p=bytes.length?extractPublicCoffeeFacts(raw,{source_url:row.final_url||c.url}):{};
 const f=p.fields||{},conflicts=p.conflicts||[],facts=p.source_facts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  bad.push('official_original_current_source_unavailable');
 if(bytes.length<1000||bytes.length!==row.html_bytes||hash!==row.html_sha256)
  bad.push('raw_html_bytes_hash_mismatch');
 if(h1.length!==1||h1[0].toLowerCase()!==c.name.toLowerCase()||
  f.name?.toLowerCase()!==c.name.toLowerCase()||
  row.selected_heading_identity_verified!==true)
  bad.push('current_exact_selected_product_identity_unproven');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  bad.push('actual_Add_Coffee_or_Source_Review_missing');
 if(!has(f.origin,c.country))bad.push('current_country_missing');
 if(!has(f.tasting_notes,c.note)&&!conflicts.includes('tasting_notes'))
  bad.push('current_selected_direct_tasting_notes_missing_without_review');
 if(has(f.tasting_notes,c.other))bad.push('sibling_tasting_notes_contamination');
 if(c.n===376){
  if(!has(scope,'Ethyl Acetate Decaffeination'))bad.push('selected_EA_source_fact_missing');
  if(f.decaffeination_method!=='Sugar Process')bad.push('direct_selected_EA_method_not_autofilled');
  if(f.process)bad.push('unstated_green_process_inferred');
  if(!has(scope,'ESpresso')||!has(scope,'18g dose')||!has(scope,'40g yield')||
     !has(scope,'26 seconds'))bad.push('current_selected_espresso_recipe_source_missing');
  if(p.roaster_recipe?.dose_g!==18||p.roaster_recipe?.yield_g!==40||
     p.roaster_recipe?.time_s_min!==26||p.roaster_recipe?.time_s_max!==26)
    bad.push('current_selected_espresso_recipe_not_preserved');
 }
 if(c.n===377){
  if(!facts.some(x=>x.field==='release_label'&&/^lot$/iu.test(x.label||'')&&has(x.value,'San Lorenzo X')))bad.push('selected_unique_lot_source_missing');
  if(f.process!=='Washed')bad.push('direct_selected_Washed_missing');
  if(!has(f.producer,'Valdés'))bad.push('actual_selected_producer_not_preserved');
  if(!has(f.release_label,'San Lorenzo X'))bad.push('explicit_selected_named_lot_missing');
  if(/november|april/iu.test(f.release_label||''))bad.push('recurring_harvest_window_as_lot');
  if(f.decaffeination_method)bad.push('borrowed_sibling_decaf_method');
 }
 if(c.n===378){
  if(f.process!=='Natural')bad.push('actual_selected_Natural_missing');
  if(has(f.name,'Umoja'))bad.push('recycled_sku_slug_as_coffee_identity');
  if(f.roast_level==='Light')bad.push('ambiguous_tasting_Light_promoted_to_roast');
  if(/2024/iu.test(f.release_label||''))bad.push('208_producer_history_as_unique_lot');
  if(has(f.producer,'Zukuka Bora'))bad.push('export_partner_as_grower');
  if(f.decaffeination_method)bad.push('borrowed_sibling_decaf_method');
 }
 errors.push(...bad.map(x=>c.n+':'+x));
 records.push({number:c.n,url:c.url,html_bytes:bytes.length,html_sha256:hash,
  selected_h1:h1,fields:f,roaster_recipe:p.roaster_recipe||null,
  conflicts,source_facts:facts.filter(x=>
    ['decaffeination_method','release_label','process','roast_level'].includes(x.field)).slice(0,16),
  errors:bad});
}
const report={exact_git_sha:head,passed:errors.length===0,
 positive_selected_cases:errors.length===0?[376,377,378]:[],
 full_original603_certified:false,production_operations:0,records,errors};
writeFileSync(join(dir,'r234-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R234 CURRENT SELECTED SOURCE AFTERPROOF] '+JSON.stringify(report).slice(0,29000));
if(errors.length)throw Error(errors.join(','));
