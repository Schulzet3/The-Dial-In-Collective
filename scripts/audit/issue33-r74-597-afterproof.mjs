#!/usr/bin/env node
// Fail-closed, source-hashed, actual-parser current official original603 #597 only.
// The original immutable corpus and application logic are NEVER modified here.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedNkumariR74DirectEvidence} from './issue33-r74-597-selected-contract.mjs';
const sha = v => createHash('sha256').update(v).digest('hex');
const dir = process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if (!dir) throw Error('focused_public_artifact_dir_required');
const root = resolve(dir);mkdirSync(root,{recursive:true});
const failures = [], check = (ok,reason) => {if(!ok)failures.push(reason);};
let data = null, report = {};
try{data=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(data.toString('utf8'));}catch{}
check(Boolean(data),'current_public_source_report_missing');
check(JSON.stringify(report.case_numbers)==='[597]' && report.records?.length===1,'original_row_subset_changed');
check(Boolean(report.source_sha) && report.source_sha===process.env.GITHUB_SHA,'actual_source_sha_mismatch');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_modified');
check(report.manual_certified===0 && report.production_operations===0 && report.real_auth===false &&
  report.original_corpus_modified===false,'unearned_certification_or_disallowed_operation');
const r=report.records?.[0]||{};
const url='https://www.wreckingballcoffee.com/products/kenya-estate';
check(r.number===597 && r.official_url===url && r.archived_coffee==='Kenya Nkumari, P1 C','original_exact_identity_url_changed');
let parsedUrl=null;try{parsedUrl=new URL(r.final_url)}catch{}
check(parsedUrl?.protocol==='https:' &&
  parsedUrl?.hostname==='www.wreckingballcoffee.com' &&
  /^\/(?:collections\/frontpage\/)?products\/kenya-estate\/?$/.test(parsedUrl?.pathname||'') &&
  !parsedUrl?.search && !parsedUrl?.hash,'redirect_mismatched_selected_product');
check(r.status==='FETCHED' && r.parser_ok===true && r.selected_heading_identity_verified===true,'live_public_source_parser_or_selected_identity_not_verified');
let htmlBytes=null;try{htmlBytes=readFileSync(join(root,'case-597.html'))}catch{}
check(Boolean(htmlBytes)&&htmlBytes.length===r.html_bytes&&sha(htmlBytes)===r.html_sha256,'raw_selected_html_byte_hash_mismatch');
const html=htmlBytes?.toString('utf8')||'',selected=productMarkup(html);
const headings=selectedProductHeadings(selected), direct=selectedNkumariR74DirectEvidence(selected,headings);
for (const [k,v] of Object.entries(direct)) check(v,'selected_direct_'+k+'_not_currently_verifiable');
// Bounded read-only current official public selected evidence diagnostic for source drift.
const rawPublicSelected=selected.replace(/<(?:script|style|template|noscript|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript|nav|aside|footer)>/giu,' ')
 .replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
const k=rawPublicSelected.toLowerCase().indexOf('tastes like:');
if(k>=0)console.log('[DIC33 R74 EXACT PUBLIC SELECTED CONTENT DIAGNOSTIC] '+
 rawPublicSelected.slice(k,k+3000));
const fields=r.current_fields||{},notes=String(fields.tasting_notes||'').toLowerCase();
check(String(fields.name||'').trim()==='Kenya Nkumari, P1 C','actual_parser_selected_name_wrong');
check(/Meru/i.test(fields.origin||'')&&/Kenya/i.test(fields.origin||'') &&
 !/Colombia|Tanzania/i.test(fields.origin||''),'actual_parser_current_estate_origin_wrong');
check(/Naman Meme/i.test(fields.producer||''),'actual_parser_current_producer_missing');
check(/Washed/i.test(fields.process||''),'actual_parser_washed_process_missing');
check(/SL\s*-?\s*28/i.test(fields.variety||'') && /Ruiru\s*-?\s*11/i.test(fields.variety||'') &&
 !/screen|grade|14\b/i.test(fields.variety||''),'actual_parser_variety_or_screen_grade_contaminated');
check(/1400/.test(String(fields.elevation_m||'')),'actual_parser_current_elevation_missing');
check(['floral','grapefruit','caramel'].every(x=>notes.includes(x)),'actual_parser_selected_sensory_notes_missing');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_or_source_review_missing');
check(!(r.conflicts||[]).some(x=>/name|origin|producer|variety|elevation|process|tasting_notes/i.test(String(x))),
 'current_selected_parser_field_conflicts');
const verdict={kind:'ISSUE33_R74_597_NKUMARI_SELECTED',source_sha:report.source_sha||null,
 original603_csv_sha256:report.original603_register_sha256||null,
 current_source_json_sha256:data?sha(data):null,selected_html_sha256:htmlBytes?sha(htmlBytes):null,
 observed_name:fields.name||null,observed_fields:fields,selected_headings:headings,direct,
 manual_certified:0,production_operations:0,passed:failures.length===0,failures};
writeFileSync(join(root,'r74-597-nkumari-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R74 CURRENT OFFICIAL NKUMARI] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
