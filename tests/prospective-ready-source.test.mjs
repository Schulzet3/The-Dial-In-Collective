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

test('disjoint expansion retains existing READY records and atomically plans two original TESTING IDs',async()=>{
 const {proposeDisjointProspectiveReadyBatch:batch}=await import('../scripts/release/prospective-ready-source.mjs');
 const f=fixture(),second=f.liveQueue.items[1].id,prior=f.liveQueue.items[2];
 prior.state='READY';prior.blockers=[];
 const secondPath=f.liveQueue.items[1].scope_paths[0];
 f.firstParentChangedPaths=sha=>sha===M?['supabase/migrations/selected.sql']:sha===B?[secondPath]:[];
 f.isAncestor=(sha,dev)=>[M,B].includes(sha)&&dev===A;
 const originalReader=f.sourceObjectAt;
 f.sourceObjectAt=(sha,path)=>path===secondPath?sha===P?null:[A,B].includes(sha)?'100644:'+C:null:originalReader(sha,path);
 const before=structuredClone(f.liveQueue);
 const r=batch({...f,selectedIds:[second,id]});
 assert.equal(r.status,'PROSPECTIVE_BATCH_PLAN_ONLY');
 assert.equal(r.ready_certified,false);assert.equal(r.publication_authorized,false);
 assert.deepEqual(r.retained_ready_ids,[prior.id]);
 assert.deepEqual(r.added_ids,[id,second].sort());
 assert.deepEqual(r.queue.items.filter(x=>x.state==='READY').map(x=>x.id).sort(),[id,second,prior.id].sort());
 assert.deepEqual(r.queue.items[2],prior);
 assert.deepEqual(f.liveQueue,before);
 assert.equal(batch({...f,selectedIds:[id,second]}).identity_sha256,r.identity_sha256);
 const edits=[
  x=>{x.selectedIds=[id,id]},
  x=>{x.selectedIds=[prior.id]},
  x=>{x.liveQueue.items[3].scope_paths.push(secondPath)},
  x=>{x.liveQueue.items[2].scope_paths.push(secondPath)},
  x=>{x.liveQueue.items[1].ci_runs=[]},
  x=>{x.firstParentChangedPaths=()=>['supabase/migrations/selected.sql','supabase/migrations/undeclared.sql']},
  x=>{x.liveQueue.items[1].blockers.push('Auth actual member acceptance unverified')},
 ];
 for(const edit of edits){
  const x={...f,liveQueue:structuredClone(f.liveQueue),selectedIds:[id,second]};
  edit(x);const untouched=structuredClone(x.liveQueue);
  assert.throws(()=>batch(x),/HOLD/);
  assert.deepEqual(x.liveQueue,untouched);
 }
});

test('R399 exact narrow specialist receipt admits preview only; parent audit and all other defects stay open',()=>{
 const f=fixture(),r=f.liveQueue.items[0],o=f.baselineQueue.items[0];
 const marker='Original603 603 selected current identities/lot/source manual semantic adjudication unfinished, #33 OPEN; related #267 V2/#96 scoped separately.';
 const merge='513f98ac06cdd0fe569390354420158458342859',head='f06e3f7c4143c9f9b8409bed7d062c16a0269a23';
 const path='src/server/coffee-narrative-evidence.mjs',testPath='tests/coffee-issue33-r399-keller-tenure.test.mjs';
 const row={id:'DIC-Q-33-r399-original99-producer-tenure-precision',issue:33,pr:3678,merged_source_sha:merge,scope_paths:[path],
  ci_runs:[44987903105,44987902345,44987902359,44987902371,44988168022,44988168102,44988168054,44988168083],
  blockers:['#3347 candidate certification pending',marker]};
 Object.assign(r,structuredClone(row));Object.assign(o,structuredClone(row));f.selectedId=row.id;
 f.firstParentChangedPaths=()=>[path,testPath];f.isAncestor=(m,d)=>m===merge&&d===A;
 f.sourceObjectAt=(sha,p)=>[merge,head,A].includes(sha)?p===path?'100644:3de11626496a0b698e558ec8929f0158e3083b0a':p===testPath?'100644:16c4d572ecd43860a9cd4f1a7f2baffd670382ee':null:null;
 const before=structuredClone(f.liveQueue),result=proposeProspectiveReadyQueue(f);
 assert.equal(result.ready_certified,false);assert.equal(result.publication_authorized,false);
 assert.deepEqual(f.liveQueue,before);assert.equal(result.queue.items[0].state,'READY');
 for(const edit of [
  x=>{x.liveQueue.items[0].ci_runs.pop()},
  x=>{x.liveQueue.items[0].blockers.push('Auth real hosted acceptance failed')},
  x=>{x.liveQueue.items[0].blockers[1]+=' and a new defect'},
  x=>{x.baselineQueue.items[0].blockers.pop()},
  x=>{x.sourceObjectAt=(s,p)=>p===path?'100644:3de11626496a0b698e558ec8929f0158e3083b0a':null},
  x=>{x.firstParentChangedPaths=()=>[path]},
  x=>{x.isAncestor=()=>false},
  x=>{x.liveQueue.items[0].pr=123},
  x=>{x.liveQueue.items[0].id=x.baselineQueue.items[0].id=x.selectedId='DIC-Q-33-unrelated'},
 ]) {
  const x={...f,liveQueue:structuredClone(f.liveQueue),baselineQueue:structuredClone(f.baselineQueue)};
  edit(x);assert.throws(()=>proposeProspectiveReadyQueue(x),/HOLD/);
 }
});
