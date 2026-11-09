#!/usr/bin/env node
// Read-only current selected source afterproof, no 603 certification or production operation.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R53_EXACT_CASES,selectedR53Failures} from './issue33-r53-selected-vail-contract.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('focused_evidence_dir_required');
const root=resolve(dir),raw=readFileSync(join(root,'focused-current-evidence.json'));
const record=JSON.parse(raw.toString('utf8')), failures=[],checks=[];
const check=(condition,key)=>{if(!condition)failures.push(key);};
check(JSON.stringify(record.case_numbers)==='[590,591]','wrong_original603_subset');
check(record.source_sha===process.env.GITHUB_SHA,'not_exact_source_commit');
check(record.manual_certified===0&&record.production_operations===0&&record.real_auth===false&&record.original_corpus_modified===false,'unsupported_certification_or_unsafe_operation');
check(record.records?.length===2,'missing_source_records');
for(const spec of R53_EXACT_CASES){
 const r=record.records?.find(x=>x.number===spec.number)||{};
 failures.push(...selectedR53Failures(r,spec));
 let html='',ok=false,bytes=0;
 try{
  const b=readFileSync(join(root,'case-'+spec.number+'.html'));
  html=b.toString('utf8');bytes=b.length;
  ok=digest(b)===r.html_sha256&&bytes===r.html_bytes;
 }catch{}
 check(ok,'raw_official_html_digest_or_length_'+spec.number);
 const selected=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ');
 const observed={
  selected_h1:r.selected_h1||[],source_status:r.status||'MISSING',
  source_url:r.final_url||null,parser_ok:r.parser_ok===true,
  current_fields:r.current_fields||{},conflicts:r.conflicts||[],
  html_sha256:r.html_sha256||null,html_bytes:bytes,raw_hash_ok:ok,
  add_coffee:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true,
  selected_honey_label:/Process\s*:\s*Honey\b/iu.test(selected),
  selected_natural_label:/Process\s*:\s*Full natural\b/iu.test(selected),
  selected_light_roast:/\bLIGHT ROAST\b/iu.test(selected),
  selected_swiss_water:/Swiss Water Process/iu.test(selected)
 };
 // Only exact current selected merchant claims are gating; no archived/oracle guess.
 if(spec.number===590){
  check(observed.selected_honey_label,'missing_current_selected_honey_fact_590');
  if(observed.selected_honey_label)check(r.current_fields?.process==='Honey','current_honey_process_not_retained_590');
 }
 if(spec.number===591){
  check(observed.selected_natural_label,'missing_current_selected_natural_fact_591');
  check(observed.selected_light_roast,'missing_current_selected_light_roast_591');
  check(observed.selected_swiss_water,'missing_current_selected_swiss_water_decaf_591');
  if(observed.selected_natural_label)check(r.current_fields?.process==='Natural','selected_natural_processing_not_retained_591');
  if(observed.selected_light_roast)check(r.current_fields?.roast_level==='Light','selected_light_roast_not_retained_591');
 }
 checks.push({number:spec.number,...observed});
}
const result={kind:'ISSUE33_R53_CURRENT_VAIL_SELECTED_NOT_603_CERTIFICATION',
 source_sha:record.source_sha,source_csv_sha256:record.original603_register_sha256,
 evidence_report_sha256:digest(raw),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,checks};
writeFileSync(join(root,'r53-590-591-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R53 SELECTED SOURCE VERDICT] '+JSON.stringify(result));
if(failures.length)process.exitCode=1;
