// #3889 owner-authorized two-phase preparation of a prospective READY source.
// The proposed queue is NEVER written to live development by this module.
// It is not certification, a release grant, publication, or proof of five CI jobs.
import {createHash} from 'node:crypto';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
export const BASELINE_DEV_SHA='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
export const BASELINE_QUEUE_BLOB='46304f47eb0e78fac8c7845155af86080900b3c4';
const SHA=/^[a-f0-9]{40}$/;
const sorted=xs=>[...new Set(xs)].sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// R399 is a narrow source fix, not certification of the parent original603 audit.
// Its scoped specialist afterproof (#3678/#3685, exact job 137103214703) was
// independently read, including actual selected #99 producer and no conflicts.
// Match this exact audit-only marker, source and test bytes and original CI IDs.
// All other substantive blockers remain hard HOLD. This is preview only;
// actual five native frozen-candidate jobs and publisher verification still apply.
const R399_ID='DIC-Q-33-r399-original99-producer-tenure-precision';
const R399_PARENT_AUDIT='Original603 603 selected current identities/lot/source manual semantic adjudication unfinished, #33 OPEN; related #267 V2/#96 scoped separately.';
const R399_MERGE='513f98ac06cdd0fe569390354420158458342859';
const R399_TESTED='f06e3f7c4143c9f9b8409bed7d062c16a0269a23';
const R399_PATH='src/server/coffee-narrative-evidence.mjs';
const R399_TEST='tests/coffee-issue33-r399-keller-tenure.test.mjs';
const R399_REQUIRED_RUNS=[44987903105,44987902345,44987902359,44987902371,44988168022,44988168102,44988168054,44988168083];
function reviewedParentAuditOnly({original,current,marker,developmentSourceSha,sourceObjectAt,firstParentChangedPaths,isAncestor}){
 if(marker!==R399_PARENT_AUDIT||original.id!==R399_ID||current.id!==R399_ID||
    original.issue!==33||current.issue!==33||current.pr!==3678||
    original.merged_source_sha!==R399_MERGE||current.merged_source_sha!==R399_MERGE||
    !same(current.scope_paths,[R399_PATH])||!original.blockers.includes(marker)||
    !R399_REQUIRED_RUNS.every(id=>original.ci_runs.includes(id)&&current.ci_runs.includes(id)))return false;
 try{
  const changed=firstParentChangedPaths(R399_MERGE);
  if(!same(sorted(deployableChangedPaths(changed)),[R399_PATH])||
     !changed.includes(R399_TEST)||isAncestor(R399_MERGE,developmentSourceSha)!==true)return false;
  for(const [path,object] of [[R399_PATH,'100644:3de11626496a0b698e558ec8929f0158e3083b0a'],[R399_TEST,'100644:16c4d572ecd43860a9cd4f1a7f2baffd670382ee']]){
   if([R399_MERGE,R399_TESTED,developmentSourceSha].some(ref=>sourceObjectAt(ref,path)!==object))return false;
  }
  return true;
 }catch{return false;}
}
export function proposeProspectiveReadyQueue({baselineQueue,liveQueue,selectedId,
 developmentSourceSha,firstParentChangedPaths,isAncestor,sourceObjectAt}={}){
 const hold=why=>{throw Error('PROSPECTIVE_READY_HOLD: '+why);};
 if(!SHA.test(developmentSourceSha||'')||typeof selectedId!=='string'||
   typeof firstParentChangedPaths!=='function'||typeof isAncestor!=='function'||
   typeof sourceObjectAt!=='function')hold('missing exact source Git readers or selected ID');
 if(queueSchemaErrors(baselineQueue).length||queueSchemaErrors(liveQueue).length)
  hold('baseline or live queue schema invalid');
 const frozen=(baselineQueue.items||[]).filter(i=>i.state==='TESTING');
 if(frozen.length!==63||frozen.some(i=>!/^DIC-Q-[0-9]+-/.test(i.id))||
   !same(baselineQueue.published_base,liveQueue.published_base))
  hold('immutable 63-item cohort or published tested source mismatch');
 const frozenIds=sorted(frozen.map(i=>i.id));
 if(frozenIds.length!==63||frozenIds.some(id=>!liveQueue.items.some(i=>i.id===id)))
  hold('baseline ID cohort changed or is missing');
 const original=frozen.find(i=>i.id===selectedId);
 const current=liveQueue.items.find(i=>i.id===selectedId);
 if(!original||!current||original.state!=='TESTING'||current.state!=='TESTING'||
   original.issue!==current.issue||!same(original.scope_paths,current.scope_paths)||
   !current.scope_paths.length||!SHA.test(current.merged_source_sha||'')||
   !current.tests.length||!current.ci_runs.length||
   current.ci_runs.some(id=>!Number.isSafeInteger(id)||id<=0))
  hold('selected original item is not source-tracked TESTING with existing test receipts');
 // No speculative deletion of non-candidate domain defects or actual source failures.
 // The single independently reviewed parent-audit marker is not a defect in R399.
 if(current.blockers.some(b=>!reviewedParentAuditOnly({original,current,marker:b,
   developmentSourceSha,sourceObjectAt,firstParentChangedPaths,isAncestor})&&
   (typeof b!=='string'||
   !(/#3347|candidate.*certification|new owner Publish/i.test(b))||
   /(?:unavailable|failed|auth|external|real hosted|privacy|source mismatch|pending seller)/i.test(b))))
  hold('unresolved substantive blocker requires its specialist before preview');
 let changed;
 try{changed=firstParentChangedPaths(current.merged_source_sha);}catch{
  hold('first-parent source diff missing');
 }
 if(!Array.isArray(changed)||changed.some(x=>typeof x!=='string'))
  hold('invalid first-parent changed-path inventory');
 const owned=deployableChangedPaths(changed);
 if(!owned.length||owned.some(path=>!current.scope_paths.includes(path)))
  hold('first-parent deployable source is absent or not declared');
 try{
  if(isAncestor(current.merged_source_sha,developmentSourceSha)!==true)
   hold('source merge not ancestor of live development');
  const published=liveQueue.published_base.tested_source_sha;
  for(const path of current.scope_paths){
   const merged=sourceObjectAt(current.merged_source_sha,path);
   if(!/^100(?:644|755):[a-f0-9]{40}$/.test(merged||'')||
     merged!==sourceObjectAt(developmentSourceSha,path)||
     merged===sourceObjectAt(published,path))
    hold('selected scope differs from merged source or published bytes: '+path);
  }
 }catch(e){if(String(e.message).includes('PROSPECTIVE_READY_HOLD:'))throw e;
  hold('Git ancestry/blob proof unavailable: '+String(e.message).slice(0,100));}
 const queue=structuredClone(liveQueue),item=queue.items.find(i=>i.id===selectedId);
 item.state='READY';item.blockers=[];
 if(queueSchemaErrors(queue).length)hold('proposed READY queue fails owner schema');
 const others=queue.items.filter(i=>i.id!==selectedId);
 if(!same(others,liveQueue.items.filter(i=>i.id!==selectedId)))
  hold('unexpected nonselected row mutation');
 const identity={baseline_dev_sha:BASELINE_DEV_SHA,
  baseline_queue_blob:BASELINE_QUEUE_BLOB,published_source_sha:queue.published_base.tested_source_sha,
  development_source_sha:developmentSourceSha,selected_id:selectedId,
  merged_source_sha:item.merged_source_sha,source_paths:sorted(item.scope_paths),
  proposed_ready_item:item};
 const fingerprint=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
 return {status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
  publication_authorized:false,ready_certified:false,
  baseline_count:63,selected_id:selectedId,identity_sha256:fingerprint,queue};
}

/**
 * #3889: read-only, disjoint-scope expansion of a live READY selection.
 * Every added item must independently pass the existing strict preview gate.
 * Shared runtime paths require separate chronology/pinning proof, not this lane.
 * Neither the returned queue nor its fingerprint is a publisher certificate.
 */
export function proposeDisjointProspectiveReadyBatch({selectedIds,...readers}={}){
 const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: '+why);};
 if(!Array.isArray(selectedIds)||!selectedIds.length||
    selectedIds.some(id=>typeof id!=='string'||!/^DIC-Q-[0-9]+-[a-z0-9-]+$/.test(id))||
    new Set(selectedIds).size!==selectedIds.length)
  hold('explicit unique original TESTING IDs required');
 const {liveQueue,baselineQueue,developmentSourceSha,firstParentChangedPaths}=readers;
 if(queueSchemaErrors(liveQueue).length||queueSchemaErrors(baselineQueue).length||
    !SHA.test(developmentSourceSha||'')||typeof firstParentChangedPaths!=='function')
  hold('exact queue/source readers unavailable');
 const ordered=sorted(selectedIds);
 const originalReady=liveQueue.items.filter(i=>i.state==='READY');
 const selected=ordered.map(id=>liveQueue.items.find(i=>i.id===id));
 if(selected.some(i=>!i||i.state!=='TESTING'))hold('selected item is not live TESTING');
 const ownerByPath=new Map();
 for(const i of [...originalReady,...selected]){
  for(const path of i.scope_paths){
   if(ownerByPath.has(path))hold('shared selected source needs reviewed chronology: '+path);
   ownerByPath.set(path,i.id);
  }
 }
 const newPaths=new Set(selected.flatMap(i=>i.scope_paths));
 for(const i of liveQueue.items){
  if(ordered.includes(i.id)||!['TESTING','IN_PROGRESS','BLOCKED'].includes(i.state))continue;
  if(i.scope_paths.some(path=>newPaths.has(path)))
   hold('unfinished overlapping owner requires reviewed source isolation: '+i.id);
 }
 let queue=structuredClone(liveQueue);
 const proofs=[];
 for(const id of ordered){
  const original=selected.find(i=>i.id===id);
  const actual=firstParentChangedPaths(original.merged_source_sha);
  if(!Array.isArray(actual)||!same(sorted(deployableChangedPaths(actual)),sorted(original.scope_paths)))
   hold('declared scope does not equal first-parent deployable paths: '+id);
  const p=proposeProspectiveReadyQueue({...readers,liveQueue:queue,selectedId:id});
  queue=p.queue;
  proofs.push({id,identity_sha256:p.identity_sha256});
 }
 const retained=queue.items.filter(i=>!ordered.includes(i.id));
 if(!same(retained,liveQueue.items.filter(i=>!ordered.includes(i.id))))
  hold('nonselected record changed');
 const selectedReadyItems=queue.items.filter(i=>i.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
 const identity={kind:'DIC-PROSPECTIVE-DISJOINT-BATCH-3889-V1',baseline_dev_sha:BASELINE_DEV_SHA,
  baseline_queue_blob:BASELINE_QUEUE_BLOB,published_base:queue.published_base,
  development_source_sha:developmentSourceSha,added_ids:ordered,
  retained_ready_ids:originalReady.map(i=>i.id).sort(),selected_ready_records:selectedReadyItems,
  preview_proofs:proofs};
 return {...identity,identity_sha256:createHash('sha256').update(JSON.stringify(identity)).digest('hex'),
  status:'PROSPECTIVE_BATCH_PLAN_ONLY',publication_authorized:false,ready_certified:false,queue};
}
