// One-publisher READY-only source staging policy. This module does not deploy,
// write a repository ref, call a provider, or execute tests. Fail closed when
// a selected READY path overlaps unfinished source (including same-file edits).
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
import {posix} from 'node:path';
import {classifyReleaseRisk} from './release-reliability.mjs';
const SHA=/^[a-f0-9]{40}$/;
const ITEM=/^DIC-Q-[1-9][0-9]*(?:-[a-z0-9-]+)?$/;
const sorted=items=>[...items].sort();
const equal=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
// One file can be both a reviewed workflow-only and an issue-scoped unready
// test. Both proofs stay mandatory, but Git's changed-path inventory is a SET.
export function assertExactCandidateStagedPaths(actual,...provenanceGroups){
 if(!Array.isArray(actual)||provenanceGroups.some(g=>!Array.isArray(g)))
  throw Error('Isolated READY candidate HOLD: candidate changed-path provenance unavailable');
 const expected=sorted([...new Set(provenanceGroups.flat())]);
 if(!equal(actual,expected))
  throw Error('Isolated READY candidate HOLD: Candidate staging commit changes unrelated paths or lacks same-commit journal');
 return true;
}

export const CANDIDATE_RECEIPT_PATH='docs/RELEASE_CANDIDATE.json';
export const CANDIDATE_JOURNAL_PATH='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
export const CANDIDATE_KIND='DIC-READY-ONLY-SOURCE-1';
// A prospective READY row is source-shaped for exact native CI, not yet live
// READY or publisher-eligible. Only a verified one-row staging queue delta
// may accompany this precise #3889 nonpublishing candidate.
export function reviewedProspectiveReadyQueuePath({manifest,queue,developmentSourceSha,
 candidateSha,candidateBranch,sourceObjectAt}={}){
 const x=manifest?.prospective_ready_preview;
 if(x===undefined)return [];
 const fail=why=>{throw Error('Prospective READY queue staging HOLD: '+why);};
 if(x?.status!=='PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING'||
   x.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
   !/^[a-f0-9]{64}$/.test(x.identity_sha256||'')||
   !/^DIC-Q-[1-9][0-9]*-[a-z0-9-]+$/.test(x.selected_id||'')||
   !(candidateBranch?.split('/').length===2&&candidateBranch.split('/')[0]==='release-candidates'&&
     /^prospect3889-[a-f0-9]{20}$/.test(candidateBranch.split('/')[1]))||
   manifest.candidate_branch!==candidateBranch||manifest.publication_authorized!==false||
   !Array.isArray(manifest.selected_ready_item_ids)||
   manifest.selected_ready_item_ids.length!==1||
   manifest.selected_ready_item_ids[0]!==x.selected_id||
   queue?.items?.find(i=>i.id===x.selected_id)?.state!=='READY')
  fail('identity, branch, baseline, original selected state or publication exclusion mismatch');
 if(typeof sourceObjectAt!=='function'||!SHA.test(developmentSourceSha||'')||
   !SHA.test(candidateSha||''))fail('exact Git tree reader unavailable');
 const before=sourceObjectAt(developmentSourceSha,'docs/RELEASE_QUEUE.json');
 const after=sourceObjectAt(candidateSha,'docs/RELEASE_QUEUE.json');
 if(!/^100644:[a-f0-9]{40}$/.test(before||'')||
   !/^100644:[a-f0-9]{40}$/.test(after||'')||before===after)
  fail('prospective candidate did not stage its changed READY-shaped queue Git blob');
 return ['docs/RELEASE_QUEUE.json'];
}


// #3889 batch preparation is deliberately NOT a publisher acceptance path.
// Require the independently replayed in-memory plan from local staging. A
// remote manifest alone can never authorize a queue change or publication.
export function reviewedProspectiveBatchQueuePath({manifest,queue,developmentSourceSha,
 candidateSha,candidateBranch,sourceObjectAt,prospectiveBatchPlan}={}){
 const x=manifest?.prospective_ready_batch_preview;
 if(x===undefined)return [];
 const p=prospectiveBatchPlan;
 const hold=why=>{throw Error('Prospective READY batch staging HOLD: '+why);};
 if(!p||p.status!=='PROSPECTIVE_BATCH_PLAN_ONLY'||p.publication_authorized!==false||p.ready_certified!==false||
    manifest.prospective_ready_preview!==undefined||manifest.publication_authorized!==false||
    manifest.development_source_sha!==developmentSourceSha||p.development_source_sha!==developmentSourceSha||
    manifest.candidate_branch!==candidateBranch||!/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/.test(candidateBranch||'')||
    x.status!==p.status||x.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
    p.baseline_queue_blob!==x.baseline_queue_blob||x.publication_authorized!==false||x.ready_certified!==false||
    !/^[a-f0-9]{64}$/.test(x.identity_sha256||'')||x.identity_sha256!==p.identity_sha256||
    !Array.isArray(x.added_ids)||!x.added_ids.length||!Array.isArray(x.retained_ready_ids)||
    JSON.stringify(x.added_ids)!==JSON.stringify(p.added_ids)||JSON.stringify(x.retained_ready_ids)!==JSON.stringify(p.retained_ready_ids)||
    JSON.stringify(queue)!==JSON.stringify(p.queue)||queueSchemaErrors(queue).length)
  hold('independent local plan, immutable identity, queue, or nonpublication mismatch');
 const selected=[...x.added_ids,...x.retained_ready_ids];
 const actual=queue.items.filter(i=>i.state==='READY').map(i=>i.id);
 if(new Set(selected).size!==selected.length||!Array.isArray(manifest.selected_ready_item_ids)||
    !equal(selected,actual)||!equal(selected,manifest.selected_ready_item_ids)||
    !SHA.test(developmentSourceSha||'')||!SHA.test(candidateSha||'')||typeof sourceObjectAt!=='function')
  hold('all existing READY plus exact planned additions required');
 const before=sourceObjectAt(developmentSourceSha,'docs/RELEASE_QUEUE.json');
 const after=sourceObjectAt(candidateSha,'docs/RELEASE_QUEUE.json');
 if(!/^100644:[a-f0-9]{40}$/.test(before||'')||!/^100644:[a-f0-9]{40}$/.test(after||'')||before===after)
  hold('staged prospective queue object must differ from live source');
 return ['docs/RELEASE_QUEUE.json'];
}

// #3889: a prospective READY-shaped queue is validated on its own exact native
// candidate SHA, then adopted only if development later records identical bytes.
// This is a comparison gate, NEVER a READY certification or publication grant.
export function reviewedProspectivePromotionQueueParity({manifest,originalQueue,
 candidateQueue,liveQueue,prospectiveBatchPlan=null}={}){
 if(typeof originalQueue!=='string'||typeof candidateQueue!=='string')return false;
 if(originalQueue===candidateQueue)return true; // Existing ordinary READY-only contract.
 // A new TESTING batch may be published ONLY after independent source-bound
 // planning against the immutable original queue, followed by a verified
 // LIVE queue whose bytes equal the fully tested candidate. This comparison
 // grants no publication and substitutes for NONE of the five named CI jobs.
 if(manifest?.prospective_ready_batch_preview!==undefined){
  const x=manifest.prospective_ready_batch_preview,p=prospectiveBatchPlan;
  if(!p||x.status!=='PROSPECTIVE_BATCH_PLAN_ONLY'||p.status!==x.status||
     x.publication_authorized!==false||x.ready_certified!==false||
     p.publication_authorized!==false||p.ready_certified!==false||
     x.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
     p.baseline_queue_blob!==x.baseline_queue_blob||
     x.identity_sha256!==p.identity_sha256||
     !/^[a-f0-9]{64}$/.test(x.identity_sha256||'')||
     manifest.kind!==CANDIDATE_KIND||manifest.publication_authorized!==false||
     manifest.prospective_ready_preview!==undefined||
     manifest.development_source_sha!==p.development_source_sha||
     !/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/.test(manifest.candidate_branch||'')||
     !Array.isArray(p.added_ids)||!p.added_ids.length||
     !Array.isArray(p.retained_ready_ids)||
     !equal(x.added_ids||[],p.added_ids)||
     !equal(x.retained_ready_ids||[],p.retained_ready_ids)||
     !equal(manifest.selected_ready_item_ids||[],[...p.added_ids,...p.retained_ready_ids])||
     manifest.published_source_sha!==p.queue?.published_base?.tested_source_sha||
     candidateQueue!==JSON.stringify(p.queue,null,2)+'\n'||liveQueue!==candidateQueue)
   return false;
  try{
   const before=JSON.parse(originalQueue),expected=structuredClone(before);
   if(queueSchemaErrors(before).length||queueSchemaErrors(p.queue).length||
      !Array.isArray(before.items)||before.items.length!==p.queue.items.length||
      JSON.stringify(before.published_base)!==JSON.stringify(p.queue.published_base)||
      !equal(before.items.filter(i=>i.state==='READY').map(i=>i.id),p.retained_ready_ids))return false;
   for(const id of p.added_ids){
    const item=expected.items.find(i=>i.id===id);
    if(!item||item.state!=='TESTING'||!Array.isArray(item.blockers))return false;
    item.state='READY';item.blockers=[];
   }
   return JSON.stringify(expected)===JSON.stringify(p.queue);
  }catch{return false;}
 }
 const x=manifest?.prospective_ready_preview;
 if(x?.status!=='PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING'||
  x.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
  manifest?.kind!==CANDIDATE_KIND||manifest?.publication_authorized!==false||
  manifest?.published_source_sha!=='2d22d448160d428a977f06482323646b92818fcf'||
  manifest?.development_source_sha!=='544b06558ab9ab6df4eea0410277b1a3c19f2fe4'||
  !Array.isArray(manifest?.selected_ready_item_ids)||
  manifest.selected_ready_item_ids.length!==1||
  manifest.selected_ready_item_ids[0]!==x.selected_id||
  manifest?.candidate_branch!=='release-candidates/prospect3889-544b06558ab9ab6df4ee'||
  liveQueue!==candidateQueue)return false;
 try{
  const original=JSON.parse(originalQueue),proposed=JSON.parse(candidateQueue);
  if(queueSchemaErrors(original).length||queueSchemaErrors(proposed).length||
     JSON.stringify(original.published_base)!==JSON.stringify(proposed.published_base)||
     original.items.length!==proposed.items.length)return false;
  const before=original.items.find(i=>i.id===x.selected_id);
  if(!before||before.state!=='TESTING'||!SHA.test(before.merged_source_sha||'')||
     !Array.isArray(before.blockers))return false;
  const expected=JSON.parse(JSON.stringify(original));
  const row=expected.items.find(i=>i.id===x.selected_id);
  row.state='READY';row.blockers=[];
  return JSON.stringify(expected)===JSON.stringify(proposed);
 }catch{return false;}
}

// Seven independently reviewed nonshipped QA/restoration paths in the exact
// 2026-11-23 #3889 prospective Git tree. Do not permit arbitrary extra paths
// or transfer this narrow review to another candidate/feature.
export function reviewedProspectiveQaRestorationPaths({manifest,queue,developmentSourceSha,
 publishedSourceSha,candidateSha,sourceObjectAt}={}){
 const x=manifest?.nonpublishing_qa_restoration;
 if(x===undefined)return [];
 const hold=why=>{throw Error('Prospective QA source restoration HOLD: '+why);};
 const id='DIC-Q-509-stale-project-shot-comment-20261122';
 const baseline='2d22d448160d428a977f06482323646b92818fcf';
 const development='544b06558ab9ab6df4eea0410277b1a3c19f2fe4';
 const candidate='16bc481b2c66c5229c70e513c76141b086b8e535';
 const restored=[
  ['scripts/audit/run-full-suite.mjs','4c76dc5721eec24b002bcd62055b116911ae6c4e'],
  ['tests/ci-optimization.test.mjs','21dc97fee802315487cb95e07678f02023989d21']
 ];
 const excluded=[
  'scripts/audit/issue33-r429-ohenry320-sodality341-check.mjs',
  'scripts/audit/issue33-r430-disciples-original100-check.mjs',
  'scripts/audit/issue33-r431-staccato-original354-check.mjs',
  'scripts/audit/issue33-r433-duesouth-selected-check.mjs',
  'scripts/audit/issue33-r434-south17-selected-check.mjs'
 ];
 const qa=[
  {path:'tests/helpers/release-published-restoration.mjs',source_sha:'fe1dd86406dc1c984dd4024a47225d1f8d4a40c0'},
  {path:'tests/preflight-contract.test.mjs',source_sha:'f893c068e20c2445bc5596eda6b36c832974f195'}
 ];
 const p=manifest?.prospective_ready_preview;
 if(p?.status!=='PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING'||
  p.selected_id!==id||
  p.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
  manifest?.publication_authorized!==false||
  manifest?.candidate_branch!=='release-candidates/prospect3889-544b06558ab9ab6df4ee'||
  !Array.isArray(manifest?.selected_ready_item_ids)||
  manifest.selected_ready_item_ids.length!==1||manifest.selected_ready_item_ids[0]!==id||
  queue?.items?.find(i=>i.id===id)?.state!=='READY'||
  developmentSourceSha!==development||publishedSourceSha!==baseline||
  candidateSha!==candidate||typeof sourceObjectAt!=='function'||
  x.reviewed_source_reference_sha!=='b1cbddd2fcbabcd5bf5ef00f48ca9d2e9475cb77'||
  x.reviewed_source_reference_tree_sha!=='ac379329eb318e49d1f71df1c5217f750953981b'||
  x.merged_qa_candidate_fix_sha!==development||
  x.changed_executable_paths_exactly_seven!==true||
  x.certified_ready!==false||x.publication_authorized!==false||
  !Array.isArray(x.restored_to_published_nonshipped_paths)||
  !Array.isArray(x.excluded_unready_nonshipped_paths)||
  !equal(x.restored_to_published_nonshipped_paths,restored.map(y=>y[0]))||
  !equal(x.excluded_unready_nonshipped_paths,excluded)||
  JSON.stringify(x.reviewed_merged_qa_test_blobs)!==JSON.stringify(qa))
  hold('frozen source identity, seven-path allowlist or exact merged QA evidence mismatch');
 for(const [path,blob] of restored)
  if(sourceObjectAt(publishedSourceSha,path)!=='100644:'+blob||
     sourceObjectAt(candidateSha,path)!=='100644:'+blob||
     sourceObjectAt(developmentSourceSha,path)==='100644:'+blob)
   hold('restored published Git blob mismatch: '+path);
 for(const path of excluded)
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(candidateSha,path)!==null||
     !/^100644:[a-f0-9]{40}$/.test(sourceObjectAt(developmentSourceSha,path)||''))
   hold('excluded unready QA source was not independently absent: '+path);
 for(const {path,source_sha} of qa)
  if(sourceObjectAt(developmentSourceSha,path)!=='100644:'+source_sha||
     sourceObjectAt(candidateSha,path)!=='100644:'+source_sha)
   hold('merged compatibility QA source blob mismatch: '+path);
 return [...restored.map(y=>y[0]),...excluded];
}



// #3889: reuse the exact previously certified nonshipped restoration for
// this two-ID batch only. Never infer permission from a path name or manifest.
const BATCH_QA_REFERENCE='544b06558ab9ab6df4eea0410277b1a3c19f2fe4';
const BATCH_QA_CERTIFIED='16bc481b2c66c5229c70e513c76141b086b8e535';
const BATCH_QA_PUBLISHED='2d22d448160d428a977f06482323646b92818fcf';
const BATCH_QA_IDS=['DIC-Q-33-r399-original99-producer-tenure-precision','DIC-Q-509-stale-project-shot-comment-20261122'];
const BATCH_QA_MERGES=['513f98ac06cdd0fe569390354420158458342859','5b5159823908f3ae660f45b3ad93c096be586aec'];
export const BATCH_QA_PATHS=[
 'scripts/audit/run-full-suite.mjs',
 'tests/ci-optimization.test.mjs',
 'scripts/audit/issue33-r429-ohenry320-sodality341-check.mjs',
 'scripts/audit/issue33-r430-disciples-original100-check.mjs',
 'scripts/audit/issue33-r431-staccato-original354-check.mjs',
 'scripts/audit/issue33-r433-duesouth-selected-check.mjs',
 'scripts/audit/issue33-r434-south17-selected-check.mjs'
].sort();
// The original certified READY1 candidate and the new #3919 development merge
// have different reviewed, nonshipped QA blobs. Both identities are required.
const BATCH_QA_MERGED_FIX='e7508effcb45a77c0f73c8f2f236d6e5b3ffe8d0';
const BATCH_QA_SUPPORT=[
 ['tests/helpers/release-published-restoration.mjs','8ba8fd6f41cb5193a892868efd0c87840af24d90','fe1dd86406dc1c984dd4024a47225d1f8d4a40c0'],
 ['tests/preflight-contract.test.mjs','f2aab94820d72d5c9f51cefa46137d5593b3a276','f893c068e20c2445bc5596eda6b36c832974f195']
];
// #3889 arbitrary-cohort compatibility. Preserve the original READY1/READY2
// proof exactly, and only use the new merged support after independent
// prospective-plan replay. Never use an untrusted manifest to select QA paths.
const GENERAL_BATCH_QA_FIX='b58c1a4c856fc65a56bf27b2a0ded20245f6351b';
const GENERAL_BATCH_PRIOR='0317f0ac5b627dff27180acfcb9c014a4c1ef0e5';
const GENERAL_BATCH_SUPPORT=[
 ['tests/helpers/release-published-restoration.mjs','7a13c4b9a76a9fb03a491d33e559fc4cd9709e1c','8ba8fd6f41cb5193a892868efd0c87840af24d90'],
 ['tests/preflight-contract.test.mjs','77f41ca1c434271a1100dfc3e27fa18ef110800d','f2aab94820d72d5c9f51cefa46137d5593b3a276'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3936: the new exact merged QA repair is a separate reviewed generation.
// Keep the previous generation verifiable for immutable READY8 evidence; reject
// mixed/unknown generations instead of accepting arbitrary current QA bytes.
const GENERAL_BATCH_QA_FIX_V2='85ece2e2b4e38b3445e5125045748dd212e421d4';
const GENERAL_BATCH_SUPPORT_V2=[
 ['tests/helpers/release-published-restoration.mjs','241d2013e3a0c6473e68c7c738592d71428b6f0a','7a13c4b9a76a9fb03a491d33e559fc4cd9709e1c'],
 ['tests/preflight-contract.test.mjs','5317e8d96e14a4d1fc4e7b668f13c342f9cb335d','77f41ca1c434271a1100dfc3e27fa18ef110800d'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3940 independently verified selected-only first-parent QA, exact merged bytes.
// Historical generations remain independently verifiable; mixed support HOLDS.
const GENERAL_BATCH_QA_FIX_V3='c4b3f2c10d54a4790cc0cd0b2b3b190dc46e501a';
const GENERAL_BATCH_SUPPORT_V3=[
 ['tests/helpers/release-published-restoration.mjs','cdfe549202ef91d917476968de3567a66c6113c2','241d2013e3a0c6473e68c7c738592d71428b6f0a'],
 ['tests/preflight-contract.test.mjs','13f7b9da15639ce131ce82ef7a6e7e9ea2d26baf','5317e8d96e14a4d1fc4e7b668f13c342f9cb335d'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3942 exact selected-test and direct-child independent QA.
const GENERAL_BATCH_QA_FIX_V4='22254f501af8c0d5f6f89763ea5387b755fdd0bf';
const GENERAL_BATCH_SUPPORT_V4=[
 ['tests/helpers/release-published-restoration.mjs','61a2010c1726b5c719eebf3afe933194ee8bed10','cdfe549202ef91d917476968de3567a66c6113c2'],
 ['tests/preflight-contract.test.mjs','76904dbfe1e57df278601c4bf846f2f02a69a754','13f7b9da15639ce131ce82ef7a6e7e9ea2d26baf'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3947 independently reviewed R405 published test guard.
const GENERAL_BATCH_QA_FIX_V5='542949c23fbbf481de00acdbd77e6c926ebde879';
const GENERAL_BATCH_SUPPORT_V5=[
 ['tests/helpers/release-published-restoration.mjs','04f6010a7c2ca781b3e9c0eca3bf18d83e623826','61a2010c1726b5c719eebf3afe933194ee8bed10'],
 ['tests/preflight-contract.test.mjs','24518329594e4937675c4c30a0d82c73e2882215','76904dbfe1e57df278601c4bf846f2f02a69a754'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3949 reviewed exact shared SQL support and published amended fixture.
const GENERAL_BATCH_QA_FIX_V6='09c45de5063e1d743ce497aea2557974c86f52ca';
const GENERAL_BATCH_SUPPORT_V6=[
 ['tests/helpers/release-published-restoration.mjs','03ea670669ec6ebd14c23106d55c33aea56d5220','04f6010a7c2ca781b3e9c0eca3bf18d83e623826'],
 ['tests/preflight-contract.test.mjs','dc947f96e3d3f7efd7f74f8709db5b988791bb71','24518329594e4937675c4c30a0d82c73e2882215'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
function generalBatchQaGeneration(developmentSourceSha,sourceObjectAt){
 const generations=[
  {fix:GENERAL_BATCH_QA_FIX_V6,prior:GENERAL_BATCH_QA_FIX_V5,support:GENERAL_BATCH_SUPPORT_V6},
  {fix:GENERAL_BATCH_QA_FIX_V5,prior:GENERAL_BATCH_QA_FIX_V4,support:GENERAL_BATCH_SUPPORT_V5},
  {fix:GENERAL_BATCH_QA_FIX_V4,prior:GENERAL_BATCH_QA_FIX_V3,support:GENERAL_BATCH_SUPPORT_V4},
  {fix:GENERAL_BATCH_QA_FIX_V3,prior:GENERAL_BATCH_QA_FIX_V2,support:GENERAL_BATCH_SUPPORT_V3},
  {fix:GENERAL_BATCH_QA_FIX_V2,prior:GENERAL_BATCH_QA_FIX,support:GENERAL_BATCH_SUPPORT_V2},
  {fix:GENERAL_BATCH_QA_FIX,prior:GENERAL_BATCH_PRIOR,support:GENERAL_BATCH_SUPPORT}
 ];
 const matched=generations.filter(g=>g.support.every(([path,blob,prior])=>
  sourceObjectAt(developmentSourceSha,path)==='100644:'+blob&&
  sourceObjectAt(g.fix,path)==='100644:'+blob&&
  sourceObjectAt(g.prior,path)==='100644:'+prior));
 if(matched.length!==1)throw Error('Prospective generalized batch QA restoration HOLD: exact reviewed QA generation missing or mixed');
 return matched[0];
}
function discoverGeneralBatchQaRestoration({queue,selectedIds,publishedSourceSha,
 developmentSourceSha,sourceObjectAt,prospectiveBatchPlan:p}){
 const hold=why=>{throw Error('Prospective generalized batch QA restoration HOLD: '+why);};
 if(!p||!['DIC-PROSPECTIVE-DISJOINT-BATCH-3889-V1','DIC-PROSPECTIVE-CHRONOLOGICAL-BATCH-3889-V2'].includes(p.kind)||
  p.status!=='PROSPECTIVE_BATCH_PLAN_ONLY'||p.publication_authorized!==false||p.ready_certified!==false||
  p.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
  p.development_source_sha!==developmentSourceSha||p.published_base?.tested_source_sha!==publishedSourceSha||
  publishedSourceSha!==BATCH_QA_PUBLISHED||!SHA.test(developmentSourceSha||'')||
  typeof sourceObjectAt!=='function'||!Array.isArray(selectedIds)||
  !Array.isArray(p.added_ids)||!p.added_ids.length||!Array.isArray(p.retained_ready_ids)||
  !/^[a-f0-9]{64}$/.test(p.identity_sha256||'')||
  JSON.stringify(queue)!==JSON.stringify(p.queue)||
  !equal(selectedIds,[...p.added_ids,...p.retained_ready_ids])||
  !equal(selectedIds,queue.items.filter(i=>i.state==='READY').map(i=>i.id))||
  new Set(selectedIds).size!==selectedIds.length)
  hold('exact replayed prospective plan and selected queue required');
 const selected=selectedIds.map(id=>queue.items.find(i=>i.id===id));
 if(selected.some(i=>!i||i.state!=='READY'||!SHA.test(i.merged_source_sha||'')))
  hold('selected merge evidence missing');
 const selectedOwns=path=>selected.some(i=>
  i.scope_paths?.includes(path)||sourceObjectAt(i.merged_source_sha,path)!==sourceObjectAt(i.merged_source_sha+'^',path));
 // A compatibility helper cannot silently replace a selected test or source.
 const generation=generalBatchQaGeneration(developmentSourceSha,sourceObjectAt);
 for(const [path] of generation.support){
  if(selectedOwns(path))hold('selected or changed reviewed compatibility support: '+path);
 }
 const restored=[];
 for(const path of BATCH_QA_PATHS){
  // Selected owners retain their own reviewed source and original tests;
  // the generalized candidate QA verifies that exact Git chain separately.
  if(selectedOwns(path))continue;
  const current=sourceObjectAt(developmentSourceSha,path);
  const reference=sourceObjectAt(BATCH_QA_REFERENCE,path);
  const published=sourceObjectAt(publishedSourceSha,path);
  if(!/^100644:[a-f0-9]{40}$/.test(current||'')||current!==reference||
   current===published||sourceObjectAt(GENERAL_BATCH_PRIOR,path)!==published||
   sourceObjectAt(BATCH_QA_CERTIFIED,path)!==published)
   hold('reviewed nonselected QA source drift: '+path);
  restored.push(path);
 }
 return restored;
}
export function discoverReviewedBatchQaRestoration({queue,selectedIds,publishedSourceSha,
 developmentSourceSha,sourceObjectAt,prospectiveBatchPlan=null}={}){
 if(!Array.isArray(selectedIds)||!equal(selectedIds,BATCH_QA_IDS)){
  if(!prospectiveBatchPlan)return [];
  return discoverGeneralBatchQaRestoration({queue,selectedIds,publishedSourceSha,
   developmentSourceSha,sourceObjectAt,prospectiveBatchPlan});
 }
 const hold=why=>{throw Error('Prospective batch QA restoration HOLD: '+why);};
 if(publishedSourceSha!==BATCH_QA_PUBLISHED||!SHA.test(developmentSourceSha||'')||
    typeof sourceObjectAt!=='function')hold('published baseline or Git reader mismatch');
 for(let n=0;n<BATCH_QA_IDS.length;n++){
  const row=queue?.items?.find(x=>x.id===BATCH_QA_IDS[n]);
  if(row?.state!=='READY'||row.merged_source_sha!==BATCH_QA_MERGES[n])
   hold('selected merge identity changed');
 }
 for(const path of BATCH_QA_PATHS){
  const current=sourceObjectAt(developmentSourceSha,path);
  const previous=sourceObjectAt(BATCH_QA_REFERENCE,path);
  const published=sourceObjectAt(publishedSourceSha,path);
  if(!/^100644:[a-f0-9]{40}$/.test(current||'')||current!==previous||
     current===published||sourceObjectAt(BATCH_QA_CERTIFIED,path)!==published)
   hold('reviewed source drift: '+path);
  for(const merge of BATCH_QA_MERGES)
   if(sourceObjectAt(merge,path)!==sourceObjectAt(merge+'^',path))
    hold('selected merge owns QA path: '+path);
 }
 for(const [path,mergedBlob,priorCertifiedBlob] of BATCH_QA_SUPPORT)
  if(sourceObjectAt(developmentSourceSha,path)!=='100644:'+mergedBlob||
     sourceObjectAt(BATCH_QA_MERGED_FIX,path)!=='100644:'+mergedBlob||
     sourceObjectAt(BATCH_QA_CERTIFIED,path)!=='100644:'+priorCertifiedBlob||
     sourceObjectAt(publishedSourceSha,path)==='100644:'+mergedBlob)
   hold('reviewed merged compatibility QA provenance changed: '+path);
 return [...BATCH_QA_PATHS];
}
export function reviewedBatchQaRestorationPaths({manifest,queue,developmentSourceSha,
 publishedSourceSha,candidateSha,sourceObjectAt,prospectiveBatchPlan=null}={}){
 const selectedIds=manifest?.selected_ready_item_ids;
 const generalized=manifest?.prospective_ready_batch_preview&&prospectiveBatchPlan&&!equal(selectedIds,BATCH_QA_IDS);
 const expected=manifest?.prospective_ready_batch_preview?
  discoverReviewedBatchQaRestoration({queue,selectedIds,developmentSourceSha,publishedSourceSha,
   sourceObjectAt,prospectiveBatchPlan}):[];
 const declared=manifest?.restored_reviewed_batch_qa_paths||[];
 if(!Array.isArray(declared)||!equal(declared,expected))
  throw Error('Prospective batch QA restoration HOLD: exact manifest path set mismatch');
 for(const path of expected)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   throw Error('Prospective batch QA restoration HOLD: candidate differs from published '+path);
 if(generalized||expected.length)for(const [path,blob] of (generalized?generalBatchQaGeneration(developmentSourceSha,sourceObjectAt).support:BATCH_QA_SUPPORT))
  if(sourceObjectAt(candidateSha,path)!=='100644:'+blob)
   throw Error('Prospective batch QA restoration HOLD: candidate compatibility support changed '+path);
 return expected;
}

// #3889 last journal-only staging delta: the prospective frozen source predates
// two nonshipped scoped journal entries. This narrow byte-pinned historical
// prefix is not a selected deployable change or generalized journal exemption.
export function reviewedProspectiveScopedJournalPath({manifest,queue,developmentSourceSha,
 publishedSourceSha,candidateSha,sourceObjectAt}={}){
 const x=manifest?.prospective_ready_preview;
 if(x===undefined)return [];
 const hold=why=>{throw Error('Prospective scoped journal HOLD: '+why);};
 const id='DIC-Q-509-stale-project-shot-comment-20261122';
 const parent='544b06558ab9ab6df4eea0410277b1a3c19f2fe4';
 const child='16bc481b2c66c5229c70e513c76141b086b8e535';
 const path='docs/workstreams/issue-3889.md';
 if(developmentSourceSha!==parent||candidateSha!==child||
    publishedSourceSha!=='2d22d448160d428a977f06482323646b92818fcf'||
    manifest?.candidate_branch!=='release-candidates/prospect3889-544b06558ab9ab6df4ee'||
    manifest?.publication_authorized!==false||
    !Array.isArray(manifest?.selected_ready_item_ids)||
    manifest.selected_ready_item_ids.length!==1||manifest.selected_ready_item_ids[0]!==id||
    x.status!=='PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING'||
    x.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
    x.selected_id!==id||queue?.items?.find(i=>i.id===id)?.state!=='READY'||
    typeof sourceObjectAt!=='function')
  hold('immutable parent, candidate, selected READY scope or nonpublisher guard mismatch');
 if(sourceObjectAt(publishedSourceSha,path)!==null||
    sourceObjectAt(developmentSourceSha,path)!=='100644:26f10fff12e31e2c70215af9adb3d5832892b62b'||
    sourceObjectAt(candidateSha,path)!=='100644:3e90ae0193c1fbb4dbaa3b00005df07143b337b1')
  hold('historical source prefix and exact staged Git journal blobs differ');
 return [path];
}

// Production publication must never edit/create GitHub Actions workflows.
// The Actions GITHUB_TOKEN publisher has no workflows scope. Keep all CI
// workflow evolution on main/development and restore exact published bytes
// in the isolated source, without weakening READY feature/test gating.
export const workflowChangedPaths=paths=>sorted([...new Set((Array.isArray(paths)?paths:[])
 .filter(p=>typeof p==='string'&&/^\.github\/workflows\/[A-Za-z0-9_./-]+\.ya?ml$/.test(p)))]);
export const REVIEWED_WORKFLOW_TEST=Object.freeze({
 path:'tests/issue455-browser-dependency-install-fallback.test.mjs',
 sourceBlob:'32174be8c42ba9ae73085e0f6f1f42613b2b08db',
 restoredWorkflow:'.github/workflows/cloud-regression.yml'
});
export const REVIEWED_CI_FAST_PR_TEST=Object.freeze({
 path:'tests/fast-pr-check.test.mjs',sourceBlob:'d11a0f702d35032e3442bfc8ee8671216f3496f8',
 restoredWorkflow:'.github/workflows/cloud-beta-ci.yml'
});
// Full published workflow bytes never execute newer workflow-only tests.
export function discoverReviewedWorkflowTestExclusions({publishedSourceSha,
 developmentSourceSha,restoredWorkflows,sourceObjectAt}={}){
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredWorkflows))return [];
 return sorted([REVIEWED_WORKFLOW_TEST,REVIEWED_CI_FAST_PR_TEST]
  .filter(spec=>restoredWorkflows.includes(spec.restoredWorkflow)&&
   sourceObjectAt(publishedSourceSha,spec.path)===null&&
   sourceObjectAt(developmentSourceSha,spec.path)==='100644:'+spec.sourceBlob)
  .map(spec=>spec.path));
}

export const REVIEWED_SOURCE_PATH_CASE_SQL_TEST=Object.freeze({
 path:'supabase/tests/coffee_identity_matching.sql',
 itemId:'DIC-Q-509-source-path-case-guard-20261115',
 migration:'supabase/migrations/20261115124500_dic_source_key_path_case_guard.sql',
 sourceMerge:'9a7ffa65955d8c2b81e41153653e19fc512f3a31',
 publishedBlob:'831bcc8535337d9bb4a028fb7688e1d3b6c57d27',
 unpublishedBlob:'1047d26527ddcb922fe8a366c7806e47b3e32b0c'
});
// Restore a pre-existing SQL test to its EXACT last-published Git object only
// when the single, independently tracked TESTING migration introduced its
// newer assertions. This is never permission to delete an unrelated test or
// to silently certify the unfinished migration.
export function discoverReviewedRestoredSqlTests({queue,restoredPaths,publishedSourceSha,
 developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const original=REVIEWED_SOURCE_PATH_CASE_SQL_TEST;
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredPaths)||
    !Array.isArray(selectedReadyItems))
  throw Error('SQL test restoration provenance unavailable');
 const same=(ref,path,blob)=>sourceObjectAt(ref,path)===(blob?'100644:'+blob:null);
 // A reviewed fixture is not inherently unready. If its actual migration
 // owner is selected, retain the exact test and prove the selected first-
 // parent change, current object and historical reviewed bytes independently.
 // This is not a test waiver or a new admission path for a queue row.
 const selectedFixture=spec=>{
  // A shared fixture can have several independently selected migration owners.
  // Admit the whole exact reviewed chain or none; a partial selection cannot
  // safely retain the final fixture or restore away a selected regression.
  if(spec.chain){
   const steps=spec.chain, paths=steps.map(x=>x.migration);
   const chosen=selectedReadyItems.filter(i=>i.scope_paths?.some(p=>paths.includes(p)));
   const current=sourceObjectAt(developmentSourceSha,spec.path);
   if(!chosen.length&&current===null&&sourceObjectAt(publishedSourceSha,spec.path)===null)return false;
   const hold=()=>{throw Error('Shared SQL fixture lacks complete exact source/migration provenance: '+spec.path);};
   if((chosen.length!==0&&chosen.length!==steps.length)||
      !same(publishedSourceSha,spec.path,spec.publishedBlob)||
      !same(developmentSourceSha,spec.path,spec.unpublishedBlob))hold();
   let previous=spec.publishedBlob;
   for(const step of steps){
    const owners=(queue?.items||[]).filter(i=>i.state!=='DEPLOYED'&&i.scope_paths?.includes(step.migration));
    const row=owners[0], selected=chosen.filter(i=>i.id===step.id);
    if(owners.length!==1||row?.id!==step.id||row.issue!==509||
       row.scope_paths.length!==1||row.merged_source_sha!==step.merge||
       (chosen.length?row.state!=='READY'||selected.length!==1||selected[0].issue!==509||
        selected[0].merged_source_sha!==step.merge||selected[0].scope_paths.length!==1||
        selected[0].scope_paths[0]!==step.migration||
        (selected[0].state!==undefined&&selected[0].state!=='READY')||restoredPaths.includes(step.migration):
        !['TESTING','IN_PROGRESS','BLOCKED'].includes(row.state)||!restoredPaths.includes(step.migration))||
       !same(publishedSourceSha,step.migration,null)||!same(step.merge+'^',step.migration,null)||
       !same(step.merge,step.migration,step.migrationBlob)||!same(developmentSourceSha,step.migration,step.migrationBlob)||
       !same(step.merge+'^',spec.path,previous)||!same(step.merge,spec.path,step.after))hold();
    previous=step.after;
   }
   if(previous!==spec.unpublishedBlob)hold();
   for(const other of selectedReadyItems.filter(i=>!steps.some(x=>x.id===i.id)))
    if(!SHA.test(other.merged_source_sha||'')||
       sourceObjectAt(other.merged_source_sha,spec.path)!==sourceObjectAt(other.merged_source_sha+'^',spec.path))hold();
   return chosen.length===steps.length;
  }
  const chosen=selectedReadyItems.filter(i=>i.scope_paths?.includes(spec.migration));
  if(!chosen.length)return false;
  const item=chosen[0],merge=item.merged_source_sha;
  const owners=(queue?.items||[]).filter(i=>i.scope_paths?.includes(spec.migration)&&i.state!=='DEPLOYED');
  const row=owners[0];
  const migration=sourceObjectAt(developmentSourceSha,spec.migration);
  if(chosen.length!==1||owners.length!==1||item.issue!==509||(item.state!==undefined&&item.state!=='READY')||
     row?.id!==item.id||row.issue!==509||row.state!=='READY'||
     row.merged_source_sha!==merge||item.scope_paths.length!==1||
     row.scope_paths.length!==1||(spec.itemId&&item.id!==spec.itemId)||
     !SHA.test(merge||'')||restoredPaths.includes(spec.migration)||
     !/^100644:[a-f0-9]{40}$/.test(migration||'')||
     sourceObjectAt(publishedSourceSha,spec.migration)!==null||
     sourceObjectAt(merge+'^',spec.migration)!==null||
     sourceObjectAt(merge,spec.migration)!==migration||
     sourceObjectAt(spec.sourceMerge,spec.migration)!==migration||
     !same(publishedSourceSha,spec.path,spec.publishedBlob)||
     !same(merge+'^',spec.path,spec.publishedBlob)||
     !same(merge,spec.path,spec.unpublishedBlob)||
     !same(spec.sourceMerge,spec.path,spec.unpublishedBlob)||
     !same(developmentSourceSha,spec.path,spec.unpublishedBlob))
   throw Error('Selected READY SQL fixture lacks exact source/migration provenance: '+spec.path);
  for(const other of selectedReadyItems.filter(i=>i.id!==item.id)){
   if(!SHA.test(other.merged_source_sha||'')||
      sourceObjectAt(other.merged_source_sha,spec.path)!==sourceObjectAt(other.merged_source_sha+'^',spec.path))
    throw Error('Other selected READY merge modified SQL fixture: '+spec.path);
  }
  return true;
 };
 // No migration is being excluded, so there is no migration-specific SQL
 // fixture to restore. Synthetic READY-only tests legitimately have no SQL.
 if(!restoredPaths.some(path=>path.startsWith('supabase/migrations/'))){
  const original=REVIEWED_SOURCE_PATH_CASE_SQL_TEST;
  if(!selectedFixture(original)&&sourceObjectAt(developmentSourceSha,original.path)==='100644:'+original.unpublishedBlob)
   throw Error('Unready SQL case-path test source/owner is not independently attributable');
  for(const fixture of REVIEWED_UNREADY_SQL_SUITE)
   if(!selectedFixture(fixture)&&sourceObjectAt(developmentSourceSha,fixture.path)==='100644:'+fixture.unpublishedBlob)
    throw Error('Unready SQL regression source lacks excluded TESTING migration: '+fixture.path);
  return [];
 }
 const restored=[];
 const readyUnchanged=path=>{
  for(const item of selectedReadyItems){
   if(!SHA.test(item.merged_source_sha||'')||
      sourceObjectAt(item.merged_source_sha,path)!==
       sourceObjectAt(item.merged_source_sha+'^',path))
    throw Error('Selected READY merge modified an unready SQL test: '+item.id+' '+path);
  }
 };
 const originalCurrent=sourceObjectAt(developmentSourceSha,original.path);
 if(!selectedFixture(original)&&originalCurrent==='100644:'+original.unpublishedBlob){
  if(!same(publishedSourceSha,original.path,original.publishedBlob))
   throw Error('Published SQL identity test blob has unreviewed drift');
  const owner=queue?.items?.find(i=>i.id===original.itemId);
  if(owner?.issue!==509||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
     owner.merged_source_sha!==original.sourceMerge||
     !Array.isArray(owner.scope_paths)||owner.scope_paths.length!==1||
     owner.scope_paths[0]!==original.migration||!restoredPaths.includes(original.migration)||
     sourceObjectAt(publishedSourceSha,original.migration)!==null||
     sourceObjectAt(developmentSourceSha,original.migration)===null||
     !same(original.sourceMerge,original.path,original.unpublishedBlob)||
     !same(original.sourceMerge+'^',original.path,original.publishedBlob))
   throw Error('Unready SQL case-path test source/owner is not independently attributable');
  readyUnchanged(original.path);
  restored.push(original.path);
 }else if(!selectedFixture(original)&&originalCurrent!==null){
  throw Error('Unreviewed SQL case-path test source drift');
 }
 for(const spec of REVIEWED_UNREADY_SQL_SUITE){
  if(selectedFixture(spec))continue;
  const current=sourceObjectAt(developmentSourceSha,spec.path);
  // Synthetic/older source fixtures without this exact unready test are not
  // eligible to restore it; an altered real test is always a HOLD.
  if(current===null&&sourceObjectAt(publishedSourceSha,spec.path)===null)continue;
  if(!same(developmentSourceSha,spec.path,spec.unpublishedBlob)||
     !same(publishedSourceSha,spec.path,spec.publishedBlob))
   throw Error('Unreviewed current or published SQL test bytes: '+spec.path);
  const owner=queue?.items?.find(i=>i.issue===509&&
    ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
    Array.isArray(i.scope_paths)&&i.scope_paths.length===1&&
    i.scope_paths[0]===spec.migration);
  if(!owner||!restoredPaths.includes(spec.migration)||
     sourceObjectAt(publishedSourceSha,spec.migration)!==null||
     sourceObjectAt(developmentSourceSha,spec.migration)===null||
     !same(spec.sourceMerge,spec.path,spec.unpublishedBlob)||
     sourceObjectAt(spec.sourceMerge+'^',spec.path)===current)
   throw Error('Unready SQL regression test lacks exact source/migration provenance: '+spec.path);
  readyUnchanged(spec.path);
  restored.push(spec.path);
 }
 return sorted([...new Set(restored)]);
}

// Only these exact 13 reviewed post-published SQL test objects may be
// restored/removed with their separately TESTING migration. No READY-owned
// SQL test is eligible; hash or provenance drift remains a HOLD.
export const REVIEWED_UNREADY_SQL_SUITE=Object.freeze([
  {
    "path": "supabase/tests/admin_coffee_review.sql",
    "publishedBlob": "a3d1376e52bbe8b84bcf241f0de635d8f49062b4",
    "unpublishedBlob": "080e37931406845eae8e8f8e0430b3046ab616c1",
    "sourceMerge": "942c3d1b7051553ccd9c5795d2db2412418c56e7",
    "migration": "supabase/migrations/20261117130000_dic_admin_merge_null_normalized_name_guard.sql"
  },
  {
    "path": "supabase/tests/community_quality_integrity.sql",
    "publishedBlob": "149453cc3177203ca96762dbf8312c966c87eb98",
    "unpublishedBlob": "80c49e9e2a3a3e5c3be89660ff624864d487b25e",
    "sourceMerge": "a6373cd1b9f6451603e147271750f89641bd03e1",
    "migration": "supabase/migrations/20261116224000_dic_community_search_producer_parity.sql",
    "chain": [
      {
        "id": "DIC-Q-509-community-withdrawn-recheck-guard",
        "merge": "fa7d0ff7e0302ddd35c9dd1b0b02f2d34996a2ee",
        "migration": "supabase/migrations/20261115065000_dic_community_withdrawn_recheck_guard.sql",
        "migrationBlob": "d629d2f0cbd6c9f291a8b4538340c1de549f04a1",
        "after": "0beabbf0b3d724b22ac879eb74f3399d444ab345"
      },
      {
        "id": "DIC-Q-509-community-producer-search-parity",
        "merge": "c155d54fd16c49ecb8744a1c1bb1c7181491790b",
        "migration": "supabase/migrations/20261116224000_dic_community_search_producer_parity.sql",
        "migrationBlob": "4d4fc469de4dc5ee4d55f7b15ab35f80e6809ac2",
        "after": "80c49e9e2a3a3e5c3be89660ff624864d487b25e"
      }
    ]
  },
  {
    "path": "supabase/tests/source_worker_auth_and_admission.sql",
    "publishedBlob": "85c2138a84911016f1dffffb34a960049af34ded",
    "unpublishedBlob": "7a4c4d370f8cf8085d32084141758ffa2f78c40b",
    "sourceMerge": "6f271a49ee5904a78250a826bdfd1dce4d4843ad",
    "migration": "supabase/migrations/20261117133000_dic_source_retry_rollover_cooldown.sql"
  },
  {
    "path": "supabase/tests/universal_url_preview.sql",
    "publishedBlob": "4a18d99435b8ddc45406fdd3cfa7a520517f9705",
    "unpublishedBlob": "663e7728fac240e0b576aab27948427dd4100f0c",
    "sourceMerge": "12bdea41b49d0b4e558da11c2a6829e56e0e6c5a",
    "migration": "supabase/migrations/20261117114500_dic_shared_preview_rollover_cooldown.sql"
  },
  {
    "path": "supabase/tests/admin_edit_normalized_identity_guard.sql",
    "publishedBlob": null,
    "unpublishedBlob": "63f4c9d236f8fc727b8db3387128e79636f63b40",
    "sourceMerge": "e958c3acace0d908a4464b5cf95c0405510a1c8b",
    "migration": "supabase/migrations/20261118214500_dic_admin_edit_normalized_identity_guard.sql"
  },
  {
    "path": "supabase/tests/coffee_confirm_null_name_guard.sql",
    "publishedBlob": null,
    "unpublishedBlob": "afd1640a6514abbe8b4779fbcc052ed1ea5f99c7",
    "sourceMerge": "78969b25dc5c0f258b05cc3bfb4cc0fd83fb5dd5",
    "migration": "supabase/migrations/20261118113500_dic_confirm_coffee_null_name_guard.sql"
  },
  {
    "path": "supabase/tests/coffee_first_entry_no_self_alias.sql",
    "publishedBlob": null,
    "unpublishedBlob": "52afd0ebfc7ace8d9274ecd4ed2357ed54f91cf2",
    "sourceMerge": "bc4c79b3c75fc3ead13be581430d96cbb29401b4",
    "migration": "supabase/migrations/20261118114600_dic_first_entry_no_self_alias.sql"
  },
  {
    "path": "supabase/tests/coffee_historical_alias_suggestion_confirm.sql",
    "publishedBlob": null,
    "unpublishedBlob": "5e520243be220c7c9893c0cd875f86c319d51162",
    "sourceMerge": "d9df02a046ea3edef31e705f00568fee830a07fd",
    "migration": "supabase/migrations/20261118140000_dic_coffee_alias_suggestion_confirm.sql"
  },
  {
    "path": "supabase/tests/community_outlier_null_revision.sql",
    "publishedBlob": null,
    "unpublishedBlob": "43c7da7cc7df111c63ad42e56b95f44354e09115",
    "sourceMerge": "fd48065ca1b027e0f0425a040e1c041fcd4914d5",
    "migration": "supabase/migrations/20261118181500_dic_community_outlier_null_revision_guard.sql"
  },
  {
    "path": "supabase/tests/import_additional_credential_keys.sql",
    "publishedBlob": null,
    "unpublishedBlob": "670a5cd2fa299861e105f585e02a45996909182b",
    "sourceMerge": "949df84d4861cf316a82e82ea8201f158b1a1fd2",
    "migration": "supabase/migrations/20261116210000_dic_import_additional_credential_keys.sql"
  },
  {
    "path": "supabase/tests/legacy_private_hide_shot_retirement.sql",
    "publishedBlob": null,
    "unpublishedBlob": "7d9c4730b6e8c5170a7b5945d7730de5e5c42f3e",
    "sourceMerge": "835883b0180d6bb1e7ff3ec2293fafd9f09643f7",
    "migration": "supabase/migrations/20261118164500_dic_remove_legacy_private_hide_shot_handler.sql"
  },
  {
    "path": "supabase/tests/pending_canonical_name_response.sql",
    "publishedBlob": null,
    "unpublishedBlob": "70d6f1943402785e319a8651239c24598a30bf4e",
    "sourceMerge": "cccd5c0ebc63203326829f61d85b96403b951465",
    "migration": "supabase/migrations/20261116151600_dic_pending_canonical_name_response.sql"
  },
  {
    "path": "supabase/tests/recommendation_unique_controls.sql",
    "publishedBlob": null,
    "unpublishedBlob": "9ae348244ea6545b208e8ad1fbb76dff652b7da4",
    "sourceMerge": "8b4e4e3edc42c821aa9f6858e62b20fdd4300ef8",
    "migration": "supabase/migrations/20261118180000_dic_recommendation_unique_controls.sql"
  },
  {
    "path": "supabase/tests/admin_shot_delete_family_refresh.sql",
    "publishedBlob": null,
    "unpublishedBlob": "73849edbbd737b69ea5e33570c93a6844967c1ea",
    "sourceMerge": "78dac5c9a2506041f1e2439281ab526058436b14",
    "migration": "supabase/migrations/20261119105000_dic_admin_shot_delete_family_refresh.sql"
  },
  {
    "path": "supabase/tests/admin_account_delete_completed_receipt.sql",
    "publishedBlob": null,
    "unpublishedBlob": "5a9fc2b8d1c61d8b7c885d8bfec6f128160c35c2",
    "sourceMerge": "c0980ab013e6d9193a7a6c8fd0feeca3a5cb6aba",
    "migration": "supabase/migrations/20261119175000_dic_admin_delete_completed_retry_count.sql"
  },
  {
    "path": "supabase/tests/personal_family_refresh_single_pass_post.sql",
    "publishedBlob": null,
    "unpublishedBlob": "a04c6e40693577caec79d2678d155786bcfd26da",
    "sourceMerge": "c0e0963ce348e4ad0f499acf67f081efefe1e977",
    "migration": "supabase/migrations/20261119133000_dic_classify_family_refresh_single_pass.sql"
  }
]);

// Existing coffee tests were changed in exactly the same unfinished #33 R232
// merge as their runtime. Restore complete LAST-PUBLISHED test bytes when
// that runtime is deliberately restored, never delete/skip these regressions.
export const REVIEWED_R232_COFFEE_TEST=Object.freeze({
 item:'DIC-Q-33-r232-selected-annual-release-role',issue:33,
 merge:'b585b9cf646da868e6c7c8871289c82f6d96e6ca',
 runtime:'src/server/coffee-identity-evidence.mjs',
 oldRuntime:'c43e128ea1eb61d09dbaad4ce6a926eedcbe9e83',
 newRuntime:'a75ec662fec764f41982bcbb3bbfb2798f7c5b1d',
 testBlobs:Object.freeze({
  'tests/coffee-corpus-identity-regressions.test.mjs':Object.freeze({
   old:'7269450ec113a605499c694bea1a53cf7bcb03cf',
   newer:'d9e9ea3f27b12a0f44fc40ababdc2e4c319e3cee'}),
  'tests/universal-coffee-preview.test.mjs':Object.freeze({
   old:'8c49e473dbcb978860881654ff59e9d3224539a5',
   newer:'306c7d79f07f800f73ffc575b90ed881b57b8d67'})
 })
});
export function discoverReviewedRestoredR232CoffeeTests({queue,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_R232_COFFEE_TEST;
 if(!restoredPaths?.includes(s.runtime))return [];
 if(typeof sourceObjectAt!=='function'||!Array.isArray(selectedReadyItems))
  throw Error('R232 frozen coffee source proof unavailable');
 const owner=queue?.items?.find(i=>i.id===s.item);
 const obj=(sha,path)=>sourceObjectAt(sha,path);
 if(owner?.issue!==s.issue||owner.state!=='TESTING'||
    (owner.merged_source_sha!=null&&owner.merged_source_sha!==s.merge)||
    owner.scope_paths?.length!==1||owner.scope_paths[0]!==s.runtime||
    obj(publishedSourceSha,s.runtime)!=='100644:'+s.oldRuntime||
    obj(developmentSourceSha,s.runtime)!=='100644:'+s.newRuntime||
    obj(s.merge,s.runtime)!=='100644:'+s.newRuntime||
    obj(s.merge+'^',s.runtime)!=='100644:'+s.oldRuntime)
  throw Error('Unready R232 owner or runtime provenance mismatch');
 const paths=Object.keys(s.testBlobs).sort();
 for(const path of paths){
  const proof=s.testBlobs[path];
  if(obj(publishedSourceSha,path)!=='100644:'+proof.old||
     obj(developmentSourceSha,path)!=='100644:'+proof.newer||
     obj(s.merge,path)!=='100644:'+proof.newer||
     obj(s.merge+'^',path)!=='100644:'+proof.old)
   throw Error('R232 historical test Git object changed: '+path);
  for(const item of selectedReadyItems){
   if(!SHA.test(item.merged_source_sha||'')||
      obj(item.merged_source_sha,path)!==obj(item.merged_source_sha+'^',path))
    throw Error('Selected READY merge edited R232 test: '+path);
  }
 }
 return paths;
}


// #3347: preserve the COMPLETE published Admin test suite when the unfinished
// #509 search recovery is excluded. Test-only provenance, no product changes.
export const REVIEWED_UNREADY_ADMIN_TEST=Object.freeze({
 path:'tests/admin-records.test.mjs',
 runtime:'site/admin/main.js',
 owner:'DIC-Q-509-admin-search-recovery-visible',
 sourceMerge:'614e9ed2eb8db3cac1067a4a33fbc08b392123e0',
 published:'18121e3fca15bdb7470d8cbba067a8877411911c',
 development:'bd4e95b55c4f6b4f139739c77c4d1a215a8cf640',
 mergeParent:'637fcd5471383b36056d460e52ead81c160a0272'
});
export function discoverReviewedRestoredUnreadyAdminTests({queue,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_UNREADY_ADMIN_TEST;
 if(!restoredPaths?.includes(s.runtime))return [];
 if(typeof sourceObjectAt!=='function'||!Array.isArray(selectedReadyItems))
  throw Error('Unready Admin test exact provenance unavailable');
 const obj=(ref,path)=>sourceObjectAt(ref,path);
 const owner=queue?.items?.find(i=>i.id===s.owner);
 if(owner?.issue!==509||owner.state!=='TESTING'||
    owner.scope_paths?.length!==1||owner.scope_paths[0]!==s.runtime||
    obj(publishedSourceSha,s.runtime)===obj(developmentSourceSha,s.runtime)||
    obj(publishedSourceSha,s.path)!=='100644:'+s.published||
    obj(developmentSourceSha,s.path)!=='100644:'+s.development||
    obj(s.sourceMerge,s.path)!=='100644:'+s.development||
    obj(s.sourceMerge+'^',s.path)!=='100644:'+s.mergeParent)
  throw Error('Unready Admin test/source exact owner or Git blob changed');
 for(const item of selectedReadyItems){
  if(!SHA.test(item.merged_source_sha||'')||
     obj(item.merged_source_sha,s.path)!==obj(item.merged_source_sha+'^',s.path))
   throw Error('Selected READY merge modified excluded Admin tests: '+item.id);
 }
 return [s.path];
}


 // Exact previous PR #3675 source-only test isolation proof: the selected
 // startup merge restored two COMPLETE published tests before reintroducing
 // separately unfinished Log Shot work into development. Preserve all checks.
export const REVIEWED_STARTUP_MIXED_TESTS=Object.freeze({
 id:'DIC-Q-455-startup-recovery-deferred-worker',
 merge:'ffbf4656de2969326988d7b0ac0a21c3117575a6',
 runtime:'site/cloud/main.js',
 cleanRuntime:'fe9124fa1deeb84d7a41659c066f517f6311039e',
 tests:Object.freeze([
  Object.freeze({path:'tests/cloud-draft-recommendation-context.test.mjs',
   published:'a2218f85796f67d298b0ef5d06a980eaa92860ed',
   unready:'256646aa00684386e2af1efdc3b5d036c7d5fca3'}),
  Object.freeze({path:'tests/issue455-local-success-physical-bounds.test.mjs',
   published:'132486d9435888f9ddbb84a4e8bae8d9d6509abb',
   unready:'c7357cd031bab6b8bb9ae031a5aa1e477c651f6d'}),
  Object.freeze({path:'tests/ci-optimization.test.mjs',
   published:'91aadb1eccb64764253dc1344d6524ef42621fcc',unready:'4702f245499fde64922af965ceb23d73cf7a9a88'}),
  Object.freeze({path:'tests/issue2258-member-approval-notices.test.mjs',
   published:'179dc171aa7ab11b182b8832c3fd3f733dbc6824',unready:'48ac09eaf2a000200b444cc9104ffba50893e246'}),
  Object.freeze({path:'tests/sql-runner-coverage.test.mjs',
   published:'587d36c5931b1c14220914bd32460af5690984e9',unready:'9550fd21ff0edc93adbeed716e657a504a41d2e9'}),
  // Preserve complete last-published original603 audit entrypoint. An unrelated
  // unpublished R374 source change added imports into the frozen candidate.
  Object.freeze({path:'scripts/audit/issue33-original603-focused-source-review.mjs',
   published:'49b50fa3c1a1a07e61943ad98bbb2cc31c119fac',
   unready:'74d78a80b72305d67a9d346e60fc5fe977de2031'})
 ])
});
export function discoverReviewedRestoredStartupTests({queue,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_STARTUP_MIXED_TESTS;
 const selected=selectedReadyItems.find(i=>i.id===s.id);
 if(!selected)return [];
 if(typeof sourceObjectAt!=='function'||
    queue?.items?.find(i=>i.id===s.id)?.state!=='READY'||selected.issue!==455||
    selected.merged_source_sha!==s.merge||!selected.scope_paths?.includes(s.runtime)||
    !pinnedReadyPaths.includes(s.runtime)||!queue?.items?.some(i=>
      i.id!==s.id&&i.issue===455&&['TESTING','IN_PROGRESS'].includes(i.state)&&
      i.scope_paths?.includes(s.runtime)))
  throw Error('Startup test restoration lacks selected owner and mixed-file provenance');
 const obj=(ref,path)=>sourceObjectAt(ref,path);
 if(obj(s.merge,s.runtime)!=='100644:'+s.cleanRuntime||
    obj(developmentSourceSha,s.runtime)===obj(s.merge,s.runtime))
  throw Error('Startup clean runtime is not the reviewed pinned source blob');
 const restored=[];
 for(const spec of s.tests){
  const published=obj(publishedSourceSha,spec.path),current=obj(developmentSourceSha,spec.path);
  if(published===null&&current===null)continue;
  // The source-only trial may already contain the exact last-published audit
  // blob. It needs no replacement, but cannot be silently attributed to READY.
  if(published!=='100644:'+spec.published||
     (current!==published&&current!=='100644:'+spec.unready))
   throw Error('Startup test restoration unreviewed Git blob: '+spec.path);
  const merged=obj(s.merge,spec.path),firstParent=obj(s.merge+'^',spec.path);
  if(current===published){
   if(merged!==firstParent)
    throw Error('Selected READY merge changed already-published audit/test: '+spec.path);
  }else if(!((merged===published&&firstParent===current)||
             (merged===current&&firstParent===current)))
   throw Error('Startup test restoration first-parent drift: '+spec.path);
  for(const ready of selectedReadyItems.filter(i=>i.id!==s.id))
   if(!SHA.test(ready.merged_source_sha||'')||
      obj(ready.merged_source_sha,spec.path)!==obj(ready.merged_source_sha+'^',spec.path))
    throw Error('Another selected READY merge modified startup-coupled test: '+spec.path);
  if(current!==published)restored.push(spec.path);
 }
 return restored.sort();
}

const REVIEWED_OWNER_DRIVE_TEST=Object.freeze({
 path:'tests/dic-owner-drive-connect.test.mjs',
 runtime:'netlify/functions/dic-owner-drive-connect.mjs',
 itemId:'DIC-Q-28-owner-drive-browser-oauth-20261115'
});
function eligibleOwnerDriveTestExclusion({queue,restoredPaths,publishedSourceSha,
 developmentSourceSha,sourceObjectAt}){
 const i=queue?.items?.find(row=>row.id===REVIEWED_OWNER_DRIVE_TEST.itemId);
 return i?.issue===28&&['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
  i.scope_paths?.length===1&&i.scope_paths[0]===REVIEWED_OWNER_DRIVE_TEST.runtime&&
  restoredPaths?.includes(REVIEWED_OWNER_DRIVE_TEST.runtime)&&
  sourceObjectAt(publishedSourceSha,REVIEWED_OWNER_DRIVE_TEST.runtime)===null&&
  sourceObjectAt(developmentSourceSha,REVIEWED_OWNER_DRIVE_TEST.runtime)!==null&&
  sourceObjectAt(publishedSourceSha,REVIEWED_OWNER_DRIVE_TEST.path)===null&&
  sourceObjectAt(developmentSourceSha,REVIEWED_OWNER_DRIVE_TEST.path)!==null;
}
// Only new, issue-scoped tests for entirely restored unfinished/unselected
// runtime may be absent from a candidate. Selected READY test edits never vanish.

// #3347: newer #33 R324 fixture imports a symbol absent from the PINNED READY
// coffee parser. It is new/unpublished and owned by unready #33 work only.
export const REVIEWED_PINNED_COFFEE_TEST=Object.freeze({
 path:'tests/coffee-producer-team-disagreement.test.mjs',
 runtime:'src/server/coffee-page-metadata.mjs',
 merge:'c9b1bf2a1cecce9a67c84983eb1fd8d379f2d5f2',
 blob:'9a1263d7022311a5d313db64f1604e91504fce23'
});
function reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths,restoredPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt}){
 const s=REVIEWED_PINNED_COFFEE_TEST;
 if(path!==s.path||(!pinnedReadyPaths.includes(s.runtime)&&!restoredPaths.includes(s.runtime)))return false;
 const obj=(ref,p)=>sourceObjectAt(ref,p);
 if(!(queue?.items||[]).some(i=>i.issue===33&&
    ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
    i.scope_paths?.includes(s.runtime))||
    obj(publishedSourceSha,s.path)!==null||
    obj(developmentSourceSha,s.path)!=='100644:'+s.blob||
    obj(s.merge,s.path)!=='100644:'+s.blob||
    obj(s.merge+'^',s.path)!==null||
    obj(s.merge,s.runtime)===obj(s.merge+'^',s.runtime))
  throw Error('Unready pinned coffee test/source owner or Git blob changed');
 return true;
}
export function discoverExcludedUnreadyTests({queue,selectedIds,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,changedPaths,sourceObjectAt,compatibleAuditSupportPaths=[]}={}){
 if(typeof sourceObjectAt!=='function'||!Array.isArray(changedPaths)||
    !Array.isArray(restoredPaths)||!Array.isArray(selectedIds)||
    !SHA.test(publishedSourceSha||'')||!SHA.test(developmentSourceSha||''))
  throw Error('Unverifiable unfinished test exclusion inputs');
 const restored=new Set(restoredPaths), selected=new Set(selectedIds), result=[];
 const chosen=(queue?.items||[]).filter(i=>selected.has(i.id));
 for(const path of changedPaths){
  if(compatibleAuditSupportPaths.includes(path))continue;
  const m=typeof path==='string'?/^tests\/(?:coffee-)?issue([1-9][0-9]*)-[a-z0-9-]+\.test\.mjs$/.exec(path):null;
  const ownerDrive=path===REVIEWED_OWNER_DRIVE_TEST.path&&
   eligibleOwnerDriveTestExclusion({queue,restoredPaths,publishedSourceSha,
    developmentSourceSha,sourceObjectAt});
  const support=reviewedUnreadySupport(path,{queue,restoredPaths,pinnedReadyPaths,
   publishedSourceSha,developmentSourceSha,sourceObjectAt});
  const pinnedCoffee=reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt});
  if(!m&&!ownerDrive&&!support&&!pinnedCoffee)continue;
  const issue=pinnedCoffee?33:ownerDrive?28:support?.issue??Number(m[1]);
  // A named support helper may have an unfinished owner spanning exact published
  // restoration and a separately pinned READY file. reviewedUnreadySupport
  // already proves every owning path and the absent required runtime.
  if(!support&&!pinnedCoffee&&!(queue?.items||[]).some(i=>i.issue===issue&&!selected.has(i.id)&&
    ['IN_PROGRESS','TESTING','BLOCKED','READY'].includes(i.state)&&
    i.scope_paths?.length>0&&i.scope_paths.every(x=>restored.has(x))))continue;
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(developmentSourceSha,path)===null)continue;
  let touched=false;
  for(const i of chosen){
   if(!SHA.test(i.merged_source_sha||''))throw Error('Invalid selected READY merge');
   const blob=sourceObjectAt(i.merged_source_sha,path);
   if(blob!==null&&blob!==sourceObjectAt(i.merged_source_sha+'^',path)){touched=true;break;}
  }
  if(!touched)result.push(path);
 }
 return sorted([...new Set(result)]);
}


const REVIEWED_UNREADY_SUPPORT=Object.freeze({
 'scripts/audit/issue33-selected-product-heading.mjs':{
   itemId:'DIC-Q-33-r215-original325-327-current-offer-h2-water-decaf',
   issue:33, requiredRuntime:'src/server/coffee-selected-offer-h2.mjs'
 },
 'supabase/tests/member_approval_finish_null_receipts.sql':{
   itemId:'DIC-Q-509-member-approval-null-receipt-guard',
   issue:509, requiredRuntime:'supabase/migrations/20261114195000_dic_member_approval_finish_null_receipts.sql'
 },
 'scripts/audit/issue33-shopify-pagefly-h3.mjs':{
  itemId:'DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method',issue:33,
  requiredRuntime:'src/server/coffee-pagefly-selected-h3.mjs',
  sourceBlob:'825edd6c8ff2ff73ff65bebbee029924518eca82'
 },
 'supabase/tests/workspace_inactive_selection_guards.sql':{
  itemId:'DIC-Q-509-workspace-inactive-selection-guards',issue:509,
  requiredRuntime:'supabase/migrations/20261120044500_dic_workspace_inactive_selection_guards.sql',
  sourceBlob:'12bb65b7f4e1ea2c52a1b1704dcefa75cee931b7'
 },
 'scripts/audit/issue33-r374-original41-check.mjs':{
  itemId:'DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method',issue:33,
  requiredRuntime:'src/server/coffee-pagefly-selected-h3.mjs',
  sourceBlob:'6b47cfa4736189d91df71ed6867f9455065ce4b3'
 }
});
function reviewedUnreadySupport(path,{queue,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt}={}){
 const spec=REVIEWED_UNREADY_SUPPORT[path];
 if(!spec||!Array.isArray(restoredPaths)||!Array.isArray(pinnedReadyPaths))return null;
 const owner=queue?.items?.find(i=>i.id===spec.itemId);
 if(spec.sourceBlob&&sourceObjectAt(developmentSourceSha,path)!=='100644:'+spec.sourceBlob)return null;
 if(owner?.issue!==spec.issue||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
    !owner.scope_paths?.includes(spec.requiredRuntime)||
    !restoredPaths.includes(spec.requiredRuntime)||
    !owner.scope_paths.every(p=>restoredPaths.includes(p)||pinnedReadyPaths.includes(p))||
    (sourceObjectAt(publishedSourceSha,path)!==null&&
     !(path===REVIEWED_COMPATIBLE_AUDIT_SUPPORT.path&&
       sourceObjectAt(publishedSourceSha,path)==='100644:'+REVIEWED_COMPATIBLE_AUDIT_SUPPORT.historicalBlobSha))||
    sourceObjectAt(developmentSourceSha,path)===null||
    sourceObjectAt(publishedSourceSha,spec.requiredRuntime)!==null||
    sourceObjectAt(developmentSourceSha,spec.requiredRuntime)===null)return null;
 return spec;
}


export const REVIEWED_COMPATIBLE_AUDIT_SUPPORT=Object.freeze({
 path:'scripts/audit/issue33-selected-product-heading.mjs',
 historicalSourceSha:'3a361f2c187f7a77b317a321f82282c465dde6b2',
 historicalBlobSha:'7ce2de1fbf70261b006475ae43f1952c140228b6',
 unfinishedBlobSha:'96b1e529d0c7fb66339b34f78a25923c76556813'
});
// Replace ONLY the unready R215 audit helper with its previously reviewed,
// working immutable Git blob, rather than deleting 89 historical test imports.
// No runtime, SQL, READY test or GitHub workflow is replaced by this exception.
export function discoverCompatibleAuditSupport({queue,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const spec=REVIEWED_COMPATIBLE_AUDIT_SUPPORT;
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredPaths)||
    !Array.isArray(pinnedReadyPaths)||!Array.isArray(selectedReadyItems))return [];
 // The previous production commit already contains the helper. A newer
 // unfinished R215 mutation cannot replace it or erase its 88 existing tests.
 const published=sourceObjectAt(publishedSourceSha,spec.path);
 const current=sourceObjectAt(developmentSourceSha,spec.path);
 if(current==='100644:'+spec.unfinishedBlobSha&&
    published!=='100644:'+spec.historicalBlobSha)
   throw Error('Published historical audit helper bytes do not match reviewed source');
 if(published!=='100644:'+spec.historicalBlobSha||
    current!=='100644:'+spec.unfinishedBlobSha)return [];
 const owner=queue?.items?.find(i=>i.id==='DIC-Q-33-r215-original325-327-current-offer-h2-water-decaf');
 const runtime='src/server/coffee-selected-offer-h2.mjs';
 if(owner?.issue!==33||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
    !owner.scope_paths?.includes(runtime)||!restoredPaths.includes(runtime)||
    !owner.scope_paths.every(p=>restoredPaths.includes(p)||pinnedReadyPaths.includes(p))||
    sourceObjectAt(publishedSourceSha,runtime)!==null||
    sourceObjectAt(developmentSourceSha,runtime)===null)return [];
 if(sourceObjectAt(spec.historicalSourceSha,spec.path)!=='100644:'+spec.historicalBlobSha)
   throw Error('Reviewed pre-R215 audit helper blob provenance unavailable');
 for(const item of selectedReadyItems){
   if(!SHA.test(item?.merged_source_sha||''))
     throw Error('Selected READY helper provenance unavailable');
   if(sourceObjectAt(item.merged_source_sha,spec.path)!==
      sourceObjectAt(item.merged_source_sha+'^',spec.path))
     throw Error('Selected READY merge changed published heading helper: '+item.id);
 }
 return [spec.path];
}
// Cheap, source-bound pre-CI static import existence check. The exact app
// build remains mandatory for exported symbol/type/dynamic import semantics.
export function assertCandidateRelativeImports(paths,{readSource,hasPath}={}){
 if(!Array.isArray(paths)||typeof readSource!=='function'||typeof hasPath!=='function')
  throw Error('Candidate relative-import evidence unavailable');
 for(const path of paths){
  if(!/^(?:site|src\/server|netlify\/functions)\/.*\.[cm]?js$/.test(path)||!hasPath(path))continue;
  const source=readSource(path);
  if(typeof source!=='string')throw Error('Cannot read candidate module: '+path);
  const imports=[...source.matchAll(/^\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"](\.{1,2}\/[^'"\n]+)['"]/gm)].map(m=>m[1]);
  for(const spec of imports){
   const target=posix.normalize(posix.join(posix.dirname(path),spec.split(/[?#]/)[0]));
   if(target.startsWith('../')||target.startsWith('/')||target==='')
    throw Error('Unsafe relative module path: '+path+' -> '+spec);
   const choices=posix.extname(target)?[target]:
    [target,target+'.js',target+'.mjs',target+'.cjs',target+'.json',target+'/index.js',target+'/index.mjs'];
   if(!choices.some(x=>hasPath(x)))
    throw Error('Unresolved static relative module import: '+path+' -> '+spec);
  }
 }
 return true;
}


// Conservative direct ESM export preflight before the ONE required candidate build.
// Star/barrel/CommonJS/dynamic semantics remain for that full build; no eval/network.
export function assertCandidateStaticNamedExports(paths,{readSource,hasPath}={}){
 if(!Array.isArray(paths)||typeof readSource!=='function'||typeof hasPath!=='function')
  throw Error('Candidate export evidence unavailable');
 const find=(from,spec)=>{
  const target=posix.normalize(posix.join(posix.dirname(from),spec.split(/[?#]/)[0]));
  if(target.startsWith('../')||target.startsWith('/')||!target)
   throw Error('Unsafe relative module path: '+from+' -> '+spec);
  const options=posix.extname(target)?[target]:
   [target,target+'.js',target+'.mjs',target+'.cjs',target+'.json',target+'/index.js'];
  const found=options.find(p=>hasPath(p));
  if(!found)throw Error('Unresolved static relative module import: '+from+' -> '+spec);
  return found;
 };
 for(const path of paths){
  if(!/^(?:site|src\/server|netlify\/functions)\/.*\.[cm]?js$/.test(path)||!hasPath(path))continue;
  const src=readSource(path);
  if(typeof src!=='string')throw Error('Cannot read candidate module: '+path);
  const named=/^\s*(?:import|export)\s+\{([^}]{1,600})\}\s*from\s*['"](\.{1,2}\/[^'"\n]+)['"]/gm;
  const defaultImport=/^\s*import\s+[A-Za-z_$][\w$]*\s+from\s+['"](\.{1,2}\/[^'"\n]+)['"]/gm;
  const uses=[
   ...[...src.matchAll(named)].map(m=>({spec:m[2],names:m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean)})),
   ...[...src.matchAll(defaultImport)].map(m=>({spec:m[1],names:['default']}))
  ];
  for(const use of uses){
   const target=find(path,use.spec);
   if(!target.endsWith('.js')&&!target.endsWith('.mjs'))continue;
   const targetCode=readSource(target);
   if(typeof targetCode!=='string')throw Error('Cannot read candidate module: '+target);
   // Known ambiguous exports are NOT guessed; full build must verify them.\n    // Generator declarations (function* and async function*) are direct named exports.
   if(/^\s*export\s*\*/m.test(targetCode)||/\bmodule\.exports\b|\bexports\./.test(targetCode)||
      /^\s*export\s+(?:const|let|var)\s*\{/m.test(targetCode))continue;
   const exports=new Set();
   if(/^\s*export\s+default\b/m.test(targetCode))exports.add('default');
   for(const m of targetCode.matchAll(/^\s*export\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm))
    exports.add(m[1]);
   for(const m of targetCode.matchAll(/^\s*export\s*\{([^}]+)\}/gm))
    for(const entry of m[1].split(',')){
     const parts=entry.trim().split(/\s+as\s+/);
     if(parts[0])exports.add((parts[1]||parts[0]).trim());
    }
   for(const name of use.names)
    if(/^[A-Za-z_$][\w$]*$/.test(name)&&!exports.has(name))
     throw Error('Missing static relative module export: '+path+' imports '+name+' from '+use.spec);
  }
 }
 return true;
}

export function planReadyOnlyCandidate(queue,{publishedSourceSha,developmentSourceSha,
 selectedIds,developmentChangedPaths,pinnedReadyPaths=[],isAncestor,sourceObjectAt}={}){
 const errors=queueSchemaErrors(queue);
 if(!SHA.test(publishedSourceSha||'')||!SHA.test(developmentSourceSha||'')||
    typeof isAncestor!=='function')errors.push('Missing source anchors/ancestry');
 if(queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('Queue baseline does not match last published tested source');
 if(!Array.isArray(selectedIds)||selectedIds.length===0||selectedIds.some(x=>!ITEM.test(x))||
    new Set(selectedIds).size!==selectedIds.length)
  errors.push('Nonempty unique READY item IDs required');
 const wanted=new Set(Array.isArray(selectedIds)?selectedIds:[]);
 const selected=(queue?.items||[]).filter(i=>wanted.has(i.id));
 if(selected.length!==wanted.size)errors.push('Unknown selected READY item ID');
 if(selected.some(i=>i.state!=='READY'))errors.push('Selected item is not READY');
 if(typeof isAncestor==='function'&&SHA.test(publishedSourceSha||'')&&SHA.test(developmentSourceSha||'')){
  try{
   // Published production bytes may be an immutable READY-only candidate
   // created as a ONE-parent sibling of continued development (#3347).
   // Do not require that detached frozen source commit to be an ancestor:
   // verify its exact candidate manifest object, published release receipt,
   // and that its first parent is in current development ancestry instead.
   const direct=isAncestor(publishedSourceSha,developmentSourceSha)===true;
   if(!direct){
    const sourceReceipt=typeof sourceObjectAt==='function'?
     sourceObjectAt(publishedSourceSha,CANDIDATE_RECEIPT_PATH):null;
    const detached=/^100644:[a-f0-9]{40}$/.test(sourceReceipt||'')&&
     SHA.test(queue?.published_base?.release_sha||'')&&
     typeof queue?.published_base?.netlify_deploy_id==='string'&&
     queue.published_base.netlify_deploy_id.length>0&&
     isAncestor(publishedSourceSha+'^',developmentSourceSha)===true;
    if(!detached)errors.push('Published baseline lacks direct or frozen-candidate development provenance');
   }
  }catch{errors.push('Cannot verify published-to-development source provenance');}
 }
 for(const item of selected){
  try{
   if(!SHA.test(item.merged_source_sha||'')||
      // A selected READY merge may predate an isolated published candidate:
      // the candidate deliberately restored this item's code to older bytes.
      // Its current source must still descend from the READY merge, and the
      // actual deployable byte diff and exact READY blob are checked below.
      item.merged_source_sha===publishedSourceSha||
      isAncestor(item.merged_source_sha,developmentSourceSha)!==true)
    errors.push(item.id+' READY merge is absent from current development ancestry');
  }catch{errors.push(item.id+' READY ancestry unavailable');}
 }
 const changed=deployableChangedPaths(developmentChangedPaths||[]);
 if(!Array.isArray(pinnedReadyPaths)||pinnedReadyPaths.some(x=>typeof x!=='string')||
    new Set(pinnedReadyPaths).size!==pinnedReadyPaths.length)
   errors.push('Invalid or duplicate pinned READY overlap paths');
 const wantedPins=new Set(Array.isArray(pinnedReadyPaths)?pinnedReadyPaths:[]);
 const included=[],restored=[],pinned=[];
 for(const path of changed){
  const owners=(queue?.items||[]).filter(i=>i.scope_paths?.includes(path));
  const chosen=owners.filter(i=>wanted.has(i.id)&&i.state==='READY');
  const competing=owners.filter(i=>!wanted.has(i.id)&&i.state!=='DEPLOYED');
  const deployed=owners.filter(i=>i.state==='DEPLOYED');
  if(!owners.length||(!chosen.length&&!competing.length))
   errors.push('Untracked or DEPLOYED-only unpublished deployable source: '+path);
  else if(chosen.length&&competing.length){
   // An unmerged issue record can share READY ownership without containing
   // any different bytes. Skip its pin ONLY on exact unique READY frozen-blob
   // parity against current development; never rely on an unmerged label alone.
   const unmergedOnly=competing.every(i=>i.state!=='READY'&&!SHA.test(i.merged_source_sha||''));
   let noActualOverlap=false;
   if(unmergedOnly&&typeof sourceObjectAt==='function'){
    try{
     const tips=chosen.filter(tip=>chosen.every(owner=>owner===tip||
      isAncestor(owner.merged_source_sha,tip.merged_source_sha)===true));
     if(tips.length===1){
      const frozen=sourceObjectAt(tips[0].merged_source_sha,path);
      noActualOverlap=!!frozen&&frozen===sourceObjectAt(developmentSourceSha,path);
     }
    }catch{errors.push('Cannot verify exact READY owner source parity: '+path);}
   }
   if(noActualOverlap&&!wantedPins.has(path))included.push(path);
   else if(!wantedPins.has(path))
    errors.push('READY/unready or unselected overlap cannot be isolated: '+path);
   else{included.push(path);pinned.push(path);}
  }
  else if(chosen.length){
   if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&i.merged_source_sha!==publishedSourceSha)){
    // A historic DEPLOYED label can be inaccurate: fail closed if its merged
    // source is newer than baseline and present in the development lineage.
    try{if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&
      isAncestor(publishedSourceSha,i.merged_source_sha)===true&&
      i.merged_source_sha!==publishedSourceSha&&
      isAncestor(i.merged_source_sha,developmentSourceSha)===true))
       errors.push('New DEPLOYED-labelled source overlaps READY path: '+path);
    }catch{errors.push('Cannot verify DEPLOYED ancestry for '+path);}
   }
   included.push(path);
  }else restored.push(path);
 }
 for(const path of wantedPins)if(!pinned.includes(path))
  errors.push('Pinned READY path is not an actual READY/unready overlap: '+path);
 if(!included.length)errors.push('No selected READY deployable change to release');
 for(const item of selected)if(!item.scope_paths?.some(p=>included.includes(p)))
  errors.push(item.id+' does not deliver an isolated deployable change');
 return {ready:errors.length===0,errors,published_source_sha:publishedSourceSha,
  development_source_sha:developmentSourceSha,selected_ids:sorted(selectedIds||[]),
  included_paths:sorted(included),restored_paths:sorted(restored),
  original_changed_paths:changed,pinned_ready_paths:sorted(pinned),
  ready_items:selected.map(i=>({id:i.id,issue:i.issue,title:i.title,
   merged_source_sha:i.merged_source_sha,scope_paths:i.scope_paths})),
  other_items:(queue?.items||[]).filter(i=>i.state!=='READY'&&i.state!=='DEPLOYED')
   .map(i=>({id:i.id,state:i.state,merged_source_sha:i.merged_source_sha,blockers:i.blockers}))};
}
export function validateReadyOnlyCandidate(queue,{manifest,publishedSourceSha,developmentHead,
 candidateSha,actualParents,developmentChangedPaths,candidateChangedPaths,
 stagedCommitChangedPaths,developmentDriftPaths,queueContentMatches,liveQueue,sourceObjectAt,
 candidateBranch,isAncestor,prospectiveBatchPlan=null}={}){
 const reject=reason=>{throw Error('Isolated READY candidate HOLD: '+reason);};
 if(!manifest||manifest.schema_version!==1||manifest.kind!==CANDIDATE_KIND||
  !SHA.test(candidateSha||'')||!SHA.test(developmentHead||'')||
  manifest.published_source_sha!==publishedSourceSha||
  !SHA.test(manifest.development_source_sha||'')||
  typeof candidateBranch!=='string'||!/^\brelease-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(candidateBranch)||
  manifest.candidate_branch!==candidateBranch)
  reject('Missing or mismatched immutable candidate source/ref identity');
 if(!Array.isArray(actualParents)||actualParents.length!==2||
  actualParents[0]!==candidateSha||actualParents[1]!==manifest.development_source_sha)
  reject('Candidate must be ONE direct nonmerge child of the verified development source');
 if(typeof isAncestor!=='function'||typeof sourceObjectAt!=='function')
  reject('Git ancestry or tree readback is unavailable');
 try{if(isAncestor(manifest.development_source_sha,developmentHead)!==true)
  reject('Candidate staging source no longer in development ancestry');}
 catch(e){reject('Cannot verify development ancestry: '+e.message);}
 // The staged candidate is an immutable, CI-tested source tree. Newer
 // development work may advance independently, but NEVER enter this tree.
 // Validate current READY inventory and each selected item, while allowing
 // solely tracked UNREADY runtime edits after the frozen staging anchor.
 if(queueContentMatches!==true)
  reject('Candidate queue differs from its immutable staging-source queue');
 if(liveQueue!==undefined){
  const liveErrors=queueSchemaErrors(liveQueue);
  if(liveErrors.length)reject('Latest development queue invalid: '+liveErrors.join('; ').slice(0,400));
  if(JSON.stringify(liveQueue.published_base)!==JSON.stringify(queue.published_base))
   reject('Published baseline changed since candidate staging');
  const liveReady=liveQueue.items.filter(i=>i.state==='READY');
  const selectedSet=new Set(manifest.selected_ready_item_ids);
  if(manifest.selected_ready_item_ids.some(id=>!liveReady.some(i=>i.id===id)))
   reject('Selected READY item is no longer READY on development');
  // New READY records after this owner-approved immutable candidate must NOT
  // be silently added to this one-use grant or source. They can coexist only
  // when their exact merge happened after this candidate staging anchor.
  for(const item of liveReady.filter(i=>!selectedSet.has(i.id))){
   // A separately unfinished item may be certified READY while this approved
   // candidate is tested. If its app bytes were already in the staging
   // ancestry, allow it ONLY when it was tracked as unready in the frozen
   // staging queue and EVERY scoped deployable file was restored to the
   // published Git object in this candidate. Never include an added READY
   // feature merely because its status changed after staging.
   const original=queue.items.find(i=>i.id===item.id);
   const previouslyUnready=original&&['IN_PROGRESS','TESTING','BLOCKED'].includes(original.state);
   // An independently READY item may already exist at staging but is NOT in
   // this owner's selected batch. Never require it to be published, and never
   // let its source in unless the ENTIRE scoped file set is restored to the
   // published blobs. Reject any mutation of its frozen READY receipt.
   const frozenUnselectedReady=original?.state==='READY'&&JSON.stringify(original)===JSON.stringify(item);
   const scoped=Array.isArray(item.scope_paths)?item.scope_paths:[];
   let fullyExcluded=false;
   if((previouslyUnready||frozenUnselectedReady)&&scoped.length>0&&equal(scoped,original.scope_paths||[])){
    try{
     fullyExcluded=scoped.every(path=>
      manifest.restored_to_published_paths?.includes(path)&&
      sourceObjectAt(candidateSha,path)===sourceObjectAt(publishedSourceSha,path)&&
      sourceObjectAt(manifest.development_source_sha,path)!==sourceObjectAt(publishedSourceSha,path));
    }catch(e){reject('Cannot verify newly READY excluded source blobs: '+e.message);}
   }
   if(fullyExcluded)continue;
   try{
    if(!SHA.test(item.merged_source_sha||'')||
       item.merged_source_sha===manifest.development_source_sha||
       isAncestor(manifest.development_source_sha,item.merged_source_sha)!==true||
       isAncestor(item.merged_source_sha,developmentHead)!==true)
     reject('Additional READY source not proven post-staging: '+item.id);
   }catch(e){reject('Cannot certify additional READY source chronology: '+e.message);}
  }
  for(const id of manifest.selected_ready_item_ids){
   const original=queue.items.find(i=>i.id===id);
   const current=liveQueue.items.find(i=>i.id===id);
   if(!original||!current||JSON.stringify(original)!==JSON.stringify(current))
    reject('Selected READY record changed since candidate staging: '+id);
  }
 }
 const runtimeDrift=deployableChangedPaths(developmentDriftPaths||[]);
 if(runtimeDrift.length){
  if(!liveQueue)reject('Development app code changed without verifiable current queue');
  for(const path of runtimeDrift){
   if(!liveQueue.items.some(i=>i.scope_paths?.includes(path)&&(
       ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)||
       (i.state==='READY'&&!manifest.selected_ready_item_ids.includes(i.id)&&
        SHA.test(i.merged_source_sha||'')&&
        isAncestor(manifest.development_source_sha,i.merged_source_sha)===true))))
    reject('Newer development app changes lack an excluded post-staging owner: '+path);
  }
  // Every staged READY path is still checked below against its exact READY
  // merged blob; no late overlapping or other unready edit can be published.
 }
 const plan=planReadyOnlyCandidate(queue,{
  publishedSourceSha,developmentSourceSha:manifest.development_source_sha,
  selectedIds:manifest.selected_ready_item_ids,
  pinnedReadyPaths:manifest.pinned_to_ready_paths||[],developmentChangedPaths,isAncestor,sourceObjectAt});
 if(!plan.ready)reject(plan.errors.join('; '));
 if(!manifest.risk_classification||
    JSON.stringify(manifest.risk_classification)!==JSON.stringify(classifyReleaseRisk(plan.included_paths)))
  reject('candidate risk-tier/one-build receipt differs from actual selected source');
 if(!Array.isArray(manifest.restored_to_published_paths)||
    !equal(manifest.restored_to_published_paths,plan.restored_paths))
  reject('Restoration manifest differs from actual unready source inventory');
 if(!equal(deployableChangedPaths(candidateChangedPaths||[]),plan.included_paths))
  reject('Candidate app diff includes more or fewer than exact selected READY paths');
 if(!Array.isArray(manifest.pinned_to_ready_paths||[])||
    !equal(manifest.pinned_to_ready_paths||[],plan.pinned_ready_paths))
  reject('Pinned READY manifest differs from actual mixed-source paths');
 const workflowChanges=workflowChangedPaths(developmentChangedPaths||[]);
 const frozenWorkflows=manifest.restored_unpublished_workflow_paths||[];
 if(!Array.isArray(frozenWorkflows)||!equal(frozenWorkflows,workflowChanges))
  reject('Production candidate must restore every changed GitHub Actions workflow to exact published source');
 if(workflowChangedPaths(candidateChangedPaths||[]).length)
  reject('Production candidate must not modify/create GitHub Actions workflows');
 for(const path of frozenWorkflows)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('GitHub Actions workflow was not exactly restored to published bytes: '+path);
 const workflowOnlyTests=manifest.excluded_unpublished_workflow_test_paths||[];
 if(!Array.isArray(workflowOnlyTests)||new Set(workflowOnlyTests).size!==workflowOnlyTests.length||
   !equal(workflowOnlyTests,discoverReviewedWorkflowTestExclusions({
     publishedSourceSha,developmentSourceSha:manifest.development_source_sha,
     restoredWorkflows:frozenWorkflows,sourceObjectAt
   })))
  reject('Only one byte-pinned, reviewed workflow-only test can be excluded when its workflow was restored');
 for(const path of workflowOnlyTests){
  const spec=[REVIEWED_WORKFLOW_TEST,REVIEWED_CI_FAST_PR_TEST].find(x=>x.path===path);
  if(!spec||sourceObjectAt(candidateSha,path)!==null||
     sourceObjectAt(manifest.development_source_sha,path)!=='100644:'+spec.sourceBlob||
     sourceObjectAt(publishedSourceSha,path)!==null)
   reject('Workflow-only test exclusion source/blob/absence mismatch: '+path);
  // Never exclude a test introduced or modified by ANY selected READY merge.
  // Merely inheriting this earlier development workflow test is not ownership.
  for(const item of plan.ready_items){
   let selectedBlob,parentBlob;
   try{
    selectedBlob=sourceObjectAt(item.merged_source_sha,path);
    if(selectedBlob!==null)parentBlob=sourceObjectAt(item.merged_source_sha+'^',path);
   }catch{reject('Selected READY workflow-only test provenance unavailable: '+path);}
   if(selectedBlob!==null&&selectedBlob!==parentBlob)
    reject('Selected READY merge introduced or modified a workflow-only test: '+path);
  }
 }
 const compatibleAuditSupport=manifest.restored_compatible_audit_support_paths||[];
 const expectedCompatibleAuditSupport=discoverCompatibleAuditSupport({
   queue,restoredPaths:plan.restored_paths,pinnedReadyPaths:plan.pinned_ready_paths,
   publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
   selectedReadyItems:plan.ready_items});
 if(!Array.isArray(compatibleAuditSupport)||!equal(compatibleAuditSupport,expectedCompatibleAuditSupport))
   reject('Audited historical coffee support helper manifest differs from exact reviewed provenance');
 for(const path of compatibleAuditSupport)
   if(path!==REVIEWED_COMPATIBLE_AUDIT_SUPPORT.path||
      sourceObjectAt(candidateSha,path)!=='100644:'+REVIEWED_COMPATIBLE_AUDIT_SUPPORT.historicalBlobSha)
     reject('Historical audit helper was not restored to exact independent reviewed bytes');
 const restoredTests=manifest.restored_to_published_unready_test_paths||[];
 const sqlTests=discoverReviewedRestoredSqlTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const coffeeTests=discoverReviewedRestoredR232CoffeeTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const adminTests=discoverReviewedRestoredUnreadyAdminTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const startupTests=discoverReviewedRestoredStartupTests({queue,
  pinnedReadyPaths:plan.pinned_ready_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const approvedTests=[...sqlTests,...coffeeTests,...adminTests,...startupTests].sort();
 if(!Array.isArray(restoredTests)||!equal(restoredTests,approvedTests))
  reject('Restored existing unfinished tests differ from exact reviewed source/ownership');
 for(const path of restoredTests){
  if(!approvedTests.includes(path)||
     sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('Original complete regression suite not restored to exact published Git object: '+path);
 }
 const excludedTests=manifest.excluded_unready_test_paths||[];
 if(excludedTests.some(path=>compatibleAuditSupport.includes(path)))
   reject('A reviewed compatible helper cannot be simultaneously excluded');
 if(!Array.isArray(excludedTests)||new Set(excludedTests).size!==excludedTests.length)
  reject('Invalid or duplicate excluded unfinished test paths');
 for(const path of excludedTests){
  const m=typeof path==='string'?/^tests\/(?:coffee-)?issue([1-9][0-9]*)-[a-z0-9-]+\.test\.mjs$/.exec(path):null;
  const ownerDrive=path===REVIEWED_OWNER_DRIVE_TEST.path&&
   eligibleOwnerDriveTestExclusion({queue,restoredPaths:plan.restored_paths,
    publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt})&&
   sourceObjectAt(candidateSha,REVIEWED_OWNER_DRIVE_TEST.runtime)===null;
  const support=reviewedUnreadySupport(path,{queue,restoredPaths:plan.restored_paths,
   pinnedReadyPaths:plan.pinned_ready_paths,publishedSourceSha,
   developmentSourceSha:manifest.development_source_sha,sourceObjectAt});
  const eligibleSupport=Boolean(support)&&sourceObjectAt(candidateSha,path)===null;
  const pinnedCoffee=reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths:plan.pinned_ready_paths,
 restoredPaths:plan.restored_paths,publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt});
  if(!m&&!ownerDrive&&!eligibleSupport&&!pinnedCoffee)
   reject('Only proven issue-scoped, pinned coffee, owner Drive, or exact unready support tests can be excluded');
  const issue=pinnedCoffee?33:ownerDrive?28:eligibleSupport?support.issue:Number(m[1]);
  const unfinishedMixed=queue.items.some(i=>i.issue===issue&&
   ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
   i.scope_paths?.some(p=>plan.pinned_ready_paths.includes(p)));
  // A separately verified READY item NOT selected for this owner release
  // may carry NEW tests of code deliberately restored to published bytes.
  // Exclude ONLY its original CI-tested test blob, never a selected test or
  // a changed/unattributed test. Require every owned runtime file restored.
  const frozenOtherReady=queue.items.some(i=>i.issue===issue&&i.state==='READY'&&
   !manifest.selected_ready_item_ids.includes(i.id)&&
   i.scope_paths?.length>0&&i.scope_paths.every(p=>plan.restored_paths.includes(p))&&
   liveQueue?.items.some(now=>now.id===i.id&&JSON.stringify(now)===JSON.stringify(i))&&
   SHA.test(i.merged_source_sha||'')&&
   sourceObjectAt(i.merged_source_sha,path)!==null&&
   sourceObjectAt(i.merged_source_sha,path)===sourceObjectAt(manifest.development_source_sha,path));
  const unfinishedRestored=queue.items.some(i=>i.issue===issue&&
   ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
   i.scope_paths?.length>0&&i.scope_paths.every(x=>plan.restored_paths.includes(x)));
  if(!unfinishedMixed&&!unfinishedRestored&&!frozenOtherReady)
   reject('Excluded test does not belong to a frozen unselected READY or unfinished mixed-source item, nor wholly restored unfinished source');
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(manifest.development_source_sha,path)===null||
     sourceObjectAt(candidateSha,path)!==null)
   reject('Excluded test must be newly introduced and absent from isolated candidate');
  // Later, independently READY commits inherit older unfinished issue tests
  // in their Git trees. Mere historical presence does not make an inherited
  // test part of the selected READY change. Prove its exact blob was UNCHANGED
  // relative to each READY merge's real first parent before permitting omission.
  // A test introduced/modified by any selected READY commit is never excluded.
  for(const item of plan.ready_items){
   let selectedBlob,parentBlob;
   try{
    selectedBlob=sourceObjectAt(item.merged_source_sha,path);
    if(selectedBlob!==null)
     parentBlob=sourceObjectAt(item.merged_source_sha+'^',path);
   }catch{
    reject('Cannot independently verify selected READY test provenance: '+path);
   }
   if(selectedBlob!==null&&selectedBlob!==parentBlob)
    reject('Cannot exclude a test introduced or modified by an approved READY merge: '+path);
  }
 }
 // Preserve every provenance check above; count a doubly qualified path once.
 const prospectiveQueuePaths=reviewedProspectiveReadyQueuePath({manifest,queue,
  developmentSourceSha:manifest.development_source_sha,candidateSha,
  candidateBranch,sourceObjectAt});
 const prospectiveBatchPaths=reviewedProspectiveBatchQueuePath({manifest,queue,
  developmentSourceSha:manifest.development_source_sha,candidateSha,candidateBranch,
  sourceObjectAt,prospectiveBatchPlan});
 const reviewedQaPaths=reviewedProspectiveQaRestorationPaths({manifest,queue,
  developmentSourceSha:manifest.development_source_sha,publishedSourceSha,
  candidateSha,sourceObjectAt});
 const batchQaPaths=reviewedBatchQaRestorationPaths({manifest,queue,
  developmentSourceSha:manifest.development_source_sha,publishedSourceSha,
  candidateSha,sourceObjectAt,prospectiveBatchPlan});
 const reviewedScopedJournalPaths=reviewedProspectiveScopedJournalPath({manifest,queue,
  developmentSourceSha:manifest.development_source_sha,publishedSourceSha,
  candidateSha,sourceObjectAt});
 assertExactCandidateStagedPaths(stagedCommitChangedPaths||[],
  plan.restored_paths,plan.pinned_ready_paths,compatibleAuditSupport,restoredTests,
  excludedTests,workflowOnlyTests,frozenWorkflows,prospectiveQueuePaths,prospectiveBatchPaths,reviewedQaPaths,
  reviewedScopedJournalPaths,batchQaPaths,
  [CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH]);
 for(const path of plan.restored_paths)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('Unready file was not exactly restored to published bytes: '+path);
 for(const path of plan.included_paths){
  const candidateBlob=sourceObjectAt(candidateSha,path);
  const isPinned=plan.pinned_ready_paths.includes(path);
  if(isPinned){
   if(candidateBlob===sourceObjectAt(manifest.development_source_sha,path))
    reject('Pinned mixed-source READY file was not actually isolated: '+path);
  }else if(candidateBlob!==sourceObjectAt(manifest.development_source_sha,path))
   reject('Selected READY file was changed during isolation: '+path);
  // A later, UNTRACKED commit touching an already READY path must not be
  // laundered into the release merely because the same path has a READY owner.
  // Require the final blob to equal the exact Git blob from at least one
  // selected READY merged commit that owns this file.
  const readyOwners=plan.ready_items.filter(i=>i.scope_paths.includes(path));
  if(!readyOwners.some(i=>sourceObjectAt(i.merged_source_sha,path)===candidateBlob))
   reject('Selected file includes edits after its verified READY merge: '+path);
 }
 return {ready:true,errors:[],deployable_paths:plan.included_paths,
  ready_items:plan.ready_items,other_items:plan.other_items,
  excluded_paths:plan.restored_paths,pinned_ready_paths:plan.pinned_ready_paths,restored_compatible_audit_support_paths:compatibleAuditSupport,restored_to_published_unready_test_paths:restoredTests,excluded_unready_test_paths:excludedTests,excluded_unpublished_workflow_test_paths:workflowOnlyTests,
  development_source_sha:manifest.development_source_sha,
  candidate_source_sha:candidateSha};
}
