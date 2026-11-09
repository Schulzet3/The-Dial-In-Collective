#!/usr/bin/env node
// Read-only, strictly selected current merchant case #570 afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {r63IdentityFailures,r63CurrentLodozaEvidence} from './issue33-r63-570-source-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('missing_read_only_current_source_artifact_directory');
const dir=resolve(root),sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(sourceBytes.toString('utf8')),failures=[];
const check=(yes,id)=>{if(!yes)failures.push(id);};
check(JSON.stringify(report.case_numbers)==='[570]','wrong_frozen_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'exact_head_source_sha_mismatch');
check(report.manual_certified===0&&report.production_operations===0&&
 report.real_auth===false&&report.original_corpus_modified===false,
 'unsafe_operation_or_false_semantic_certification');
check(report.records?.length===1,'unexpected_current_source_record_count');
const rec=report.records?.find(r=>r.number===570)||{};
failures.push(...r63IdentityFailures(rec));
let length=0,html='',verified=false;
try{const bytes=readFileSync(join(dir,'case-570.html'));length=bytes.length;
 html=bytes.toString('utf8');verified=length===rec.html_bytes&&sha(bytes)===rec.html_sha256;
}catch{}
check(verified,'current_selected_raw_html_bytes_or_digest_unverified');
const selectedProse=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' ').trim();
const evidence=r63CurrentLodozaEvidence(selectedProse);
check(evidence.selectedCurrentFarm&&evidence.selectedGrowingLocality&&
 evidence.selectedRegionSpec&&evidence.selectedWashedSpec,'exact_current_selected_lot_evidence_not_verified');
const fields=rec.current_fields||{},origin=fields.origin||'';
check(/\bHonduras\b/iu.test(origin),'chosen_country_missing');
const originConflict=(rec.conflicts||[]).some(c=>(typeof c==='string'?c:JSON.stringify(c)).includes('origin'));
if(evidence.selectedGrowingLocality&&!originConflict){
 check(/\bLodoza\b/iu.test(origin),'direct_selected_Lodoza_growing_locality_omitted');
}
check(!evidence.selectedWashedSpec||fields.process==='Washed','direct_selected_washed_processing_omitted_or_conflicted');
const observed={
 number:570,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],status:rec.status||'UNAVAILABLE',
 html_bytes:length,html_sha256:rec.html_sha256||null,raw_html_verified:verified,
 direct_current_evidence:evidence,current_fields:fields,conflicts:rec.conflicts||[],
 origin_conflict:originConflict,add_coffee:rec.add_coffee_ui_rendered===true,
 source_review:rec.source_review_rendered===true
};
const verdict={kind:'ISSUE33_R63_570_EXACT_SELECTED_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(sourceBytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed};
writeFileSync(join(dir,'r63-570-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R63 570 SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;