#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {R51_EXACT_SOURCE_CASES,selectedR51CaseFailures} from './issue33-r51-selected-product-contract.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('focused_artifact_dir_required');
const root=resolve(dir),bytes=readFileSync(join(root,'focused-current-evidence.json'));
const r0=JSON.parse(bytes.toString('utf8')),failures=[];
const check=(v,id)=>{if(!v)failures.push(id);};
check(JSON.stringify(r0.case_numbers)==='[584]','unexpected_original_selected_subset');
check(r0.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
check(r0.manual_certified===0&&r0.production_operations===0&&
 r0.real_auth===false&&r0.original_corpus_modified===false,'false_certification');
check(r0.records?.length===1,'missing_selected_record');
const r=r0.records?.find(x=>x.number===584)||{};
const spec=R51_EXACT_SOURCE_CASES.find(x=>x.number===584);
failures.push(...selectedR51CaseFailures(r,spec));
let raw=null,verified=false;
try{raw=readFileSync(join(root,'case-584.html'));
 verified=raw.length===r.html_bytes&&sha(raw)===r.html_sha256;}catch{}
check(verified,'selected_raw_html_sha_or_bytes_mismatch');
const html=productMarkup(raw?.toString('utf8')||'');
const direct=html.replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/&#(?:8226|183);|&bull;/giu,'•').replace(/\s+/gu,' ');
const selected=/Fair\s+Trade\s*\/\s*Organic\s*•\s*La\s+Paz\s*•\s*1200\s*[-–]\s*1750\s*meters/iu.test(direct);
check(selected,'exact_current_selected_source_trade_elevation_missing_or_changed');
check(r.current_fields?.origin==='La Paz, Honduras','selected_La_Paz_Honduras_canonical_origin_not_preserved');
check(!r.conflicts?.includes('origin'),'current_selected_origin_conflict');
check((r.seo_fallback_fields||[]).length===0,'unrelated_source_fallback');
const verdict={kind:'ISSUE33_R57_EXACT_584_NOT_603_CERTIFICATION',source_sha:r0.source_sha,
 original603_csv_sha256:r0.original603_register_sha256,evidence_sha256:sha(bytes),
 manual_certified:0,production_operations:0,passed:failures.length===0,failures,
 observed:{number:584,official_url:r.official_url,final_url:r.final_url,
  selected_h1:r.selected_h1,origin:r.current_fields?.origin||null,
  process:r.current_fields?.process||null,roast:r.current_fields?.roast_level||null,
  direct_selected_caption: selected,html_bytes:r.html_bytes,
  html_sha256:r.html_sha256,raw_html_verified:verified,
  add_coffee:r.add_coffee_ui_rendered,source_review:r.source_review_rendered}};
writeFileSync(join(root,'r57-584-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R57] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
