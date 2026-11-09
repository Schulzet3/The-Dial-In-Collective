#!/usr/bin/env node
// Exact original603 #572 current official product, selected-text and parser proof.
// No production/backend calls; consumes only ephemeral read-only source artifact.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedArichaDirectFacts} from './issue33-r68-572-aricha-contract.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('read_only_source_artifact_directory_required');
const root=resolve(dir),failures=[],check=(ok,key)=>{if(!ok)failures.push(key);};
let raw=null,report={},rec={},html='',htmlBytes=null,rawVerified=false;
try{raw=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
check(Boolean(raw),'missing_source_report');
check(JSON.stringify(report.case_numbers)==='[572]','wrong_original603_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'source_sha_not_exact_current_head');
check(report.manual_certified===0&&report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,
  'false_603_certification_or_unsafe_operation');
check(report.records?.length===1,'unexpected_record_count');
rec=report.records?.find(r=>r.number===572)||{};
const official='https://www.stageline.coffee/product-page/ethiopia-abiyot-ageze-natural';
check(rec.official_url===official,'original_selected_url_mismatch');
let final;try{final=new URL(rec.final_url);}catch{}
check(final?.protocol==='https:'&&final?.hostname==='www.stageline.coffee'&&
 final?.pathname==='/product-page/ethiopia-abiyot-ageze-natural'&&!final.search&&!final.hash,
 'source_host_path_or_redirect_mismatch');
check(rec.status==='FETCHED'&&rec.parser_ok===true,'current_exact_source_unavailable_or_parser_failed');
try{const bytes=readFileSync(join(root,'case-572.html'));htmlBytes=bytes.length;html=bytes.toString('utf8');
 rawVerified=bytes.length===rec.html_bytes&&digest(bytes)===rec.html_sha256;}catch{}
check(rawVerified,'current_raw_html_bytes_or_hash_mismatch');
const selected=productMarkup(html),headings=selectedProductHeadings(selected);
const direct=selectedArichaDirectFacts(selected,headings);
check(direct.selectedIdentity&&JSON.stringify(rec.selected_h1)==='["Ethiopia Aricha Natural"]'&&
 rec.selected_heading_identity_verified===true,'current_selected_title_not_independently_proven');
for(const key of ['region','elevation','variety','process','namedProducer'])check(direct[key],`current_selected_direct_${key}_missing`);
const f=rec.current_fields||{},origin=String(f.origin||'');
check(f.name==='Ethiopia Aricha Natural','reused_slug_overrode_current_selected_coffee_name');
check(/\bGedeb\b/iu.test(origin)&&/\bYirgacheffe\b/iu.test(origin)&&/\bEthiopia\b/iu.test(origin),
 'direct_selected_growing_region_omitted');
check(f.process==='Natural','direct_selected_natural_process_omitted');
check(/\b74112\b/u.test(String(f.variety||''))&&/\b74110\b/u.test(String(f.variety||'')),
 'direct_selected_varieties_omitted');
check(/1950|1,950/u.test(String(f.elevation_m||''))&&/2300|2,300/u.test(String(f.elevation_m||'')),
 'direct_selected_elevation_range_omitted');
check(/Abiyot\s+Ageze/iu.test(String(f.producer||'')),'named_current_selected_producer_omitted');
check(!(rec.conflicts||[]).some(c=>/name|origin|process|variety|elevation|producer/iu.test(String(typeof c==='string'?c:JSON.stringify(c)))),
 'current_selected_direct_canonical_conflict_requires_review');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,
 'member_add_coffee_or_source_review_not_rendered');
const verdict={kind:'ISSUE33_R68_572_CURRENT_DIRECT_SELECTED_NOT_603_CERTIFICATION',
 source_sha:report.source_sha||null,original603_csv_sha256:report.original603_register_sha256||null,
 report_sha256:raw?digest(raw):null,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed:{number:572,official_url:rec.official_url||null,
 final_url:rec.final_url||null,status:rec.status||'NOT_FETCHED',selected_h1:rec.selected_h1||[],
 current_scoped_h1:headings,raw_html_bytes:htmlBytes,raw_html_sha256:rec.html_sha256||null,
 raw_verified:rawVerified,direct_current_selected:direct,actual_fields:f,
 actual_conflicts:rec.conflicts||[],add_coffee:rec.add_coffee_ui_rendered===true,
 source_review:rec.source_review_rendered===true}};
writeFileSync(join(root,'r68-572-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R68 EXACT CURRENT SELECTED #572] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
