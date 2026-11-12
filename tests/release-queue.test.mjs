import test from 'node:test';
import assert from 'node:assert/strict';
import {deployableChangedPaths,queueSchemaErrors,assessReleaseQueue,assessIntakeCoverage,formatQueueReport,assertApprovedReadyBatch}
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
test('candidate must descend from published source, including overlapping READY paths',()=>{
 const disconnected=(from,to)=>from===A&&to===C?false:graph(from,to);
 const result=assess(q,['site/cloud/shot_card.js'],disconnected);
 assert.equal(result.ready,false);
 assert.match(result.errors.join(' '),/Candidate source does not descend from published baseline/);
 const unavailable=(from,to)=>{if(from===A&&to===C)throw Error('missing Git object');return graph(from,to);};
 const uncertain=assess(q,['site/cloud/shot_card.js'],unavailable);
 assert.equal(uncertain.ready,false);
 assert.match(uncertain.errors.join(' '),/Cannot verify candidate ancestry/);
});
test('open unmerged PR stays tracked but does not enter a release batch',()=>{
 const pending={...queued,id:'DIC-Q-102',issue:102,state:'TESTING',merged_source_sha:null,tests:[],ci_runs:[],blockers:['PR open']};
 const r=assess({...q,items:[queued,pending]});
 assert.equal(r.ready,true);assert.equal(r.ready_items.length,1);assert.equal(r.other_items[0].state,'TESTING');
});
test('all app source edits must be covered by Ready inventory, no unrelated SQL or package changes',()=>{
 for(const p of ['site/cloud/new-feature.js','supabase/migrations/20261022120000_new.sql','package.json',
 'netlify/functions/sensitive.js','build_cloud.mjs',
 'scripts/netlify/should-ignore-build.mjs','scripts/audit/approval-coverage.mjs',
 'scripts/release/one-use-claim.mjs','scripts/pwa/service-worker.template.txt']){
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


test('a separately applied Supabase SQL-only migration is covered only by exact verified receipt and source blob',()=>{
 const sql='supabase/migrations/20261024034800_dic_pending_retry_http_conflict.sql';
 const deployed={...queued,id:'DIC-Q-5',issue:5,state:'DEPLOYED',scope_paths:[sql],
  delivered_provider:'Supabase production only',delivered_release_id:'DIC-20261024-ISSUE5-SQL-ONLY-07',
  delivered_sql_migration_version:'20261024052303',delivered_sql_source_blob_sha:C};
 const candidate={...q,items:[queued,deployed]};
 assert.equal(assessIntakeCoverage(candidate,[sql],{currentBlobSha:()=>C}).tracked,true);
 assert.equal(assessIntakeCoverage(candidate,[sql],{currentBlobSha:()=>B}).tracked,false);
 assert.equal(assessIntakeCoverage(candidate,[sql]).tracked,false);
 assert.equal(assessIntakeCoverage({...q,items:[queued,{...deployed,delivered_provider:'unverified'}]},[sql],{currentBlobSha:()=>C}).tracked,false);
 assert.equal(assessIntakeCoverage({...q,items:[queued,{...deployed,delivered_sql_migration_version:null}]},[sql],{currentBlobSha:()=>C}).tracked,false);
 assert.equal(assessIntakeCoverage(candidate,['site/cloud/shot_card.js',sql,'supabase/migrations/new.sql'],{currentBlobSha:()=>C}).tracked,false);
 assert.equal(assessIntakeCoverage({...q,items:[queued,{...deployed,scope_paths:['site/cloud/shot_card.js']}]},['site/cloud/shot_card.js'],{currentBlobSha:()=>C}).tracked,true,
  'a separate non-DEPLOYED READY item still covers its own frontend path');
});
test('DEPLOYED label cannot launder unpublished merged changes into an approved release',()=>{
 const premature={...queued,id:'DIC-Q-101',issue:101,state:'DEPLOYED',scope_paths:['site/cloud/shot_card.js']};
 const result=assess({...q,items:[queued,premature]});
 assert.equal(result.ready,false);
 assert.match(result.errors.join(' '),/DEPLOYED-labelled merged work is new/);
 const baselineDelivered={...premature,merged_source_sha:A};
 assert.equal(assess({...q,items:[queued,baselineDelivered]}).ready,true);
});

test('release grant must exactly name READY items, not merely cover overlapping files',()=>{
 const result=assess();
 assert.equal(assertApprovedReadyBatch({approved_ready_item_ids:['DIC-Q-100']},result),true);
 for(const ids of [undefined,[],['DIC-Q-101'],['DIC-Q-100','DIC-Q-101'],['DIC-Q-100','DIC-Q-100']])
  assert.throws(()=>assertApprovedReadyBatch({approved_ready_item_ids:ids},result));
 assert.throws(()=>assertApprovedReadyBatch({approved_ready_item_ids:['DIC-Q-100']},{...result,ready:false}));
});

test('#2169 new member approval worker is an owned deployable path and cannot evade scope',()=>{
 const worker='scripts/pwa/member-approval-worker.template.txt';
 assert.deepEqual(deployableChangedPaths(['docs/a.md',worker]),[worker]);
 const future={...queued,id:'DIC-Q-2258-external-notices',issue:2258,
  state:'BLOCKED',merged_source_sha:null,scope_paths:[worker],tests:[],ci_runs:[],
  blockers:['email sender and member push provider configuration unverified']};
 assert.deepEqual(queueSchemaErrors({...q,items:[queued,future]}),[]);
 assert.equal(assessIntakeCoverage({...q,items:[queued,future]},[worker],
  {currentBlobSha:()=>B}).tracked,true,'new unready worker must have a queue owner');
 assert.equal(assessIntakeCoverage(q,[worker],{currentBlobSha:()=>B}).tracked,false,
  'new deployable worker with no queue owner must be flagged');
});
