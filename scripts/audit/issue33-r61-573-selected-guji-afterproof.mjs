#!/usr/bin/env node
// Fresh current selected merchant HTML/actual parser guard; not a 603-wide certificate.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {r61IdentityFailures,r61CurrentGujiEvidence} from './issue33-r61-573-selected-guji-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('focused_artifact_dir_required');
const dir=resolve(root),bytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(bytes.toString('utf8')),failures=[];
const check=(yes,id)=>{if(!yes)failures.push(id);};
check(JSON.stringify(report.case_numbers)==='[573]','wrong_original603_selected_subset');
check(report.source_sha===process.env.GITHUB_SHA,'wrong_exact_source_sha');
check(report.manual_certified===0&&report.production_operations===0&&
 report.real_auth===false&&report.original_corpus_modified===false,'false_certification_or_unsafe_source');
check(report.records?.length===1,'missing_or_unexpected_selected_records');
const rec=report.records?.find(r=>r.number===573)||{};
failures.push(...r61IdentityFailures(rec));
let html='',length=0,verified=false;
try{const b=readFileSync(join(dir,'case-573.html'));length=b.length;html=b.toString('utf8');
 verified=length===rec.html_bytes&&sha(b)===rec.html_sha256;}catch{}
check(verified,'raw_selected_html_sha_and_length_unverified');
const scoped=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
const observedEvidence=r61CurrentGujiEvidence(scoped);
check(observedEvidence.directCurrentSelectedGuji,'current_selected_guji_region_not_directly_supported');
const origin=rec.current_fields?.origin||'';
check(/\bEthiopia\b/iu.test(origin),'selected_country_not_retained');
check(!observedEvidence.directCurrentSelectedGuji||/\bGuji\b/iu.test(origin),
 'selected_direct_current_guji_region_omitted');
const observed={
 number:573,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],status:rec.status||'UNAVAILABLE',html_bytes:length,
 html_sha256:rec.html_sha256||null,raw_html_verified:verified,
 direct_current_evidence:observedEvidence,
 current_fields:rec.current_fields||{},conflicts:rec.conflicts||[],
 source_review:rec.source_review_rendered===true,add_coffee:rec.add_coffee_ui_rendered===true
};
const verdict={kind:'ISSUE33_R61_EXACT_SELECTED_573_NOT_603_WIDE_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(bytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed};
writeFileSync(join(dir,'r61-573-selected-guji-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R61 CURRENT SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
