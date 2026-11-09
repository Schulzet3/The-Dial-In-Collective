#!/usr/bin/env node
// Read-only STRICT selected original603 #579. Does NOT certify other 602 cases.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {r65IdentityFailures,r65SelectedLotEvidence} from './issue33-r65-579-source-contract.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('missing_guarded_source_artifact_directory');
const folder=resolve(root),input=readFileSync(join(folder,'focused-current-evidence.json'));
const report=JSON.parse(input.toString('utf8')),errors=[],check=(yes,key)=>{if(!yes)errors.push(key);};
check(JSON.stringify(report.case_numbers)==='[579]','wrong_original603_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'not_exact_workflow_commit');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&
  report.original_corpus_modified===false,'false_certification_or_unauthorized_operations');
check(report.records?.length===1,'unexpected_source_record_count');
const rec=report.records?.find(x=>x.number===579)||{};
errors.push(...r65IdentityFailures(rec));
let length=0,html='',verified=false;
try{const bytes=readFileSync(join(folder,'case-579.html'));
  length=bytes.length;html=bytes.toString('utf8');
  verified=length===rec.html_bytes&&sha(bytes)===rec.html_sha256;
}catch{}
check(verified,'selected_raw_html_or_sha256_not_verified');
const visible=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' ').trim();
const evidence=r65SelectedLotEvidence(visible);
check(evidence.directSelectedGrowerAndRegion,
 'direct_current_Fragancia_grower_and_Huila_Palestina_source_missing');
check(evidence.directSelectedWashed&&evidence.directSelectedElevation&&
 evidence.directSelectedFlavors,'direct_current_selected_product_field_source_missing');
const fields=rec.current_fields||{},origin=String(fields.origin||''),conflicts=rec.conflicts||[];
check(/\bColombia\b/iu.test(origin),'selected_country_omitted');
const originConflict=conflicts.some(x=>String(typeof x==='string'?x:JSON.stringify(x)).includes('origin'));
if(evidence.directSelectedGrowerAndRegion&&!originConflict){
 check(/\bHuila\b/iu.test(origin),'direct_selected_Huila_region_omitted');
 check(/\bPalestina\b/iu.test(origin),'direct_selected_Palestina_locality_omitted');
}
check(!evidence.directSelectedWashed||fields.process==='Washed',
 'selected_fully_washed_process_omitted');
check(!evidence.directSelectedFlavors||/dragonfruit/i.test(fields.tasting_notes||''),
 'selected_primary_tasting_notes_missing');
const observed={number:579,official_url:rec.official_url||null,
 final_url:rec.final_url||null,selected_h1:rec.selected_h1||[],
 status:rec.status||'UNAVAILABLE',html_bytes:length,html_sha256:rec.html_sha256||null,
 raw_html_verified:verified,selected_lot_evidence:evidence,current_fields:fields,
 conflicts,origin_conflict:originConflict,
 add_coffee:rec.add_coffee_ui_rendered===true,
 source_review:rec.source_review_rendered===true};
const verdict={kind:'ISSUE33_R65_579_EXACT_SELECTED_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(input),manual_certified:0,production_operations:0,
 passed:errors.length===0,failures:errors,observed};
writeFileSync(join(folder,'r65-579-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R65 579 SELECTED] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
