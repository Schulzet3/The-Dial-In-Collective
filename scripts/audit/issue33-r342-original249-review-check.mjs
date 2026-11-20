#!/usr/bin/env node
// Issue #33 R342: bounded actual current selected #249 review-only roles.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r342';
const url='https://onyxcoffeelab.com/products/mexico-finca-santa-cruz-gesha';
const title='Mexico Finca Santa Cruz Gesha';
const hash=s=>createHash('sha256').update(s).digest('hex');
if(process.env.DIC_R342_VERIFY==='1'){
 const errors=[],need=(value,key)=>{if(!value)errors.push(key);};
 let report={};try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));}catch{errors.push('missing_focused_evidence');}
 let bytes;try{bytes=readFileSync(join(dir,'case-249.html'));}catch{errors.push('missing_real_official_html');}
 const html=bytes?.toString('utf8')||'',rec=report?.records?.[0]||{},facts=rec.source_facts||[],f=rec.current_fields||{};
 const same=(a,b)=>String(a||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===
  String(b||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 need(JSON.stringify(report.case_numbers)==='[249]'&&report.records?.length===1,'one_original249_only');
 need(requiredFocusedSourceFailures([249],report.records||[]).length===0,'guarded_fetched_identity_parser_UI');
 need(rec.status==='FETCHED'&&rec.official_url===url&&!rec.alternate_url_attempted,'registered_first_party_HTTPS_only');
 need(bytes?.length>50000&&rec.html_bytes===bytes?.length&&rec.html_sha256===hash(bytes||''),'official_raw_HTML_SHA');
 need(same(rec.archived_coffee,title)&&selectedProductHeadings(productMarkup(html)).length===1&&
  same(selectedProductHeadings(productMarkup(html))[0],title),'exact_selected_H1');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R342_HEAD_SHA &&
  report.source_sha===process.env.DIC_R342_EVENT_SHA,'exact_event_and_checkout_SHA');
 need(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()===
  '3e0d3036ea727de091f304f538c6de2dfcaa10d6','frozen603_unchanged');
 const farm=facts.find(row=>row.label==='F i n c a'&&row.value==='S a n t a');
 const harvest=facts.find(row=>row.label==='Harvest'&&row.value==='Mexico'&&row.section==='Harvest');
 need(!!farm&&!!harvest,'real_selected_wrong_role_rows_still_literal');
 need(farm&&!farm.field&&harvest&&!harvest.field,'animated_finca_and_educational_harvest_untyped');
 need(f.producer?.includes('Argüello')&&f.process==='Washed'&&f.roast_level==='Light'&&
  !/s a n t a/i.test(f.producer)&&f.release_label!=='Mexico','selected_canonical_intact');
 need(report.manual_certified===0&&report.original_corpus_modified===false&&report.production_operations===0,
  'no_global_certification_or_prod_operation');
 const parsed=extractPublicCoffeeFacts(html,{source_url:rec.final_url||url});
 need(parsed?.ok===true&&parsed.fields?.process==='Washed'&&parsed.fields?.producer?.includes('Argüello'),
  'actual_current_parser_and_producer');
 need(!!parsed?.ok&&coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...parsed,source_url:rec.final_url||url})?.type==='coffee_source_review',
  'AddCoffee_and_SourceReview_without_save');
 const out={passed:errors.length===0,errors,original603_case:249,checkout_sha:process.env.DIC_R342_HEAD_SHA,
  event_sha:process.env.DIC_R342_EVENT_SHA,selected_h1:rec.selected_h1,html_bytes:bytes?.length||0,
  html_sha256:bytes?hash(bytes):null,raw_farm:farm||null,raw_harvest:harvest||null,
  actual_canonical:{producer:f.producer,roast_level:f.roast_level,process:f.process,release_label:f.release_label||''},
  manual_semantic_certified:false,full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r342-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R342] '+JSON.stringify(out));if(errors.length)process.exitCode=1;
}
