#!/usr/bin/env node
// Issue #33 R433: independent exact selected-source proof for three original Due South coffees only.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const specs={
 103:{slug:'brazil-paubrasil',name:'Brazil | Cerrado Mineiro (formerly Paubrasil)',
  origin:['cerrado mineiro','brazil'],producer:'Various Producers',process:'Natural',
  variety:'Various',elevation:1100,notes:['Cocoa Nibs','Toasted Almond','Smooth'],
  own:['Tasting Notes','Producer','Cerrado Mineiro','Various Producers','Natural']},
 104:{slug:'colombia-aponte-reserve',name:'Colombia Aponte Reserve',
  origin:['narino','colombia'],producer:'Inga Reserve',process:'Washed',
  variety:'Caturra',elevation:2050,notes:['Citrus','Red Apple','Cane Sugar'],
  own:['Tasting Notes','Producer','Inga Reserve','Washed','Caturra']},
 105:{slug:'selva-negra-nicaragua',name:'Selva Negra | Nicaragua',
  origin:['matagalpa','nicaragua'],producer:'The Kuhl family',process:'Washed',
  variety:'Caturra',elevation:1220,notes:['Red Apple','Citrus','Praline'],
  own:['Tasting Notes','Producer','Matagalpa','Caturra','Washed']}
};
const hash=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s??'').replace(/&(?:amp|#0*38);/giu,'&')
 .replace(/&(?:nbsp|#0*160);/giu,' ')
 .normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[^a-z0-9]+/gu,' ').trim();
export function selectedR433Failures(num,selected,fields={}){
 const s=specs[num];if(!s)return ['unknown_original603_case'];
 const text=norm(selected),f=k=>norm(fields[k]),fail=[],has=v=>text.includes(norm(v));
 if(f('name')!==norm(s.name)||!has(s.name))fail.push('wrong_selected_product_identity');
 if(!f('roaster').includes('due south coffee roasters'))fail.push('wrong_selected_roaster');
 for(const literal of s.own)if(!has(literal))
  fail.push('selected_direct_literal_missing_'+norm(literal).replace(/ /gu,'_'));
 for(const part of s.origin)if(!f('origin').includes(part))
  fail.push('wrong_or_missing_selected_origin_'+part);
 if(num!==103&&f('producer')!==norm(s.producer))fail.push('producer_collective_or_family_misattributed');
 if(f('process')!==norm(s.process))fail.push('wrong_green_processing_or_water_saving_conflation');
 if(f('variety')!==norm(s.variety))fail.push('wrong_selected_variety');
 if(!String(fields.elevation_m??'').replace(/[^0-9]/gu,'').includes(String(s.elevation)))
  fail.push('selected_elevation_missing_or_borrowed');
 for(const note of s.notes)if(!f('tasting_notes').includes(norm(note)))
  fail.push('missing_selected_tasting_note_'+norm(note).replace(/ /gu,'_'));
 for(const alien of ['year round','water saving','water process','other coffee','coffee subscription'])
  if(f('tasting_notes').includes(alien))fail.push('other_context_leaked_into_tasting');
 if(f('release_label'))fail.push('historical_year_or_year_round_as_release');
 if(fields.decaffeination_method)fail.push('water_saving_or_unpublished_decaf_invented');
 if(fields.roast_level)fail.push('unpublished_roast_assigned_without_current_direct_source');
 if(num===103&&fields.producer)fail.push('fabricated_single_brazil_grower');
 if(num===104&&f('producer')!=='inga reserve')fail.push('fabricated_individual_aponte_grower');
 if(num===105&&f('process')!=='washed')fail.push('farm_water_conservation_misread_as_process');
 return [...new Set(fail)];
}
if(process.env.DIC_ISSUE33_R433_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,sha=process.env.DIC_EXPECTED_SHA;
 if(!dir||!/^[a-f0-9]{40}$/u.test(sha||''))throw Error('source_sha_and_artifact_dir_required');
 const failures=[],proof=[];let report={};
 try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
 catch{failures.push('required_official_runner_evidence_report_missing')}
 const req=(ok,msg)=>{if(!ok)failures.push(msg)};
 req(report.source_sha===sha,'source_sha_not_exact');
 req(JSON.stringify(report.case_numbers)==='[103,104,105]'&&report.records?.length===3,'not_exact_original603_subset');
 req(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_csv_mutated');
 req(report.original_corpus_modified===false&&report.manual_certified===0&&report.production_operations===0,'source_or_provider_side_effect');
 for(const num of [103,104,105]){
  const s=specs[num],url='https://duesouthcoffee.com/products/'+s.slug;
  const r=report.records?.find(x=>x.number===num);
  req(!!r&&r.official_url===url&&r.final_url?.replace(/\/$/u,'')===url,'original_url_or_product_changed_'+num);
  req(r?.status==='FETCHED'&&r?.parser_ok===true&&r?.selected_heading_identity_verified===true&&
   r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,'official_html_parser_unsaved_ui_unverified_'+num);
  let html=null;try{html=readFileSync(join(dir,'case-'+num+'.html'),'utf8')}
  catch{failures.push('required_official_raw_html_missing_'+num)}
  if(html===null)continue;
  const p=extractPublicCoffeeFacts(html,{source_url:r?.final_url||url}),digest=hash(html);
  req(digest===r?.html_sha256,'actual_raw_html_digest_mismatch_'+num);
  req(p?.ok===true&&norm(p.fields?.name)===norm(s.name),'actual_parser_chosen_product_changed_'+num);
  for(const key of ['name','roaster','origin','producer','process','variety','elevation_m',
    'tasting_notes','roast_level','release_label','decaffeination_method']){
   req(String(p?.fields?.[key]??'')===String(r?.current_fields?.[key]??''),'parser_evidence_field_mismatch_'+num+'_'+key);
  }
  failures.push(...selectedR433Failures(num,productMarkup(html).replace(/<[^>]*>/gu,' '),r?.current_fields)
   .map(x=>'original'+num+'_'+x));
  req(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,'unrelated_brew_recipe_leak_'+num);
  proof.push({number:num,source_sha:sha,url,raw_html_sha256:digest,html_bytes:Buffer.byteLength(html),
   selected_h1:r?.selected_h1,parser_fields:r?.current_fields,conflicts:r?.conflicts||[],
   add_coffee_unsaved:r?.add_coffee_ui_rendered===true,source_review:r?.source_review_rendered===true});
 }
 const result={source_sha:sha,case_numbers:[103,104,105],manual_certified:0,provider_writes:0,failures,proof};
 writeFileSync(join(dir,'r433-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC ISSUE33 R433 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
