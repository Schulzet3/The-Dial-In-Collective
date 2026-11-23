#!/usr/bin/env node
// Issue #33 R434: EXACT original603 #345 South 17 Rosé & Roots, current official source only.
// Diagnostic afterproof is strict; synthetic fixtures alone do not certify a product.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const official='https://south17roasters.com/products/rose-roots';
const sha256=s=>createHash('sha256').update(s).digest('hex');
const norm=v=>String(v??'').replace(/&(?:amp|#0*38);/giu,'&')
 .replace(/&(?:nbsp|#0*160);/giu,' ')
 .normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function selectedR434Failures(selected,fields={}){
 const s=norm(selected),f=k=>norm(fields[k]),fail=[],has=t=>s.includes(norm(t));
 if(!has('Rosé & Roots')||f('name')!==norm('Rosé & Roots'))fail.push('wrong_or_recycled_selected_product');
 if(f('roaster')!==norm('South 17 Roasters'))fail.push('wrong_roaster_or_shared_catalog');
 for(const own of ['72-hour natural process','Honduras','Tres Pinos','light roasted','strawberry','rose','strawberry jam','chocolate','Pink Bucket Series'])
  if(!has(own))fail.push('selected_product_direct_literal_missing_'+norm(own).replace(/ /gu,'_'));
 if(!f('origin').includes('honduras')||!f('origin').includes('tres pinos'))fail.push('selected_honduras_tres_pinos_origin_missing');
 if(f('process')!=='natural')fail.push('selected_natural_processing_wrong');
 if(f('roast_level')!=='light')fail.push('direct_light_roast_missing_or_swapped');
 for(const note of ['strawberry jam','chocolate'])
  if(!f('tasting_notes').includes(note))fail.push('direct_selected_taste_missing_'+note.replace(/ /gu,'_'));
 for(const other of ['dark raine','ambition','sumatra mandheling','sweet tobacco','citrus malt pine'])
  if(f('tasting_notes').includes(other))fail.push('neighbor_product_flavor_leak_'+other.replace(/ /gu,'_'));
 if(fields.producer)fail.push('female_roaster_wrongly_assigned_as_green_producer');
 if(fields.decaffeination_method)fail.push('invented_decaf_from_72_hour_fermentation');
 if(fields.variety||fields.elevation_m)fail.push('unpublished_cultivar_or_elevation_invented');
 if(fields.roaster_recipe?.dose_g||fields.roaster_recipe?.yield_g)fail.push('unpublished_espresso_recipe_invented');
 if(fields.release_label&&f('release_label')!==norm('Pink Bucket Series'))fail.push('fabricated_harvest_or_series_release');
 if(f('release_label').match(/202[0-9]|72 hour/))fail.push('fermentation_duration_as_harvest');
 return [...new Set(fail)];
}
if(process.env.DIC_ISSUE33_R434_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,expected=process.env.DIC_EXPECTED_SHA;
 if(!dir||!/^[a-f0-9]{40}$/u.test(expected||''))throw Error('source_sha_and_artifact_dir_required');
 const errors=[],proof=[];let report={};
 try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
 catch{errors.push('hard_required_first_party_report_missing')}
 const need=(test,id)=>{if(!test)errors.push(id)};
 need(report.source_sha===expected,'runner_source_commit_mismatch');
 need(JSON.stringify(report.case_numbers)==='[345]'&&report.records?.length===1,'not_exact_original345');
 need(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_oracle_csv_changed');
 need(report.original_corpus_modified===false&&report.manual_certified===0&&report.production_operations===0,'original_or_production_mutation');
 const r=report.records?.find(x=>x.number===345);
 need(r?.official_url===official&&r?.final_url?.replace(/\/$/u,'')===official,'official_exact_selected_url_missing');
 need(r?.status==='FETCHED'&&r?.parser_ok===true&&r?.selected_heading_identity_verified===true&&
  r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,'required_first_party_h1_parser_or_unsaved_ui_unverified');
 let html=null;try{html=readFileSync(join(dir,'case-345.html'),'utf8')}
 catch{errors.push('required_raw_first_party_selected_html_missing')}
 if(html!==null){
  const [{productMarkup},{extractPublicCoffeeFacts}]=await Promise.all([
   import('../../src/server/coffee-product-scope.mjs'),
   import('../../src/server/coffee-page-metadata.mjs')]);
  const parsed=extractPublicCoffeeFacts(html,{source_url:r?.final_url||official});
  const digest=sha256(html);
  need(digest===r?.html_sha256,'raw_html_sha256_mismatch');
  need(parsed?.ok===true,'current_live_parser_not_ok');
  for(const key of ['name','roaster','origin','producer','process','variety','elevation_m','tasting_notes','roast_level','release_label','decaffeination_method'])
   need(String(parsed?.fields?.[key]??'')===String(r?.current_fields?.[key]??''),'raw_parser_field_parity_'+key);
  errors.push(...selectedR434Failures(productMarkup(html).replace(/<[^>]*>/gu,' '),r?.current_fields).map(x=>'original345_'+x));
  need(!parsed?.roaster_recipe?.dose_g&&!parsed?.roaster_recipe?.yield_g,'unpublished_espresso_formula');
  proof.push({number:345,official,source_sha:expected,html_sha256:digest,html_bytes:Buffer.byteLength(html),
   selected_h1:r?.selected_h1,current_fields:r?.current_fields,conflicts:r?.conflicts||[],
   add_coffee_unsaved:r?.add_coffee_ui_rendered===true,source_review:r?.source_review_rendered===true});
 }
 const result={source_sha:expected,case_numbers:[345],manual_certified:0,provider_writes:0,failures:errors,proof};
 writeFileSync(join(dir,'r434-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC ISSUE33 R434 OFFICIAL SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
