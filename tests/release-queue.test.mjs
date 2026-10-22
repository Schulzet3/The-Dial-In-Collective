import test from 'node:test';
import assert from 'node:assert/strict';
import {deployableChangedPaths,queueSchemaErrors,assessReleaseQueue,assessIntakeCoverage,formatQueueReport}
 from '../scripts/release/release-queue.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
const queued={id:'DIC-Q-100',issue:100,pr:101,title:'Safe shot-page update',
 state:'READY',merged_source_sha:B,owner_source:'https://github.com/example/repo/issues/100',
 scope_paths:['site/cloud/shot_card.js'],tests:['node test shot history PASS'],ci_runs:[1234],blockers:[]};
const q={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:A,release_sha:C,netlify_deploy_id:'xyz'},
 items:[queued],history:[]};
const graph=(a,b)=>a===A?b===B||b===C:a===B?b===C:a===b;
const assess=(queue=q,paths=['site/cloud/shot_card.js'],isAncestor=graph)=>
 assessReleaseQueue(queue,{publishedSourceSha:A,candidateSha:C,changedPaths:paths,isAncestor});
test('queue baseline and ready item require real immutable source and test evidence',()=>{
 assert.deepEqual(queueSchemaErrors(q),[]);
 for(const mutation of [{merged_source_sha:null},{tests:[]},{ci_runs:[]},{blockers:['failed']},{scope_paths:[]}]){
  assert.match(queueSchemaErrors({...q,items:[{...queued,...mutation}]}).join(' '),/READY/);
 }
 assert.match(queueSchemaErrors({...q,published_base:{...q.published_base,tested_source_sha:'bad'}}).join(' '),/baseline/i);
 assert.match(queueSchemaErrors({...q,items:[queued,{...queued}]}).join(' '),/Duplicate/);
});
test('a tested merged ready item allows one bundled source; unaffected documentation is ignored',()=>{
 assert.equal(assess().ready,true);
 assert.equal(assess(q,['site/cloud/shot_card.js','docs/CURRENT_STATUS.md']).ready,true);
 assert.match(formatQueueReport(assess()),/Batch source ready:\*\* YES/);
});
test('never release mixed Ready+unready merged source, including overlapping paths',()=>{
 for(const state of ['BLOCKED','IN_PROGRESS','TESTING']){
  const unready={...queued,id:'DIC-Q-101',issue:101,state,tests:[],ci_runs:[],blockers:['awaiting tests']};
  const result=assess({...q,items:[queued,unready]});
  assert.equal(result.ready,false);
  assert.match(result.errors.join(' '),/unready MERGED/);
 }
});
test('open unmerged PR stays tracked but does not enter a release batch',()=>{
 const pending={...queued,id:'DIC-Q-102',issue:102,state:'TESTING',merged_source_sha:null,tests:[],ci_runs:[],blockers:['PR open']};
 const r=assess({...q,items:[queued,pending]});
 assert.equal(r.ready,true);assert.equal(r.ready_items.length,1);assert.equal(r.other_items[0].state,'TESTING');
});
test('all app source edits must be covered by Ready inventory, no unrelated SQL or package changes',()=>{
 for(const p of ['site/cloud/new-feature.js','supabase/migrations/20261022120000_new.sql','package.json',
 'netlify/functions/sensitive.js','build_cloud.mjs']){
  const r=assess(q,['site/cloud/shot_card.js',p]);assert.equal(r.ready,false,p);
  assert.match(r.errors.join(' '),/Unqueued or not-ready/);
 }
 assert.deepEqual(deployableChangedPaths(['README.md','docs/readme.md','site/visual.css']),['site/visual.css']);
});
test('stale merged commits, empty batch and mismatched baseline all refuse',()=>{
 assert.equal(assess(q,[]).ready,false);
 assert.equal(assess({...q,published_base:{...q.published_base,tested_source_sha:C}}).ready,false);
 assert.equal(assess(q,['site/cloud/shot_card.js'],()=>false).ready,false);
});

test('CI must detect any app file introduced without even an IN_PROGRESS queue item',()=>{
 const reported=assessIntakeCoverage(q,['docs/CURRENT_STATUS.md','site/cloud/shot_card.js']);
 assert.equal(reported.tracked,true);
 const missed=assessIntakeCoverage(q,['site/cloud/shot_card.js','supabase/migrations/20261022223000_new.sql']);
 assert.equal(missed.tracked,false);assert.match(missed.errors.join(' '),/Untracked app change/);
 const pending={...queued,state:'TESTING',merged_source_sha:null,tests:[],ci_runs:[],blockers:['CI pending']};
 assert.equal(assessIntakeCoverage({...q,items:[pending]},['site/cloud/shot_card.js']).tracked,true);
 assert.equal(assessIntakeCoverage({...q,items:[]},[]).tracked,true);
});
