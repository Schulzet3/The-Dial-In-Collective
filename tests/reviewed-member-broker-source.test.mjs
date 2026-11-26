import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewedMemberBrokerComposite as review,reviewedMemberBrokerPlannedObject,
 reviewedMemberHistoricalCheckNames,reconcileReviewedMemberReceiptQueue,applyReviewedMemberReceiptDelta,
 MEMBER_BROKER_ID,MEMBER_VAULT_COMPONENT_ID} from '../scripts/release/reviewed-member-broker-source.mjs';
import {proposeDisjointProspectiveReadyBatch,proposeProspectiveReadyQueue} from '../scripts/release/prospective-ready-source.mjs';
import {reviewedProspectivePromotionQueueParity} from '../scripts/release/ready-only-candidate.mjs';
import {verifiedSelectedHistoricalCheckNames} from '../scripts/release/verified-prospective-qa.mjs';
import {PRODUCTION_CHECKS} from '../scripts/release/release-reliability.mjs';
const snapshot=JSON.parse(readFileSync(new URL('./fixtures/issue3889-member-broker-source.json',import.meta.url),'utf8'));
const CORE='supabase/functions/dic-member-approval-broker/core.mjs',TEST='tests/issue2258-member-approval-notices.test.mjs';
const OWNER='docs/audits/issue509-r377-member-approval-vault-isolation-20261120.json';
const FIRST='d2b99b7972512989a829a6406a201ad8d9ab264e',LAST='afd799a98475d253a896a45f2dacd432f9964c88';
const bad='100644:'+'f'.repeat(40);
const receiptReference='58d5902c39e7aad61fc5a8b0acc072c2be1df4ef',queuePath='docs/RELEASE_QUEUE.json';
const additions=[44612256444,44663957436,44663957447,44663957497];
function originalRow(){
 const row=structuredClone(snapshot.row);row.ci_runs=row.ci_runs.slice(0,10);
 row.blockers=['Exact merged-source applicable Node22/browser CI IN_PROGRESS; independently isolated #3347 READY certification UNVERIFIED; #2258/#96 genuine delivery acceptance UNVERIFIED; no Publish permission'];
 return row;
}
function withQueueReaders(f,queue){
 const at=f.sourceObjectAt,raw=()=>JSON.stringify(queue,null,2)+'\n';
 return {...f,sourceTextAt:(ref,path)=>{assert.equal(ref,f.developmentSourceSha);assert.equal(path,queuePath);return raw();},
  sourceObjectAt:(ref,path)=>path!==queuePath?at(ref,path):ref===receiptReference?
   '100644:dac49db2e3478531fb34c5e022871d8fbc04dbf2':ref===f.developmentSourceSha?
    '100644:'+createHash('sha1').update('blob '+Buffer.byteLength(raw())+'\0').update(raw()).digest('hex'):at(ref,path)};
}
function fixture(){
 const s=structuredClone(snapshot);
 return {s,row:s.row,developmentSourceSha:s.development_sha,publishedSourceSha:s.published_sha,
  readParents:r=>s.parents[r]||[],firstParentChangedPaths:r=>s.changes[r]||[],
  isAncestor:(a,b)=>s.ancestors.some(([x,y])=>x===a&&y===b),
  sourceObjectAt:(r,p)=>s.objects[r]?.[p]??null};
}
test('member composite keeps original identity and names later approved work separately',()=>{
 const f=fixture(),before=structuredClone(f.row),p=review(f);
 assert.deepEqual(f.row,before);assert.equal(f.row.merged_source_sha,FIRST);
 assert.deepEqual(p.source_merges.map(s=>s.merge_sha),[FIRST,LAST]);
 assert.deepEqual(p.deployable_paths,[CORE]);
 assert.equal(p.source_objects[CORE],f.sourceObjectAt(f.developmentSourceSha,CORE));
 assert.equal(p.source_objects[TEST],f.sourceObjectAt(f.developmentSourceSha,TEST));
 assert.equal(p.additional_source_components.length,1);
 assert.equal(p.additional_source_components[0].id,MEMBER_VAULT_COMPONENT_ID);
 assert.equal(p.additional_source_components[0].baseline_id,MEMBER_BROKER_ID);
 assert.equal(p.additional_source_components[0].baseline_cohort_member,false);
 assert.equal(p.additional_source_components[0].ready_certified,false);
 assert.equal(p.additional_source_components[0].publication_authorized,false);
 assert.equal(review({...f,row:{...f.row,id:'DIC-Q-509-unrelated'}}),null);
});
test('member source proof rejects source, queue, parent, workflow, owner and test contamination',()=>{
 const mutations=[
  f=>{f.row.issue=33;},f=>{f.row.pr=3472;},f=>{f.row.merged_source_sha=LAST;},
  f=>{f.row.production_deployed=true;},f=>{f.row.scope_paths.push('site/cloud/main.js');},
  f=>{f.row.ci_runs=f.row.ci_runs.filter(id=>id!==44612256444);},
  f=>{f.row.ci_runs=f.row.ci_runs.filter(id=>id!==44663957447);},
  f=>{f.publishedSourceSha='f'.repeat(40);},f=>{f.isAncestor=()=>false;},
  f=>{f.s.parents[FIRST].reverse();},f=>{f.s.parents[LAST].pop();},
  f=>{f.s.changes[LAST].push('.github/workflows/foreign.yml');},
  f=>{f.s.changes[FIRST]=f.s.changes[FIRST].filter(p=>p!==TEST);},
  f=>{f.s.objects[f.developmentSourceSha][CORE]=f.s.objects[FIRST][CORE];},
  f=>{f.s.objects[f.developmentSourceSha][TEST]=bad;},
  f=>{f.s.objects[f.publishedSourceSha][CORE]=bad;},
  f=>{f.s.objects[f.publishedSourceSha][TEST]=bad;},
  f=>{f.s.objects[LAST][OWNER]=bad;},
  f=>{f.s.objects[f.developmentSourceSha][OWNER]=null;},
  ...Object.keys(snapshot.parents).map(ref=>f=>{f.s.objects[ref][TEST]=bad;}),
  ...Object.values(snapshot.parents).map(([ref])=>f=>{f.s.objects[ref][CORE]=bad;})
 ];
 for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>review(f),/HOLD/);}
});
test('prospective queue retains fixed 63 IDs and cannot silently select later member source alone',()=>{
 const f=fixture();
 const original=originalRow();
 const others=Array.from({length:62},(_,i)=>({id:'DIC-Q-509-independent-'+i,issue:509,title:'independent',
  owner_source:'owner',state:'TESTING',merged_source_sha:'f'.repeat(40),scope_paths:['site/other'+i+'.js'],
  tests:['scoped tests'],ci_runs:[123],blockers:['#3347 independent candidate certification pending']}));
 const base={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:f.publishedSourceSha,release_sha:'a'.repeat(40),netlify_deploy_id:'historical'},
  items:[original,...others],history:[]};
 const live=structuredClone(base);
 const args={...withQueueReaders(f,live),baselineQueue:base,liveQueue:live,selectedIds:[MEMBER_BROKER_ID]};
 const p=proposeDisjointProspectiveReadyBatch(args);
 assert.equal(p.queue.items.length,63);assert.deepEqual(p.added_ids,[MEMBER_BROKER_ID]);
 assert.equal(p.queue.items[0].state,'READY');assert.equal(live.items[0].state,'TESTING');
 assert.equal(p.queue.items[0].merged_source_sha,FIRST);
 assert.equal(p.additional_source_components[0].id,MEMBER_VAULT_COMPONENT_ID);
 assert.equal(p.queue.items.some(x=>x.id===MEMBER_VAULT_COMPONENT_ID),false);
 assert.equal(p.ready_certified,false);assert.equal(p.publication_authorized,false);
 assert.deepEqual(p.queue.items[0].ci_runs,[...original.ci_runs,...additions]);
 const manifest={schema_version:1,kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  development_source_sha:p.development_source_sha,published_source_sha:f.publishedSourceSha,
  candidate_branch:'release-candidates/prospectbatch3889-'+'a'.repeat(20),
  selected_ready_item_ids:[...p.added_ids,...p.retained_ready_ids].sort(),
  prospective_ready_batch_preview:{status:p.status,baseline_queue_blob:p.baseline_queue_blob,
   publication_authorized:false,ready_certified:false,added_ids:p.added_ids,
   retained_ready_ids:p.retained_ready_ids,identity_sha256:p.identity_sha256,
   additional_source_components:p.additional_source_components,
   member_receipt_reconciliation:p.member_receipt_reconciliation}};
 const parity={manifest,originalQueue:JSON.stringify(live,null,2)+'\n',candidateQueue:JSON.stringify(p.queue,null,2)+'\n',
  liveQueue:JSON.stringify(p.queue,null,2)+'\n',prospectiveBatchPlan:p};
 assert.equal(reviewedProspectivePromotionQueueParity(parity),true);
 assert.equal(reviewedProspectivePromotionQueueParity({...parity,prospectiveBatchPlan:structuredClone(p)}),false,'cloned plan loses opaque receipt proof');
 assert.equal(reviewedProspectivePromotionQueueParity({...parity,liveQueue:parity.originalQueue}),false);
 assert.equal(reviewedProspectivePromotionQueueParity({...parity,candidateQueue:parity.candidateQueue+'\n'}),false);
 const forged=structuredClone(manifest);forged.prospective_ready_batch_preview.member_receipt_reconciliation.added_successful_run_ids.push(1);
 assert.equal(reviewedProspectivePromotionQueueParity({...parity,manifest:forged}),false);
 assert.throws(()=>proposeProspectiveReadyQueue({...args,selectedId:MEMBER_BROKER_ID}),/composite batch/);
 assert.throws(()=>proposeDisjointProspectiveReadyBatch({...args,selectedIds:[MEMBER_VAULT_COMPONENT_ID]}),/HOLD/);
 const overlapping=structuredClone(live);overlapping.items[1].scope_paths=[CORE];
 assert.throws(()=>proposeDisjointProspectiveReadyBatch({...args,liveQueue:overlapping}),/overlapping owner/);
 const opts={row:f.row,path:CORE,plan:p,sourceObjectAt:f.sourceObjectAt};
 assert.equal(reviewedMemberBrokerPlannedObject(opts),f.sourceObjectAt(f.developmentSourceSha,CORE));
 for(const mutate of [
  p=>{p.selected_composite_sources[0].source_objects[CORE]=bad;},
  p=>{p.selected_composite_sources[0].additional_source_components[0].id=MEMBER_BROKER_ID;},
  p=>{p.selected_composite_sources[0].source_merges[1].first_parent_sha='f'.repeat(40);},
  p=>{p.selected_composite_sources[0].source_merges[1].run_ids.pop();},
  p=>{p.ready_certified=true;}
 ]){const forged=structuredClone(p);mutate(forged);assert.throws(()=>reviewedMemberBrokerPlannedObject({...opts,plan:forged}));}
 // Later batches must keep the separately named component, even when its
 // original cohort row is retained rather than newly selected.
 const nextBase=structuredClone(base),nextLive=structuredClone(p.queue);
 const independent=nextLive.items[1],merge='e'.repeat(40),path=independent.scope_paths[0];
 independent.merged_source_sha=merge;nextBase.items[1].merged_source_sha=merge;
 const next=proposeDisjointProspectiveReadyBatch({...args,baselineQueue:nextBase,liveQueue:nextLive,
  selectedIds:[independent.id],
  isAncestor:(a,b)=>a===merge&&b===f.developmentSourceSha||f.isAncestor(a,b),
  firstParentChangedPaths:sha=>sha===merge?[path]:f.firstParentChangedPaths(sha),
  sourceObjectAt:(sha,pth)=>pth===path&&[merge,f.developmentSourceSha].includes(sha)?bad:f.sourceObjectAt(sha,pth)});
 assert.deepEqual(next.retained_ready_ids,[MEMBER_BROKER_ID]);
 assert.deepEqual(next.additional_source_components,p.additional_source_components);
 assert.deepEqual(next.queue.items[0],p.queue.items[0]);
 assert.equal(next.member_receipt_reconciliation,undefined,'retained member never gets a repeated delta');
});
test('member receipt reconciliation appends only four fixed receipts through a source-bound opaque proof',()=>{
 const f=fixture(),queue={published_base:{tested_source_sha:f.publishedSourceSha},items:[originalRow(),{id:'DIC-Q-33-other',state:'TESTING',notes:'preserved'}]};
 const readers={...withQueueReaders(f,queue),selectedIds:[MEMBER_BROKER_ID]},before=structuredClone(queue);
 const p=reconcileReviewedMemberReceiptQueue(queue,readers);
 assert.deepEqual(queue,before);assert.deepEqual(p.queue.items[1],queue.items[1]);
 const expected=structuredClone(queue);expected.items[0].ci_runs.push(...additions);assert.deepEqual(p.queue,expected);
 const opts={proof:p.proof,developmentSourceSha:f.developmentSourceSha,selectedIds:readers.selectedIds,receipt:p.receipt};
 assert.deepEqual(applyReviewedMemberReceiptDelta(queue,opts),expected);
 for(const mutate of [
  o=>{o.proof=structuredClone(p.proof);},o=>{o.proof={};},o=>{o.developmentSourceSha='f'.repeat(40);},
  o=>{o.selectedIds=[];},o=>{o.selectedIds=[MEMBER_BROKER_ID,MEMBER_BROKER_ID];},o=>{o.receipt={...p.receipt,added_successful_run_ids:[1]};}
 ]){const o={...opts};mutate(o);assert.throws(()=>applyReviewedMemberReceiptDelta(queue,o));}
 assert.equal(reconcileReviewedMemberReceiptQueue(queue,{...readers,selectedIds:[]}),null);
 assert.equal(reconcileReviewedMemberReceiptQueue(expected,{...withQueueReaders(f,expected),selectedIds:[MEMBER_BROKER_ID]}),null);
 for(const mutate of [
  q=>{q.items[0].ci_runs.pop();},q=>{q.items[0].ci_runs.push(1);},q=>{q.items[0].ci_runs.reverse();},
  q=>{q.items[0].notes+='changed';},q=>{q.items[0].tests.pop();},q=>{q.items[0].blockers=[];},
  q=>{q.items[0].state='READY';},q=>{q.items[0].scope_paths.push('site/cloud/main.js');},q=>{q.items.push(structuredClone(q.items[0]));}
 ]){const q=structuredClone(queue);mutate(q);assert.throws(()=>reconcileReviewedMemberReceiptQueue(q,{...withQueueReaders(f,q),selectedIds:[MEMBER_BROKER_ID]}),/HOLD/);}
 assert.throws(()=>reconcileReviewedMemberReceiptQueue(queue,{...readers,sourceObjectAt:(r,p)=>p===queuePath?bad:readers.sourceObjectAt(r,p)}),/HOLD/);
 const wrong=fixture();wrong.s.parents[LAST].pop();
 assert.throws(()=>reconcileReviewedMemberReceiptQueue(queue,{...withQueueReaders(wrong,queue),selectedIds:[MEMBER_BROKER_ID]}),/HOLD/);
});
test('historical Edge applicability is immutable; no forged opaque receipt or candidate check reduction',()=>{
 const f=fixture(),proof=review(f);
 for(const step of proof.source_merges){
  assert.deepEqual(reviewedMemberHistoricalCheckNames(step),['approval','validate','cloud-tests','mobile-browser-qa']);
  assert.throws(()=>reviewedMemberHistoricalCheckNames({...step,merge_sha:'a'.repeat(40)}));
  assert.throws(()=>reviewedMemberHistoricalCheckNames({...step,changed_paths:[CORE]}));
  assert.throws(()=>reviewedMemberHistoricalCheckNames({...step,run_ids:step.run_ids.slice(1)}));
  assert.throws(()=>verifiedSelectedHistoricalCheckNames({},f.row,'a'.repeat(40),step),/Unverified/);
 }
 assert.equal(reviewedMemberHistoricalCheckNames({}),null);
 assert.equal(reviewedMemberHistoricalCheckNames({merge_sha:'a45bb63ffd8a3eee164828c3c81e63baa6a8f155'}),null,
  'unmarked stale-family historical proof retains the default five-check contract');
 assert.deepEqual(PRODUCTION_CHECKS,['approval','validate','cloud-tests','mobile-browser-qa','sql']);
});
