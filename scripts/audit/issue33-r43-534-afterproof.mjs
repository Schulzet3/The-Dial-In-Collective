#!/usr/bin/env node
// Issue #33 R43: after-code, exact selected current official public #534 only.
// No automatic 603 certification, production changes, accounts or paid services.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const sha=data=>createHash('sha256').update(data).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r43_private_public_capture_dir_required');
const path=resolve(dir),jsonBytes=readFileSync(join(path,'focused-current-evidence.json'));
const report=JSON.parse(jsonBytes.toString('utf8')),failures=[];
const check=(condition,reason)=>{if(!condition)failures.push(reason);};
check(JSON.stringify(report.case_numbers)==='[534]','exact_original603_534_only');
check(report.source_sha===process.env.GITHUB_SHA,'exact_merged_source_sha_not_matched');
check(report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,'public_nonmutating_required');
check(report.manual_certified===0,'no_automatic_603_certification');
check(report.fetched===1&&report.parsed===1,'current_official_product_fetch_and_parse_incomplete');
check(Array.isArray(report.records)&&report.records.length===1,'duplicate_or_missing_selected_product');
const item=(report.records||[]).find(x=>x.number===534)||{};
let rawHtml;
try{
 const bytes=readFileSync(join(path,'case-534.html'));
 rawHtml=bytes.toString('utf8');
 check(sha(bytes)===item.html_sha256,'raw_selected_html_sha256_mismatch');
 check(bytes.length===item.html_bytes,'raw_selected_html_byte_length_mismatch');
}catch(error){check(false,'raw_selected_html_missing_'+String(error?.code||'error'));}
check(item.status==='FETCHED'&&item.parser_ok===true,'selected_current_parser_not_ok');
check(item.selected_heading_identity_verified===true,'original_product_title_identity_not_verified');
check(item.current_fields?.name==='Raven Espresso','selected_coffee_changed_from_original_identity');
check(item.add_coffee_ui_rendered===true&&item.source_review_rendered===true,'add_coffee_or_source_review_not_rendered');
const notes=String(item.current_fields?.tasting_notes||'');
check(/dark chocolate/i.test(notes)&&/velvet-like nuttiness/i.test(notes),'selected_straight_shot_profile_missing');
check(!/blueberry preserves|hazelnut liqueur/i.test(notes),'conditional_milk_flavors_incorrectly_auto_applied');
const contextual=item.selected_milk_context_facts||[];
check(contextual.length===1,'selected_conditional_source_review_fact_missing_or_ambiguous');
const fact=contextual[0]||{};
check(/when layered with milk/i.test(fact.value||''),'source_preparation_qualification_lost');
check(/blueberry preserves/i.test(fact.value||'')&&/hazelnut liqueur/i.test(fact.value||''),
 'direct_selected_conditional_flavor_claims_missing');
check(fact.source_type==='html'&&fact.source_url===item.final_url,'selected_conditional_source_provenance_mismatch');
check(!item.conflicts?.includes('tasting_notes'),'unresolved_selected_tasting_conflict');
check(Boolean(rawHtml)&&/raven/i.test(rawHtml)&&/blueberry preserves/i.test(rawHtml),
 'named_selected_conditional_flavor_not_in_raw_current_html');
const verdict={kind:'ISSUE33_R43_EXACT_SELECTED_534_CURRENT_OFFICIAL_AFTERPROOF',source_sha:report.source_sha,
 report_sha256:sha(jsonBytes),original603_csv_sha256:report.original603_register_sha256,
 case_number:534,passed:failures.length===0,failures,html_sha256:item.html_sha256||null,
 selected_h1:item.selected_h1||[],selected_identity_verified:item.selected_heading_identity_verified===true,
 unqualified_tasting_notes:notes,milk_qualified_review_fact:fact.value||null,
 source_review:item.source_review_rendered===true,add_coffee:item.add_coffee_ui_rendered===true,
 original603_fully_certified:false,production_operations:0};
writeFileSync(join(path,'r43-534-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R43 SELECTED CURRENT OFFICIAL] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
