import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedCiOptimizationComposite,reviewedCiHistoricalCheckNames,ciOptimizationReviewFixture,reconcileReviewedCiReceiptQueue} from '../scripts/release/reviewed-ci-optimization-source.mjs';
const DEV='a'.repeat(40),CANDIDATE='b'.repeat(40);
function fixture(){
 const spec=ciOptimizationReviewFixture(),objects=new Map(),parents=new Map(),changes=new Map();
 const set=(ref,path,value)=>objects.set(ref+'\0'+path,value);
 for(const step of spec.steps){
  parents.set(step.merge,step.parents);changes.set(step.merge,step.changed);
  for(const path of step.changed){set(step.parents[0],path,step.before[path]);set(step.merge,path,step.after[path]);}
 }
 for(const [path,value] of Object.entries(spec.source_objects)){
  set(spec.source,path,value);set(spec.qa_parent,path,value);
  set(DEV,path,spec.qa_objects[path]??value);
  set(spec.published,path,spec.published_objects[path]);
  set(CANDIDATE,path,path.startsWith('.github/')?spec.published_objects[path]:(spec.qa_objects[path]??value));
 }
 parents.set(DEV,[spec.qa_parent]);changes.set(DEV,Object.keys(spec.qa_objects));
 const row={id:spec.id,issue:spec.issue,pr:spec.pr,state:'TESTING',merged_source_sha:spec.merge,
  scope_paths:['package.json'],ci_runs:[...spec.original_runs]};
 const args={row,developmentSourceSha:DEV,publishedSourceSha:spec.published,
  readParents:sha=>parents.get(sha),firstParentChangedPaths:sha=>changes.get(sha),
  isAncestor:()=>true,sourceObjectAt:(ref,path)=>objects.get(ref+'\0'+path)??null};
 return {spec,objects,parents,changes,row,args,set};
}
test('#3667 exact package/runner and operational source proof preserves published workflows',()=>{
 const {args,spec}=fixture(),proof=reviewedCiOptimizationComposite(args);
 assert.deepEqual(proof.deployable_paths,['package.json']);
 assert.equal(proof.operational_source_sha,spec.source);
 assert.equal(proof.source_objects['scripts/audit/run-full-suite.mjs'],spec.source_objects['scripts/audit/run-full-suite.mjs']);
 assert.equal(proof.operational_workflows.length,4);
 assert.equal(proof.publication_authorized,false);
 assert.equal(proof.ready_certified,false);
 assert.equal(proof.source_merges.length,6);
 for(const step of proof.source_merges.filter(s=>s.historical_applicability))
  assert.deepEqual(reviewedCiHistoricalCheckNames(step),['approval','validate','cloud-tests','mobile-browser-qa']);
 assert.ok(proof.source_merges.some(s=>!s.historical_applicability),'SQL workflow source retains all five historical checks');
});
test('#3667 rejects changed row, publication baseline, parent, source, test and excluded identity',()=>{
 for(const mutate of [
  x=>{x.args.row={...x.row,issue:33};},
  x=>{x.args.row={...x.row,merged_source_sha:DEV};},
  x=>{x.args.row={...x.row,scope_paths:['package.json','site/cloud/main.js']};},
  x=>{x.args.publishedSourceSha=DEV;},
  x=>{x.parents.set(x.spec.steps[0].merge,[DEV]);},
  x=>{x.args.isAncestor=()=>false;},
  x=>{x.changes.set(x.spec.steps[0].merge,[...x.spec.steps[0].changed,'site/cloud/unready.js']);},
  x=>{x.set(DEV,'scripts/audit/run-full-suite.mjs','100644:'+'0'.repeat(40));},
  x=>{x.set(DEV,'tests/ci-optimization.test.mjs',x.spec.source_objects['tests/ci-optimization.test.mjs']);},
  x=>{x.set(x.spec.published,'.github/workflows/cloud-beta-ci.yml','100644:'+'0'.repeat(40));},
  x=>{x.changes.set(DEV,[...Object.keys(x.spec.qa_objects),'site/cloud/main.js']);},
  x=>{x.row.ci_runs.pop();}
 ]){const x=fixture();mutate(x);assert.throws(()=>reviewedCiOptimizationComposite(x.args),/CI optimization/);}
 const x=fixture();assert.equal(reviewedCiOptimizationComposite({...x.args,row:{...x.row,id:'DIC-Q-33-not-selected'}}),null);
});
test('#3667 historical four-check exception requires the private exact reviewed source step',()=>{
 const proof=reviewedCiOptimizationComposite(fixture().args),step=proof.source_merges.find(x=>x.historical_applicability);
 for(const change of [{merge_sha:DEV},{first_parent_sha:DEV},{run_ids:[1]},{changed_paths:['package.json']},{historical_applicability:'arbitrary'}])
  assert.throws(()=>reviewedCiHistoricalCheckNames({...step,...change}),/CI optimization/);
});
test('#3667 receipt reconciliation only appends exact successful historical sources when selected',()=>{
 const x=fixture(),queue={items:[x.row,{id:'DIC-Q-33-other',state:'TESTING',ci_runs:[1]}]},before=structuredClone(queue);
 assert.equal(reconcileReviewedCiReceiptQueue(queue,{...x.args,selectedIds:['DIC-Q-33-other']}),null);
 const result=reconcileReviewedCiReceiptQueue(queue,{...x.args,selectedIds:[x.row.id]});
 assert.deepEqual(queue,before);
 assert.deepEqual(result.queue.items[1],before.items[1]);
 assert.deepEqual(result.queue.items[0].ci_runs.slice(0,x.spec.original_runs.length),x.spec.original_runs);
 assert.equal(result.queue.items[0].ci_runs.length,41);
 assert.equal(reconcileReviewedCiReceiptQueue(result.queue,{...x.args,row:result.queue.items[0],selectedIds:[x.row.id]}),null);
 assert.throws(()=>reconcileReviewedCiReceiptQueue({...queue,items:[{...x.row,ci_runs:[...x.row.ci_runs,1]}]},
  {...x.args,selectedIds:[x.row.id]}),/CI optimization/);
});

test('#3667 raw promotion parity replays only the reviewed receipt additions and exact queue bytes',async()=>{
 const {reviewedProspectivePromotionQueueParity:parity}=await import('../scripts/release/ready-only-candidate.mjs');
 const x=fixture(),oldId='DIC-Q-509-existing-ready';
 const source={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:x.spec.published,release_sha:'5b256f1fc0717d3635f7148b934a1f91f8991685',netlify_deploy_id:'fixture'},history:[],
  items:[{...x.row,title:'CI source fixture',owner_source:'https://github.com/Schulzet3/The-Dial-In-Collective/issues/3667',tests:['source fixture'],blockers:['candidate five checks pending']},
   {id:oldId,issue:509,title:'Prior READY fixture',owner_source:'fixture',state:'READY',merged_source_sha:DEV,scope_paths:['site/old.js'],tests:['prior source'],ci_runs:[123],blockers:[]}]};
 const delta=reconcileReviewedCiReceiptQueue(source,{...x.args,selectedIds:[x.row.id]});
 const proposed=delta.queue;proposed.items[0].state='READY';proposed.items[0].blockers=[];
 const plan={status:'PROSPECTIVE_BATCH_PLAN_ONLY',ready_certified:false,publication_authorized:false,
  baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',development_source_sha:DEV,
  identity_sha256:'1'.repeat(64),added_ids:[x.row.id],retained_ready_ids:[oldId],queue:proposed,
  ci_operational_receipt_reconciliation:delta.receipt};
 const manifest={kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  candidate_branch:'release-candidates/prospectbatch3889-'+'1'.repeat(20),development_source_sha:DEV,
  published_source_sha:x.spec.published,selected_ready_item_ids:[x.row.id,oldId],
  prospective_ready_batch_preview:{status:plan.status,publication_authorized:false,ready_certified:false,
   baseline_queue_blob:plan.baseline_queue_blob,added_ids:plan.added_ids,retained_ready_ids:plan.retained_ready_ids,identity_sha256:plan.identity_sha256}};
 const raw=q=>JSON.stringify(q,null,2)+'\n';
 const opts={manifest,originalQueue:raw(source),candidateQueue:raw(proposed),liveQueue:raw(proposed),prospectiveBatchPlan:plan};
 assert.equal(parity(opts),true);
 for(const mutate of [
  o=>{o.liveQueue+=' ';},
  o=>{delete o.prospectiveBatchPlan.ci_operational_receipt_reconciliation;},
  o=>{o.prospectiveBatchPlan.ci_operational_receipt_reconciliation.source_sha=DEV;},
  o=>{o.prospectiveBatchPlan.ci_operational_receipt_reconciliation.added_successful_run_ids.push(123);},
  o=>{o.prospectiveBatchPlan.queue.items[1].title='unrelated edit';o.candidateQueue=o.liveQueue=raw(o.prospectiveBatchPlan.queue);},
  o=>{o.prospectiveBatchPlan.queue.items[0].ci_runs.push(123);o.candidateQueue=o.liveQueue=raw(o.prospectiveBatchPlan.queue);},
  o=>{const q=JSON.parse(o.originalQueue);q.items[0].merged_source_sha=DEV;o.originalQueue=raw(q);}
 ]){const input=structuredClone(opts);mutate(input);assert.equal(parity(input),false);}
});


test('#3667 unselected amended regression restores full published test only at its exact reviewed generation',async()=>{
 const {reviewedCiOptimizationUnselectedTest:review}=await import('../scripts/release/reviewed-ci-optimization-source.mjs');
 const x=fixture(),path='tests/ci-optimization.test.mjs';
 const args={selectedIds:['DIC-Q-509-independent'],path,developmentSourceSha:DEV,
  publishedSourceSha:x.spec.published,qaFixSha:DEV,referenceObject:x.spec.source_objects[path],sourceObjectAt:x.args.sourceObjectAt};
 assert.equal(review(args),true);
 for(const delta of [
  {selectedIds:[x.spec.id]},{selectedIds:undefined},{path:'tests/unrelated.test.mjs'},
  {developmentSourceSha:'invalid'},{publishedSourceSha:DEV},{qaFixSha:'invalid'},
  {referenceObject:'100644:'+'f'.repeat(40)},
  {sourceObjectAt:(r,p)=>r===DEV?'100644:'+'f'.repeat(40):x.args.sourceObjectAt(r,p)},
  {sourceObjectAt:(r,p)=>r===x.spec.qa_parent?'100644:'+'f'.repeat(40):x.args.sourceObjectAt(r,p)},
  {sourceObjectAt:(r,p)=>r===x.spec.source?'100644:'+'f'.repeat(40):x.args.sourceObjectAt(r,p)},
  {sourceObjectAt:(r,p)=>r===x.spec.published?'100644:'+'f'.repeat(40):x.args.sourceObjectAt(r,p)},
  {qaFixSha:x.spec.qa_parent}
 ])assert.equal(review({...args,...delta}),false);
});
