#!/usr/bin/env node
// Issue #33 R42: bounded official-current selected #510/#514 semantic post-code guard.
// This reads ONLY credential-free public runner captures and never certifies 603 rows.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=data=>createHash('sha256').update(data).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r42_missing_public_capture_directory');
const file=join(resolve(dir),'focused-current-evidence.json');
const reportBytes=readFileSync(file);
const report=JSON.parse(reportBytes.toString('utf8'));
const cases=[510,514];
const reasons=[];
const requireThat=(ok,reason)=>{if(!ok)reasons.push(reason);};
requireThat(Array.isArray(report.case_numbers)&&JSON.stringify(report.case_numbers)===JSON.stringify(cases),'exact_two_original_cases_required');
requireThat(report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,'public_nonmutating_source_scope_required');
requireThat(report.manual_certified===0,'no_automatic_603_certification');
requireThat(report.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
requireThat(report.fetched===2&&report.parsed===2,'two_current_selected_products_not_fetched_parsed');
requireThat(report.records?.length===2,'source_report_records_missing');
const observations=[];
for(const number of cases){
 const matches=(report.records||[]).filter(x=>x.number===number);
 requireThat(matches.length===1,'duplicate_or_missing_record_'+number);
 const record=matches[0];
 if(!record)continue;
 let html='';
 try{
  const bytes=readFileSync(join(resolve(dir),'case-'+number+'.html'));
  html=bytes.toString('utf8');
  requireThat(hash(bytes)===record.html_sha256,'raw_html_hash_mismatch_'+number);
  requireThat(record.html_bytes===bytes.length,'raw_html_length_mismatch_'+number);
 }catch(error){requireThat(false,'raw_html_not_saved_'+number+'_'+String(error?.code||'error'));}
 requireThat(record.status==='FETCHED'&&record.parser_ok===true,'current_parser_failed_'+number);
 requireThat(record.selected_heading_identity_verified===true,'selected_purchasable_identity_not_confirmed_'+number);
 requireThat(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_or_source_review_missing_'+number);
 const fields=record.current_fields||{};
 const conflicts=record.conflicts||[];
 if(number===510){
  requireThat(fields.name==='Wobegon Medium Roast','510_reused_slug_wrong_selected_identity');
  requireThat(fields.origin==='Tanzania','510_country_contains_non_geographic_peaberry_blend');
  requireThat(fields.process==='Washed','510_selected_washed_processing_lost');
  requireThat(fields.roast_level==='Medium','510_selected_medium_roast_not_extracted');
  requireThat(/Peaberry Southern Blend/i.test(html)&&/Tanzania/i.test(html),'510_current_country_caption_unobserved');
  requireThat(['nutty','cocoa','spices','citrus'].every(v=>String(fields.tasting_notes||'').toLowerCase().includes(v)),
   '510_source_published_selected_notes_missing');
  requireThat(!conflicts.includes('origin'),'510_unresolved_country_conflict');
 }else{
  requireThat(fields.name==='Bellevue - Decaf Blend','514_wrong_selected_coffee_identity');
  requireThat(fields.origin==='Colombia','514_selected_country_lost');
  requireThat(fields.decaffeination_method==='Water Process','514_selected_mountain_water_treatment_missing');
  requireThat(!fields.process,'514_false_green_processing_from_decaffeination');
  requireThat(/mountain\s+water\s+decaf/i.test(html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')),
   '514_current_selected_named_mountain_water_statement_not_visible');
  requireThat((record.source_facts||[]).some(f=>f.field==='decaffeination_method'&&/water/i.test(f.value||'')),
   '514_decaffeination_source_fact_missing_from_review');
  requireThat(!conflicts.includes('decaffeination_method'),'514_unresolved_method_conflict');
 }
 observations.push({number,official_url:record.official_url,final_url:record.final_url,
  html_sha256:record.html_sha256,html_bytes:record.html_bytes,
  selected_h1:record.selected_h1,selected_identity:record.selected_heading_identity_verified,
  current_fields:fields,conflicts,add_coffee:record.add_coffee_ui_rendered,
  source_review:record.source_review_rendered});
}
const verdict={kind:'ISSUE33_R42_BOUNDED_OFFICIAL_510_514_VERIFICATION',
 source_sha:report.source_sha,source_csv_sha256:report.original603_register_sha256,
 current_report_sha256:hash(reportBytes),case_numbers:cases,
 passed:reasons.length===0,failures:reasons,
 observations,original603_fully_certified:false,production_operations:0};
writeFileSync(join(resolve(dir),'r42-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n','utf8');
console.log('[DIC33 R42 OFFICIAL SOURCE POSTCODE] '+JSON.stringify(verdict));
if(reasons.length)process.exitCode=1;
