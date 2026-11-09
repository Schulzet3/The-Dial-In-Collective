#!/usr/bin/env node
// Issue #33 R47: one current selected official product. No universal original603 certification.
// Reads only source-bound anonymous HTTPS artifacts created by the existing guarded intake.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r47_bounded_public_source_directory_required');
const root=resolve(dir),reportBytes=readFileSync(join(root,'focused-current-evidence.json'));
const report=JSON.parse(reportBytes.toString('utf8'));
const failures=[],check=(ok,reason)=>{if(!ok)failures.push(reason);};
check(JSON.stringify(report.case_numbers)==='[549]','original603_selected_549_only');
check(report.source_sha===process.env.GITHUB_SHA,'actual_source_SHA_mismatch');
check(report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,
 'source_intake_must_not_modify_corpus_or_production_or_auth');
check(report.manual_certified===0,'not_universal_or_automatic_certification');
check(report.fetched===1&&report.parsed===1&&report.records?.length===1,
 'current_selected_original_product_not_fetched_parsed');
const item=report.records?.[0]||{},fields=item.current_fields||{};
check(item.number===549&&item.status==='FETCHED'&&item.parser_ok===true,
 'original_selected_549_actual_parser_not_ok');
check(item.selected_heading_identity_verified===true&&item.selected_h1?.includes('Tanzania Peaberry'),
 'current_selected_H1_identity_not_independently_supported');
check(fields.name==='Tanzania Peaberry','changed_or_wrong_selected_coffee');
let currentUrl;
try{currentUrl=new URL(item.final_url)}catch{}
check(currentUrl?.protocol==='https:'&&currentUrl?.hostname==='www.realdope.coffee'&&
 currentUrl?.pathname==='/products/tanazania-peaberry','unapproved_redirect_or_selected_identity');
check(item.add_coffee_ui_rendered===true&&item.source_review_rendered===true,
 'current_Add_Coffee_or_Source_Review_not_rendered');
let raw='',rawBytes;
try{
 rawBytes=readFileSync(join(root,'case-549.html'));raw=rawBytes.toString('utf8');
 check(hash(rawBytes)===item.html_sha256,'official_HTML_SHA256_mismatch');
 check(rawBytes.length===item.html_bytes,'official_HTML_byte_length_mismatch');
}catch(e){check(false,'official_HTML_not_saved_'+String(e?.code||'error'));}
check(/Tanzania\s+Peaberry/i.test(raw),'selected_product_name_absent_from_raw_HTML');
check(/Origin[\s\S]{0,240}?Tanzania[\s\S]{0,160}?Peaberry/i.test(raw),
 'selected_direct_Origin_Tanzania_Peaberry_absent_from_current_HTML');
check(/Roast[\s\S]{0,160}?Dark/i.test(raw),'selected_direct_dark_roast_absent');
check(/Tasting notes[\s\S]{0,200}?Earthy/i.test(raw),'selected_direct_tasting_note_absent');
check(fields.origin==='Tanzania','bean_classification_incorrectly_added_to_geography');
check(fields.roast_level==='Dark','selected_dark_roast_missing');
check(!item.conflicts?.includes('roast_level'),'false_selected_roast_conflict_from_other_coffee_or_testimonial');
const notes=String(fields.tasting_notes||'').toLowerCase();
check(['earthy','fruity','cacao'].every(t=>notes.includes(t)),
 'actual_selected_sensory_list_missing_or_transplanted');
check(!fields.process&&!fields.producer&&!fields.elevation_m,
 'unpublished_process_producer_or_elevation_autofilled');
check(!item.conflicts?.includes('origin'),'unresolved_origin_conflict');
const verdict={kind:'ISSUE33_R47_CURRENT_OFFICIAL_549_AFTERPROOF',
 source_sha:report.source_sha,report_sha256:hash(reportBytes),
 original603_csv_sha256:report.original603_register_sha256,case_number:549,
 official_url:item.official_url||null,final_url:item.final_url||null,
 selected_h1:item.selected_h1||[],selected_identity:item.selected_heading_identity_verified===true,
 html_sha256:item.html_sha256||null,html_bytes:item.html_bytes||null,current_fields:fields,
 source_review:item.source_review_rendered===true,add_coffee:item.add_coffee_ui_rendered===true,
 passed:failures.length===0,failures,original603_fully_certified:false,production_operations:0};
writeFileSync(join(root,'r47-549-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R47 CURRENT SELECTED 549] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
