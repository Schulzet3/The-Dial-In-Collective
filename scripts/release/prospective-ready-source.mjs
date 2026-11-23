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
 if(current.blockers.some(b=>typeof b!=='string'||
   !(/#3347|candidate.*certification|new owner Publish/i.test(b))||
   /(?:unavailable|failed|auth|external|real hosted|privacy|source mismatch|pending seller)/i.test(b)))
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
