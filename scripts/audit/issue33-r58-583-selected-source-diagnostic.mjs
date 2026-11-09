#!/usr/bin/env node
// Issue #33 R58: inspect exactly one current selected public coffee, not 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R51_EXACT_SOURCE_CASES,selectedR51CaseFailures} from './issue33-r51-selected-product-contract.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('focused_private_artifact_directory_required');
const root=resolve(dir),bytes=readFileSync(join(root,'focused-current-evidence.json'));
const report=JSON.parse(bytes.toString('utf8')),failures=[];
const require=(ok,id)=>{if(!ok)failures.push(id);};
require(JSON.stringify(report.case_numbers)==='[583]','unexpected_original603_subset');
require(report.source_sha===process.env.GITHUB_SHA,'exact_git_sha_mismatch');
require(report.manual_certified===0&&report.production_operations===0&&
 report.real_auth===false&&report.original_corpus_modified===false,'false_certification_or_production');
require(report.records?.length===1,'missing_or_extra_records');
const record=report.records?.find(x=>x.number===583)||{};
failures.push(...selectedR51CaseFailures(record,R51_EXACT_SOURCE_CASES.find(x=>x.number===583)));
let raw=null,rawVerified=false;
try{
 raw=readFileSync(join(root,'case-583.html'));
 rawVerified=raw.length===record.html_bytes&&sha(raw)===record.html_sha256;
}catch{}
require(rawVerified,'selected_current_html_bytes_or_digest_not_verified');
const scoped=productMarkup(raw?.toString('utf8')||'');
const clean=scoped.replace(/<[^>]*>/gu,' ').replace(/&nbsp;|&#160;/giu,' ')
 .replace(/&amp;/giu,'&').replace(/&#(?:8211|8212);/giu,'-')
 .replace(/\s+/gu,' ').trim();
const regionEvidence=[...clean.matchAll(/.{0,145}\b(?:Jarabacoa|Cibao)\b.{0,195}/giu)]
 .slice(0,7).map(m=>m[0].slice(0,390));
const evidence={
 kind:'ISSUE33_R58_SELECTED_583_SOURCE_DIAGNOSTIC_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,evidence_sha256:sha(bytes),
 original603_register_sha256:report.original603_register_sha256,
 manual_certified:0,production_operations:0,passed:failures.length===0,failures,
 selected:{number:583,official_url:record.official_url,final_url:record.final_url,
  h1:record.selected_h1,name:record.current_fields?.name||null,
  origin:record.current_fields?.origin||null,process:record.current_fields?.process||null,
  roast:record.current_fields?.roast_level||null,conflicts:record.conflicts||[],
  add_coffee:record.add_coffee_ui_rendered===true,
  source_review:record.source_review_rendered===true,
  raw_html_verified:rawVerified,html_bytes:record.html_bytes,
  html_sha256:record.html_sha256},
 region_source_mentions:regionEvidence,region_source_mentions_count:regionEvidence.length,
 note:'Diagnostic only: printed locality may describe farm growing site, processing site, general education or stale lot; review full primary context before filling canonically.'
};
writeFileSync(join(root,'r58-583-source-diagnostic.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('[ISSUE33 R58 SELECTED SOURCE] '+JSON.stringify(evidence));
if(failures.length)process.exitCode=1;
