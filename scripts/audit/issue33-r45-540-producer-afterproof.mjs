#!/usr/bin/env node
// Issue #33 R45: current exact selected #540 afterproof, not 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const directory=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!directory)throw Error('r45_exact_official_artifact_dir_required');
const dir=resolve(directory),hash=data=>createHash('sha256').update(data).digest('hex');
const reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(reportBytes.toString('utf8')),failures=[];
const check=(condition,reason)=>{if(!condition)failures.push(reason);};
check(JSON.stringify(report.case_numbers)==='[540]','exact_selected_case_only');
check(report.source_sha===process.env.GITHUB_SHA,'exact_source_SHA_required');
check(report.manual_certified===0&&report.production_operations===0&&report.original_corpus_modified===false&&report.real_auth===false,'no_frozen_member_or_production_operations');
check(report.fetched===1&&report.parsed===1&&report.records?.length===1,'official_current_fetch_parse_required');
const selected=report.records?.[0]||{},fields=selected.current_fields||{};
let html='',htmlBytes;
try{
 htmlBytes=readFileSync(join(dir,'case-540.html'));
 html=htmlBytes.toString('utf8');
 check(hash(htmlBytes)===selected.html_sha256&&htmlBytes.length===selected.html_bytes,'raw_selected_HTML_hash_length_mismatch');
}catch(e){check(false,'missing_current_HTML_'+String(e?.code||'error'));}
let finalHost='';
try{finalHost=new URL(selected.final_url).hostname;}catch{}
check(selected.status==='FETCHED'&&selected.parser_ok===true,'current_product_parser_failed');
check(finalHost==='www.radialcoffee.com','unexpected_redirect_or_host');
check(selected.selected_heading_identity_verified===true&&Array.isArray(selected.selected_h1)&&selected.selected_h1.includes('Colombia — Inza Decaf'),'selected_H1_identity_mismatch');
check(fields.name==='Colombia — Inza Decaf','recycled_Guatemala_slug_or_name_contamination');
check(/Inza/i.test(fields.origin||'')&&/Colombia/i.test(fields.origin||''),'current_selected_origin');
check(fields.process==='Washed'&&fields.roast_level==='Medium','direct_selected_process_and_roast');
check(/dark chocolate/i.test(fields.tasting_notes||'')&&/cherr/i.test(fields.tasting_notes||'')&&/raisin/i.test(fields.tasting_notes||''),'direct_selected_taste');
check(fields.producer==='collective of smallholder farms','current_group_credit_contains_clipped_location_or_unverified_person');
check(!fields.decaffeination_method,'unpublished_decaf_method_autofilled');
check(!selected.conflicts?.includes('producer'),'current_selected_producer_conflict');
check(selected.add_coffee_ui_rendered===true&&selected.source_review_rendered===true,'Add_Coffee_or_Source_Review_missing');
check(/collective of smallholder farms nestled in/i.test(html.replace(/<[^<>]{0,250}>/g,' ')),'chosen_current_source_literal_changed');
const verdict={kind:'ISSUE33_R45_CURRENT_SELECTED_540_OFFICIAL_AFTERPROOF',source_sha:report.source_sha,
 original603_csv_sha256:report.original603_register_sha256,report_sha256:hash(reportBytes),
 original_selected_title:selected.selected_h1,selected_html_sha256:selected.html_sha256,
 observed_fields:fields,matched_raw_current_description:/collective of smallholder farms nestled in/i.test(html),
 passed:failures.length===0,failures,manual_certified:0,original603_fully_certified:false,production_operations:0};
writeFileSync(join(dir,'r45-540-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R45 CURRENT SELECTED FACT AFTERPROOF] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
