#!/usr/bin/env node
// Strict actual raw merchant HTML, current parser and rendered Add Coffee/Review guard.
// A failed assertion is a source-backed defect signal, not a 603-coffee certificate.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R56_SELECTED,r56IdentityFailures,r56DryMillProvenance} from './issue33-r56-603-mill-origin-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('focused_artifact_dir_required');
const dir=resolve(root), bytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(bytes.toString('utf8')),failures=[];
const check=(yes,id)=>{if(!yes)failures.push(id);};
check(JSON.stringify(report.case_numbers)==='[603]','wrong_original603_selected_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'exact_head_does_not_match_workflow');
check(report.manual_certified===0&&report.production_operations===0&&
 report.real_auth===false&&report.original_corpus_modified===false,'unsafe_false_certification');
check(report.records?.length===1,'missing_or_unexpected_selected_records');
const rec=report.records?.find(r=>r.number===603)||{};
failures.push(...r56IdentityFailures(rec));
let html='',len=0,verified=false;
try{
 const buffer=readFileSync(join(dir,'case-603.html'));len=buffer.length;
 html=buffer.toString('utf8');verified=len===rec.html_bytes&&sha(buffer)===rec.html_sha256;
}catch{}
check(verified,'raw_exact_selected_html_sha_or_bytes_unverified');
const scoped=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
const provenance=r56DryMillProvenance(scoped);
check(provenance.selectedDryMillTown,'selected_processing_mill_geography_not_published');
check(!provenance.expresslyGrownInThatTown,'selected_growing_location_now_requires_reassessment');
const origin=rec.current_fields?.origin||'';
const falseMillOrigin=provenance.selectedDryMillTown&&!provenance.expresslyGrownInThatTown&&
 /\bPalacaguina\b/iu.test(origin);
check(!falseMillOrigin,'selected_dry_mill_town_incorrectly_used_as_growing_origin_603');
const observed={
 number:603,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],parsed_name:rec.current_fields?.name||null,
 status:rec.status||'NOT_FETCHED',raw_html_bytes:len,raw_html_sha256:rec.html_sha256||null,
 raw_html_verified:verified,selected_source_mill_provenance:provenance,
 actual_origin:origin||null,actual_tasting_notes:rec.current_fields?.tasting_notes||null,
 actual_process:rec.current_fields?.process||null,actual_producer:rec.current_fields?.producer||null,
 actual_conflicts:rec.conflicts||[],source_review:rec.source_review_rendered===true,
 add_coffee:rec.add_coffee_ui_rendered===true
};
const verdict={
 kind:'ISSUE33_R56_CURRENT_EXACT_603_SOURCE_NOT_603_SEMANTIC_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(bytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed
};
writeFileSync(join(dir,'r56-603-mill-origin-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R56 SELECTED PROVENANCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
