#!/usr/bin/env node
// Issue #33 R431: only original603 #354; source facts are not universal certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const url='https://staccatoroasters.com/products/honduras-elvin-suazo-natural-coffee';
const name='Honduras Elvin Suazo Coffee Beans';
const digest=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s??'').replace(/&(?:amp|#0*38);/giu,'&').replace(/&(?:nbsp|#0*160);/giu,' ')
 .normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const selectedText=html=>productMarkup(html).replace(/<[^>]*>/gu,' ');
export function selectedR431Failures(number,selected,fields={}){
 if(number!==354)return ['wrong_original603_coffee'];
 const t=norm(selected),f=k=>norm(fields[k]),errors=[],has=x=>t.includes(norm(x));
 if(f('name')!==norm(name)||!has(name))errors.push('selected_h1_or_name_changed');
 for(const x of ['Elvin Suazo','La Paz','Honduras','Light Roast','Natural Process',
  'Finca Rancho Escondido','This particular lot is composed of IHCAFE 90',
  'Approximately 1,600 MASL','Bright Citrus','Subtle Blueberry','Sweet Finish'])
  if(!has(x))errors.push('current_selected_literal_missing_'+norm(x).replace(/ /gu,'_'));
 if(!f('roaster').includes('staccato roasters'))errors.push('wrong_roaster_identity');
 if(!f('origin').includes('la paz')||!f('origin').includes('honduras'))
  errors.push('selected_origin_missing_or_borrowed');
 if(!f('producer').includes('elvin suazo'))errors.push('selected_grower_missing_or_borrowed');
 if(f('process')!=='natural')errors.push('selected_green_process_not_natural');
 if(f('roast_level')!=='light')errors.push('selected_light_roast_missing');
 if(!f('elevation_m').includes('1600'))errors.push('selected_elevation_missing');
 if(f('variety')!=='ihcafe 90')
  errors.push('this_lot_ihcafe90_not_farmwide_bourbon_pacas_or_other_varieties');
 for(const x of ['citrus','blueberry','sweet finish'])
  if(!f('tasting_notes').includes(norm(x)))errors.push('selected_tasting_list_missing_'+norm(x).replace(/ /gu,'_'));
 for(const x of ['pineapple','v60','banana','lemon tree','red bourbon','yellow bourbon','pacas'])
  if(f('tasting_notes').includes(norm(x)))errors.push('anecdote_farmwide_or_brew_text_leaked_into_tasting_list');
 if(f('release_label'))errors.push('recurring_harvest_months_not_unique_release_or_lot');
 if(fields.decaffeination_method)errors.push('unpublished_decaf_method_invented');
 if(fields.farm&&norm(fields.farm)!=='finca rancho escondido')errors.push('wrong_selected_farm');
 return errors;
}
if(process.env.DIC_ISSUE33_R431_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,sha=process.env.DIC_EXPECTED_SHA;
 if(!dir||!/^[a-f0-9]{40}$/u.test(sha||''))throw Error('exact_source_sha_and_artifact_directory_required');
 const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const failures=[],proof=[];const require=(condition,label)=>{if(!condition)failures.push(label)};
 require(report.source_sha===sha,'source_sha_not_exact');
 require(JSON.stringify(report.case_numbers)==='[354]'&&report.records?.length===1,'not_exact_frozen354');
 require(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_csv_drift');
 require(report.original_corpus_modified===false&&report.manual_certified===0&&report.production_operations===0,
  'forbidden_original_or_provider_mutation');
 const r=report.records?.[0];
 require(r?.number===354&&r?.official_url===url&&r?.final_url?.replace(/\/$/u,'')===url,
  'selected_original_url_identity_changed');
 require(r?.status==='FETCHED'&&r?.parser_ok===true&&r?.selected_heading_identity_verified===true&&
  r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,
  'official_source_h1_parser_unsaved_ui_not_verified');
 let html=null;try{html=readFileSync(join(dir,'case-354.html'),'utf8')}
 catch{failures.push('actual_first_party_raw_html_missing')}
 if(html!==null){
  const hash=digest(html),p=extractPublicCoffeeFacts(html,{source_url:r?.final_url||url});
  require(hash===r?.html_sha256,'raw_html_hash_mismatch');
  require(p?.ok===true&&norm(p?.fields?.name)===norm(name),'current_parser_selected_identity_changed');
  for(const k of ['name','roaster','origin','producer','process','variety','roast_level',
   'tasting_notes','elevation_m','decaffeination_method','release_label'])
   require(String(p?.fields?.[k]??'')===String(r?.current_fields?.[k]??''),'raw_parser_evidence_mismatch_'+k);
  for(const error of selectedR431Failures(354,selectedText(html),r?.current_fields||{}))failures.push(error);
  require(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,
   'v60_brew_anecdote_or_filter_recipe_leaked_into_espresso');
  proof.push({number:354,source_sha:sha,official_url:url,html_sha256:hash,
   html_bytes:Buffer.byteLength(html),selected_h1:r?.selected_h1,fields:r?.current_fields,
   conflicts:r?.conflicts||[],unsaved_add_coffee:r?.add_coffee_ui_rendered===true,
   source_review:r?.source_review_rendered===true});
 }
 const result={source_sha:sha,case_numbers:[354],manual_certified:0,provider_writes:0,failures,proof};
 writeFileSync(join(dir,'r431-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC ISSUE33 R431 SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
