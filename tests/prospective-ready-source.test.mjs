import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeProspectiveReadyQueue,BASELINE_DEV_SHA,BASELINE_QUEUE_BLOB} from '../scripts/release/prospective-ready-source.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),M='d'.repeat(40),P='e'.repeat(40);
const id='DIC-Q-509-stale-project-shot-comment-20261122';
function fixture(){
 const items=Array.from({length:63},(_,i)=>({id:i===0?id:'DIC-Q-509-synthetic-'+i,
  issue:509,title:'source migration '+i,owner_source:'owner source',state:'TESTING',
  merged_source_sha:i===0?M:B,
  scope_paths:[i===0?'supabase/migrations/selected.sql':'supabase/migrations/other'+i+'.sql'],
  tests:['historical source test'],ci_runs:[123],
  blockers:['#3347 independent candidate certification pending','Separate NEW owner Publish required for production']}));
 const base={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:P,release_sha:C,netlify_deploy_id:'receipt'},items,history:[]};
 const kwargs={baselineQueue:structuredClone(base),liveQueue:structuredClone(base),
  selectedId:id,developmentSourceSha:A,
  firstParentChangedPaths:()=>['supabase/migrations/selected.sql','tests/selected.test.mjs'],
  isAncestor:(merge,dev)=>merge===M&&dev===A,
  sourceObjectAt:(sha,path)=>path!=='supabase/migrations/selected.sql'?null:
   sha===P?null:sha===A||sha===M?'100644:'+B:null};
 return kwargs;
}
test('immutable 63 baseline produces ONLY an unverified in-memory READY-shaped source',()=>{
 const f=fixture(),r=proposeProspectiveReadyQueue(f);
 assert.equal(r.status,'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING');
 assert.equal(r.publication_authorized,false);assert.equal(r.ready_certified,false);
 assert.match(r.identity_sha256,/^[a-f0-9]{64}$/);
 assert.equal(r.baseline_count,63);assert.equal(BASELINE_DEV_SHA.length,40);
 assert.equal(BASELINE_QUEUE_BLOB.length,40);
 assert.equal(r.queue.items[0].state,'READY');assert.deepEqual(r.queue.items[0].blockers,[]);
 assert.equal(f.liveQueue.items[0].state,'TESTING');
 assert.equal(r.queue.items.filter(x=>x.state==='TESTING').length,62);
 assert.deepEqual(r.queue.items.slice(1),f.liveQueue.items.slice(1));
 assert.equal(proposeProspectiveReadyQueue(f).identity_sha256,r.identity_sha256);
});
test('reject missing source ancestry, scope, published diff, absent CI, unresolved domain defects',()=>{
 const edits=[
  x=>{x.liveQueue.items[0].merged_source_sha=null},
  x=>{x.liveQueue.items[0].ci_runs=[]},
  x=>{x.liveQueue.items[0].scope_paths=['site/other.js']},
  x=>{x.isAncestor=()=>false},
  x=>{x.firstParentChangedPaths=()=>['site/unrelated.js']},
  x=>{x.sourceObjectAt=(sha,path)=>'100644:'+B},
  x=>{x.liveQueue.items[0].blockers.push('Auth real hosted member acceptance failed')},
  x=>{x.liveQueue.items[0].state='READY'},
  x=>{x.liveQueue.published_base.release_sha=A},
  x=>{x.baselineQueue.items.pop()},
  x=>{x.liveQueue.items[1].id='DIC-Q-509-replaced'},
  x=>{x.firstParentChangedPaths=()=>null},
 ];
 for(const edit of edits){const x=fixture();edit(x);assert.throws(()=>proposeProspectiveReadyQueue(x),/PROSPECTIVE_READY_HOLD/);}
});
test('no arbitrary extra READY proposals and no state transition on original development queue',()=>{
 const f=fixture();f.selectedId='DIC-Q-509-unknown';assert.throws(()=>proposeProspectiveReadyQueue(f),/HOLD/);
 const g=fixture();g.liveQueue.items[1].state='IN_PROGRESS';
 const p=proposeProspectiveReadyQueue(g);
 assert.equal(g.liveQueue.items[1].state,'IN_PROGRESS');assert.equal(p.queue.items[1].state,'IN_PROGRESS');
});
