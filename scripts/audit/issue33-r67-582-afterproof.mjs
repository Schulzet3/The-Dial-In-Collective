#!/usr/bin/env node
// Read-only current official original603 #582 source diagnosis; not 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedOneskaEmbuEvidence} from './issue33-r67-582-source-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dest=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dest)throw Error('read_only_source_artifact_directory_required');
const dir=resolve(dest),failures=[],check=(x,k)=>{if(!x)failures.push(k);};
let raw=null,report={},rec={},html='',bytes=0,verified=false;
try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
check(Boolean(raw),'original603_582_source_json_absent');
check(JSON.stringify(report.case_numbers)==='[582]','wrong_original603_subset');
check(report.source_sha===process.env.GITHUB_SHA,'wrong_exact_source_sha');
check(report.manual_certified===0&&report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,
 'unverified_certification_or_unsafe_operation');
check(report.records?.length===1,'wrong_selected_record_count');
rec=report.records?.find(x=>x.number===582)||{};
const url='https://www.tandemcoffee.com/products/kamavindi-kenya-copy';
check(rec.official_url===url,'not_original_exact_product_url');
let final=null;try{final=new URL(rec.final_url)}catch{}
check(final?.protocol==='https:'&&final?.hostname==='www.tandemcoffee.com'&&
 final?.pathname==='/products/kamavindi-kenya-copy'&&!final.search&&!final.hash,
 'unverified_original_url_or_changed_redirect');
check(rec.status==='FETCHED'&&rec.parser_ok===true,'exact_current_source_fetch_or_parse_failed');
check(rec.selected_h1?.length===1&&rec.selected_h1[0]==='Oneska - Kenya'&&
 rec.selected_heading_identity_verified===true&&rec.current_fields?.name==='Oneska - Kenya',
 'reused_slug_changed_selected_identity_or_heading');
try{const b=readFileSync(join(dir,'case-582.html'));bytes=b.length;html=b.toString('utf8');
 verified=bytes===rec.html_bytes&&sha(b)===rec.html_sha256;}catch{}
check(verified,'raw_selected_current_html_size_or_hash_failed');
const source=selectedOneskaEmbuEvidence(productMarkup(html));
check(source.hero&&source.currentEstate&&source.producer&&source.process,
 'chosen_coffee_direct_embu_estate_producer_process_evidence_missing');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,
 'add_coffee_or_source_review_missing');
const fields=rec.current_fields||{},origin=String(fields.origin||'');
check(origin==='Embu, Kenya','direct_selected_embu_farm_origin_not_retained');
check(fields.process==='Washed','selected_washed_processing_missing');
check(/Onesmus|Karen/.test(String(fields.producer||'')),'selected_named_estate_producer_missing');
check(!(rec.conflicts||[]).includes('origin'),'contradictory_selected_origin_requires_review');
const observed={number:582,official_url:rec.official_url||null,final_url:rec.final_url||null,
 source_status:rec.status||'NOT_FETCHED',selected_h1:rec.selected_h1||[],
 source_direct:source,source_html_bytes:bytes,source_html_sha256:rec.html_sha256||null,
 raw_verified:verified,actual_fields:fields,actual_origin:origin||null,
 expected_source_bound_origin:'Embu, Kenya',conflicts:rec.conflicts||[],
 add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true};
const verdict={kind:'ISSUE33_R67_ORIGINAL603_582_CURRENT_SELECTED_ONLY',
 source_sha:report.source_sha||null,original603_csv_sha256:report.original603_register_sha256||null,
 source_json_sha256:raw?sha(raw):null,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed};
writeFileSync(join(dir,'r67-582-selected-source-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R67 582 SELECTED OFFICIAL SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
