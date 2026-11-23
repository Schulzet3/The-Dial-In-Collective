#!/usr/bin/env node
// #33 R429 original603 #320/#341: direct exact selected seller facts only.
// This does NOT certify every coffee, authorize saving, or approve production.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:amp|#0*38|#x0*26);/giu,'&').replace(/&nbsp;/giu,' ')
 .replace(/[^a-z0-9]+/gu,' ').trim();
const selectedText=html=>productMarkup(html).replace(/<[^>]*>/gu,' ');
const products={
 320:{name:'Costa Rica Sonora Honey',url:'https://shop.ohenryscoffee.com/products/costa-rica-sonora-honey'},
 341:{name:'Qunqana Honey',url:'https://sodality.coffee/products/qunqana-honey'}
};
export function selectedR429Failures(n,text,fields={},fallback=[]){
 const p=products[n];if(!p)return ['not_selected_original603_case'];
 const s=norm(text),f=norm(fields.tasting_notes),errors=[];
 const has=x=>s.includes(norm(x)),notes=x=>f.includes(norm(x));
 if(norm(fields.name)!==norm(p.name)||!has(p.name))
  errors.push('selected_name_or_heading_mismatch');
 if(n===320){
  for(const x of ['Hacienda Sonora','Central Valley','honey and natural process coffees',
    'cherry','chocolate','hazelnut','baking spice'])if(!has(x))
    errors.push('missing_selected_direct_literal_'+norm(x).replace(/ /gu,'_'));
  if(!norm(fields.origin).includes('central valley')||!norm(fields.origin).includes('costa rica'))
   errors.push('direct_selected_origin_omitted');
  for(const x of ['cherry','chocolate','hazelnut','baking spice'])if(!notes(x))
   errors.push('direct_selected_flavor_omitted_'+norm(x).replace(/ /gu,'_'));
  if(fields.process&&!['other unknown',''].includes(norm(fields.process)))
   errors.push('multi_method_blend_falsely_reduced_to_one_green_process');
  if(fields.roast_level&&!fallback.includes('roast_level'))
   errors.push('unpublished_selected_roast_from_old_or_unscoped_source');
  if(fields.producer&&/asefa dukamo|mulugeta dukamo/i.test(fields.producer))
   errors.push('other_coffee_washing_station_founder_leak');
  if(fields.variety||fields.elevation_m||fields.decaffeination_method||fields.release_label)
   errors.push('unpublished_selected_lot_or_specs');
 }else{
  for(const x of ['Margarita','Lemon','Lime','White Wine','Cooked Fruit','Toffee',
    'Multiple local small-holder farmers','Honey','Ethiopian Heirloom','Bensa','Sidama'])
   if(!has(x))errors.push('missing_selected_direct_literal_'+norm(x).replace(/ /gu,'_'));
  if(norm(fields.process)!=='honey')errors.push('direct_selected_honey_process_omitted_or_wrong');
  if(!norm(fields.producer).includes('multiple local small holder farmers'))
   errors.push('station_founders_instead_of_selected_growers');
  if(!norm(fields.variety).includes('ethiopian heirloom'))
   errors.push('direct_selected_variety_omitted');
  if(!norm(fields.origin).includes('bensa')||!norm(fields.origin).includes('ethiopia'))
   errors.push('direct_selected_geography_omitted');
  for(const x of ['Margarita','Lemon','Lime','White Wine','Cooked Fruit','Toffee'])
   if(!notes(x))errors.push('direct_selected_flavor_omitted_'+norm(x).replace(/ /gu,'_'));
  if(fields.roast_level&&!fallback.includes('roast_level'))
   errors.push('unpublished_selected_roast_invented');
  if(fields.decaffeination_method||fields.release_label)
   errors.push('unpublished_decaf_or_lot');
 }
 return errors;
}
if(process.env.DIC_ISSUE33_R429_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
 const sha=process.env.DIC_EXPECTED_SHA;
 if(!dir||!/^[0-9a-f]{40}$/u.test(sha||''))throw Error('exact_source_and_directory_required');
 const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const failures=[],proof=[];
 const check=(ok,msg)=>{if(!ok)failures.push(msg)};
 check(report.source_sha===sha,'checkout_source_sha_mismatch');
 check(JSON.stringify(report.case_numbers)==='[320,341]'&&report.records?.length===2,
  'not_exact_original320_341_pair');
 check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'immutable_original603_csv_changed');
 check(report.original_corpus_modified===false&&report.manual_certified===0&&
  report.production_operations===0,'original_corpus_or_provider_mutated');
 for(const n of [320,341]){
  const expected=products[n],r=report.records?.find(x=>x.number===n);
  if(!r){failures.push('missing_case_'+n);continue}
  check(r.official_url===expected.url&&r.final_url?.replace(/\/$/u,'')===expected.url,
   'wrong_official_selected_identity_'+n);
  check(r.status==='FETCHED'&&r.parser_ok===true&&
   r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&
   r.source_review_rendered===true,'required_current_parser_unsaved_ui_missing_'+n);
  let html;try{html=readFileSync(join(dir,'case-'+n+'.html'),'utf8')}
   catch{failures.push('missing_real_official_raw_html_'+n);continue}
  const digest=hash(html),p=extractPublicCoffeeFacts(html,{source_url:r.final_url||expected.url});
  check(r.html_sha256===digest,'actual_official_html_sha_mismatch_'+n);
  check(p?.ok===true&&norm(p.fields?.name)===norm(expected.name),
   'raw_html_current_parser_identity_mismatch_'+n);
  for(const key of ['name','roaster','origin','producer','process','variety',
   'roast_level','tasting_notes','elevation_m','decaffeination_method','release_label'])
   check(String(p?.fields?.[key]??'')===String(r.current_fields?.[key]??''),
    'raw_parser_report_field_parity_'+n+'_'+key);
  for(const reason of selectedR429Failures(n,selectedText(html),r.current_fields,
   r.seo_fallback_fields||[]))failures.push(n+'_'+reason);
  check(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,
   'filter_brew_profile_misclassified_as_espresso_recipe_'+n);
  if(n===341)check(!/asefa dukamo|mulugeta dukamo/iu.test(String(p?.fields?.producer||'')),
   'washing_station_founder_falsely_classified_as_coffee_farmer');
  proof.push({n,raw_html_sha256:digest,bytes:Buffer.byteLength(html),
   official_url:expected.url,fields:r.current_fields,conflicts:r.conflicts||[],
   selected_heading:r.selected_h1,add_coffee_unsaved:r.add_coffee_ui_rendered,
   source_review:r.source_review_rendered});
 }
 const result={source_sha:sha,cases:[320,341],manual_certified:0,
  provider_writes:0,failures,proof};
 writeFileSync(join(dir,'r429-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R429 SELECTED CURRENT AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
