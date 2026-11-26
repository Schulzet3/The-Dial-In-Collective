import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedCiOptimizationQa,ciOptimizationQaFixture,reviewedCiOptimizationQaReceiptQueue} from './helpers/release-published-restoration.mjs';
const DEV='a'.repeat(40),CANDIDATE='b'.repeat(40);
function fixture(){
 const spec=ciOptimizationQaFixture(),objects=new Map(),parents=new Map(),changes=new Map();
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
 const args={row,dev:DEV,pub:spec.published,
  readParents:sha=>parents.get(sha),firstParentChangedPaths:sha=>changes.get(sha),
  isAncestor:()=>true,sourceObjectAt:(ref,path)=>objects.get((ref==='HEAD'?CANDIDATE:ref)+'\0'+path)??null};
 return {spec,objects,parents,changes,row,args,set};
}
test('#3667 independent QA binds the complete runtime/operational source and restored workflows',()=>{
 const x=fixture(),proof=reviewedCiOptimizationQa(x.args);
 assert.equal(proof.byPath.size,11);
 assert.equal(proof.operationalWorkflowPaths.length,4);
 assert.ok(proof.byPath.has('tests/fast-pr-check.test.mjs'));
});
test('#3667 independent QA rejects unready contamination, test drift and incorrect source/candidate bindings',()=>{
 for(const mutate of [
  x=>{x.args.row={...x.row,issue:33};},
  x=>{x.args.row={...x.row,scope_paths:['package.json','site/cloud/main.js']};},
  x=>{x.args.pub=DEV;},
  x=>{x.parents.set(x.spec.steps[0].merge,[DEV]);},
  x=>{x.args.isAncestor=()=>false;},
  x=>{x.changes.set(x.spec.steps[0].merge,[...x.spec.steps[0].changed,'site/cloud/unready.js']);},
  x=>{x.set(DEV,'scripts/audit/run-full-suite.mjs','100644:'+'0'.repeat(40));},
  x=>{x.set(DEV,'tests/ci-optimization.test.mjs',x.spec.source_objects['tests/ci-optimization.test.mjs']);},
  x=>{x.set(CANDIDATE,'.github/workflows/cloud-beta-ci.yml',x.spec.source_objects['.github/workflows/cloud-beta-ci.yml']);},
  x=>{x.set(CANDIDATE,'tests/fast-pr-check.test.mjs',null);},
  x=>{x.set(CANDIDATE,'package.json',x.spec.published_objects['package.json']);},
  x=>{x.changes.set(DEV,[...Object.keys(x.spec.qa_objects),'site/cloud/main.js']);},
  x=>{x.row.ci_runs.pop();}
 ]){const x=fixture();mutate(x);assert.throws(()=>reviewedCiOptimizationQa(x.args));}
 const x=fixture();assert.equal(reviewedCiOptimizationQa({...x.args,row:{...x.row,id:'DIC-Q-33-not-selected'}}),null);
});
test('#3667 prospective queue adds only the exact 16 missing successful source receipts',()=>{
 const x=fixture(),queue={items:[x.row,{id:'DIC-Q-33-other',state:'TESTING',ci_runs:[1]}]},before=structuredClone(queue);
 const result=reviewedCiOptimizationQaReceiptQueue(queue,{added:[x.row.id]});
 assert.deepEqual(queue,before);assert.deepEqual(result.items[1],before.items[1]);
 assert.equal(result.items[0].ci_runs.length,41);
 assert.deepEqual(result.items[0].ci_runs.slice(0,25),before.items[0].ci_runs);
 assert.throws(()=>reviewedCiOptimizationQaReceiptQueue({...queue,items:[{...x.row,ci_runs:[1]}]},{added:[x.row.id]}));
});
