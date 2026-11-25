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

test('co-selected shared TESTING path requires contiguous published-to-live first-parent objects; no per-ID rebuild',async()=>{
 const {proposeDisjointProspectiveReadyBatch:batch}=await import('../scripts/release/prospective-ready-source.mjs');
 const f=fixture(),second=f.liveQueue.items[1].id,path='site/cloud/main.js';
 for(const q of [f.baselineQueue,f.liveQueue])for(const row of q.items.slice(0,2))row.scope_paths=[path];
 const pub='100644:'+P,first='100644:'+M,last='100644:'+B;
 f.firstParentChangedPaths=sha=>[M,B].includes(sha)?[path]:[];
 f.isAncestor=(sha,tip)=>(sha===M&&[B,A].includes(tip))||(sha===B&&tip===A);
 f.sourceObjectAt=(sha,p)=>p!==path?null:sha===P||sha===M+'^'?pub:sha===M||sha===B+'^'?first:[B,A].includes(sha)?last:null;
 const input={...f,selectedIds:[second,id]},before=structuredClone(f.liveQueue);
 const result=batch(input);
 assert.equal(result.kind,'DIC-PROSPECTIVE-CHRONOLOGICAL-BATCH-3889-V2');
 assert.deepEqual(result.shared_source_chains,[{path,published_object:pub,steps:[{id,merge_sha:M,parent_object:pub,object:first},{id:second,merge_sha:B,parent_object:first,object:last}]}]);
 assert.equal(result.ready_certified,false);assert.equal(result.publication_authorized,false);
 assert.deepEqual(f.liveQueue,before);
 assert.equal(batch({...input,selectedIds:[id,second]}).identity_sha256,result.identity_sha256);
 const read=f.sourceObjectAt;
 for(const edit of [
  x=>{x.sourceObjectAt=(sha,p)=>sha===M+'^'?last:read(sha,p)},
  x=>{x.sourceObjectAt=(sha,p)=>sha===B+'^'?pub:read(sha,p)},
  x=>{x.sourceObjectAt=(sha,p)=>sha===A?first:read(sha,p)},
  x=>{x.isAncestor=()=>true},
  x=>{x.firstParentChangedPaths=()=>['site/unrelated.js']},
  x=>{x.liveQueue.items[3].scope_paths.push(path)},
  x=>{x.liveQueue.items[1].state='READY';x.liveQueue.items[1].blockers=[];x.selectedIds=[id]},
  x=>{x.liveQueue.items[1].ci_runs=[]},
 ]){
  const x={...input,liveQueue:structuredClone(f.liveQueue)};edit(x);
  assert.throws(()=>batch(x),/HOLD/);
 }
});


// #3889 exact first-parent patches may be replayed across deployed-only context,
// never across absent/ambiguous hunks, extra live changes or false Git objects.
test('selected-only text replay requires exact historical postimage and unique full context',async()=>{
 const {replayExactTextPatch}=await import('../scripts/release/prospective-ready-source.mjs');
 const input={
  "before": "outside old\nanchor\nvalue old\nend\n",
  "after": "outside old\nanchor\nvalue new\nend\n",
  "selected": "published outside\nanchor\nvalue old\nend\n",
  "patch": "diff --git a/site/cloud/main.js b/site/cloud/main.js\nindex aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb 100644\n--- a/site/cloud/main.js\n+++ b/site/cloud/main.js\n@@ -2,3 +2,3 @@\n anchor\n-value old\n+value new\n end\n",
  "path": "site/cloud/main.js",
  "beforeObject": "100644:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "afterObject": "100644:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
};
 assert.equal(replayExactTextPatch(input),"published outside\nanchor\nvalue new\nend\n");
 for(const bad of [
  {...input,selected:input.selected+input.selected},
  {...input,selected:'missing\n'},
  {...input,after:input.after+'extra\n'},
  {...input,patch:input.patch.replace(' end\n','')},
  {...input,patch:input.patch.replace('@@ -2,3 +2,3','@@ -1,3 +1,3')},
  {...input,afterObject:'100755:'+input.afterObject.slice(7)},
  {...input,patch:input.patch.replace('index ','bogus ')}
 ])assert.throws(()=>replayExactTextPatch(bad),/selected-only replay/);
});

test('prospective shared replay accepts only exact selected final Git object; no arbitrary source pin',async()=>{
 const {proposeDisjointProspectiveReadyBatch:batch}=await import('../scripts/release/prospective-ready-source.mjs');
 const {createHash}=await import('node:crypto');
 const f=fixture(),second=f.liveQueue.items[1].id,path='site/cloud/main.js';
 for(const q of [f.baselineQueue,f.liveQueue])for(const row of q.items.slice(0,2))row.scope_paths=[path];
 const texts={
  [P]:'published outside\nanchor A\nold A\nend A\nspacer\nanchor B\nold B\nend B\n',
  [M+'^']:'historical outside\nanchor A\nold A\nend A\nspacer\nanchor B\nold B\nend B\n',
  [M]:'historical outside\nanchor A\nnew A\nend A\nspacer\nanchor B\nold B\nend B\n',
  [B+'^']:'published outside\nanchor A\nnew A\nend A\nspacer\nanchor B\nold B\nend B\n',
  [B]:'published outside\nanchor A\nnew A\nend A\nspacer\nanchor B\nnew B\nend B\n'
 };
 texts[A]=texts[B];
 const object=text=>'100644:'+createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
 f.firstParentChangedPaths=sha=>[M,B].includes(sha)?[path]:[];
 f.isAncestor=(sha,tip)=>(sha===M&&[B,A].includes(tip))||(sha===B&&tip===A);
 f.sourceTextAt=(sha,p)=>p===path?texts[sha]:undefined;
 f.sourceObjectAt=(sha,p)=>p===path&&texts[sha]?object(texts[sha]):null;
 f.firstParentPatch=(sha,p)=>{
  assert.equal(p,path);
  const tag=sha===M?'A':'B',start=sha===M?2:6;
  return 'diff --git a/'+path+' b/'+path+'\nindex '+object(texts[sha+'^']).slice(7)+'..'+object(texts[sha]).slice(7)+' 100644\n--- a/'+path+'\n+++ b/'+path+'\n@@ -'+start+',3 +'+start+',3 @@\n anchor '+tag+'\n-old '+tag+'\n+new '+tag+'\n end '+tag+'\n';
 };
 const input={...f,selectedIds:[id,second]};
 const before=structuredClone(f.liveQueue),result=batch(input);
 assert.equal(result.shared_source_chains[0].selected_only_replay,true);
 assert.equal(result.ready_certified,false);
 assert.equal(result.publication_authorized,false);
 assert.deepEqual(f.liveQueue,before);
 assert.equal(batch({...input,selectedIds:[second,id]}).identity_sha256,result.identity_sha256);
 for(const changed of [
  {sourceTextAt:undefined},
  {sourceTextAt:(sha,p)=>sha===M?texts[M]+'forged\n':f.sourceTextAt(sha,p)},
  {firstParentPatch:(sha,p)=>f.firstParentPatch(sha,p).replace(' end A\n','')},
  {sourceObjectAt:(sha,p)=>sha===A?object(texts[A]+'unselected\n'):f.sourceObjectAt(sha,p)},
  {sourceTextAt:(sha,p)=>sha===P?texts[P]+texts[P]:f.sourceTextAt(sha,p)},
  {liveQueue:{...f.liveQueue,items:f.liveQueue.items.map((row,i)=>i===3?{...row,scope_paths:[path]}:row)}}
 ])assert.throws(()=>batch({...input,...changed}),/HOLD/);
});


test('reviewed direct-child source amendments preserve original ownership and reject fake ancestry or paths',async()=>{
 const {reviewedSelectedAmendment:review}=await import('../scripts/release/prospective-ready-source.mjs');
 const parent='3945a7353dadf81e7702170dde58cb95241e5782',merge='0e377d1037d22518e7f42bc3935cb1c2d76f000b';
 const engine='site/lib/engine.js',ui='site/lib/ui.js',reg='tests/issue455-r411-nonpersonal-prior-yield-boundary.test.mjs';
 const objects={[engine]:'100644:bdec2d5c00783cc0394667cae112e9a0ad9f2c98',[reg]:'100644:76ef54b0e6afa2ae48ffc194561e4f5e57f1d2fc'};
 const opts={row:{id:'DIC-Q-455-r411-nonpersonal-starting-yield-boundary',merged_source_sha:parent,scope_paths:[engine,ui]},
  developmentSourceSha:A,readParents:sha=>sha===merge?[parent]:[],isAncestor:(a,b)=>a===merge&&b===A,
  firstParentChangedPaths:sha=>sha===parent?[engine,ui,reg]:sha===merge?[engine,reg,'docs/workstreams/amendment.md']:[],
  sourceObjectAt:(sha,path)=>sha===merge?objects[path]:'100644:'+P};
 assert.deepEqual(review(opts),{id:opts.row.id,parent,merge,paths:[engine,reg].sort(),objects});
 for(const bad of [{readParents:()=>[]},{readParents:()=>[parent,A]},{isAncestor:()=>false},
  {firstParentChangedPaths:sha=>sha===merge?[engine,reg,ui]:opts.firstParentChangedPaths(sha)},
  {firstParentChangedPaths:sha=>sha===parent?[engine,ui]:opts.firstParentChangedPaths(sha)},
  {sourceObjectAt:()=>null},{row:{...opts.row,scope_paths:[ui]}}])
  assert.throws(()=>review({...opts,...bad}),/HOLD/);
 assert.equal(review({...opts,row:{...opts.row,id:'unselected'}}),null);
});


test('later disjoint expansion retains a previously certified multi-owner cohort without replaying it as new',async()=>{
 const {proposeDisjointProspectiveReadyBatch:batch}=await import('../scripts/release/prospective-ready-source.mjs');
 const f=fixture(),old=f.liveQueue.items.slice(1,3),shared='site/cloud/main.js';
 for(const row of old){row.state='READY';row.blockers=[];row.scope_paths=[shared];}
 old[0].merged_source_sha=B;old[1].merged_source_sha=C;
 const before=structuredClone(f.liveQueue);
 const result=batch({...f,selectedIds:[id]});
 assert.deepEqual(result.retained_ready_ids,old.map(x=>x.id).sort());
 assert.deepEqual(result.queue.items.slice(1,3),old);
 assert.deepEqual(f.liveQueue,before);
 assert.equal(result.ready_certified,false);
 assert.equal(result.publication_authorized,false);
 // A new TESTING owner of the old path is not a retained owner: reject.
 const mixed=structuredClone(f.liveQueue);mixed.items[0].scope_paths=[shared];
 const base=structuredClone(f.baselineQueue);base.items[0].scope_paths=[shared];
 assert.throws(()=>batch({...f,liveQueue:mixed,baselineQueue:base,selectedIds:[id],firstParentChangedPaths:()=>[shared]}),/HOLD/);
});

test('recommendation-context fixture correction is attributed only to its exact direct child',async()=>{
 const {reviewedSelectedAmendment:review}=await import('../scripts/release/prospective-ready-source.mjs');
 const parent='7607c69f62f65979079fd02a0d25f4b7653a2303',merge='0cd5054c6684a63062daf794e33ea265daf5ce66';
 const path='supabase/tests/recommendation_context_null_controls.sql';
 const migration='supabase/migrations/20261114115000_dic_recommendation_context_null_control_guard.sql';
 const object='100644:61e496319939f59eb4b7843fdb93aa6b4c1e33fa';
 const old='100644:c6c88c23a6d024f5d15bf087d10e15f6f282109a';
 const opts={row:{id:'DIC-Q-509-recommendation-context-null-control-guard',merged_source_sha:parent,scope_paths:[migration]},
  developmentSourceSha:A,readParents:sha=>sha===merge?[parent]:[],isAncestor:(a,b)=>a===merge&&b===A,
  firstParentChangedPaths:sha=>sha===parent?[migration,path,'scripts/audit/isolated-sql-regression.sh']:sha===merge?[path,'docs/workstreams/issue-509.md']:[],
  sourceObjectAt:(sha,p)=>p===path?(sha===merge?object:sha===parent?old:null):null};
 assert.deepEqual(review(opts),{id:opts.row.id,parent,merge,paths:[path],objects:{[path]:object}});
 for(const bad of [{readParents:()=>[parent,A]},{readParents:()=>[]},{isAncestor:()=>false},
  {firstParentChangedPaths:sha=>sha===merge?[path,migration]:opts.firstParentChangedPaths(sha)},
  {firstParentChangedPaths:sha=>sha===parent?[migration]:opts.firstParentChangedPaths(sha)},
  {sourceObjectAt:()=>old},{sourceObjectAt:()=>object}])
  assert.throws(()=>review({...opts,...bad}),/HOLD/);
 assert.equal(review({...opts,row:{...opts.row,id:'DIC-Q-509-other'}}),null);
 assert.equal(review({...opts,row:{...opts.row,merged_source_sha:merge}}),null);
});


// The original dual migration row must never borrow an unobserved earlier
// introduction from the second merge. Verify both exact Git parents and all
// owned fixture/runner objects, not arbitrary manifest-provided claims.
test('stale-family dual-source proof is exact, non-mutating and rejects forged history',async()=>{
 const {reviewedStaleFamilyComposite:review,proposeDisjointProspectiveReadyBatch:batch}=await import('../scripts/release/prospective-ready-source.mjs');
 const paths=[
  'supabase/migrations/20261119120000_dic_reconcile_stale_personal_family_stats.sql',
  'supabase/migrations/20261119122000_dic_reconcile_all_personal_family_derived_stats.sql',
  'supabase/tests/family_statistics_historical_reconcile_pre.sql',
  'supabase/tests/family_statistics_historical_reconcile_post.sql',
  'supabase/tests/family_statistics_complete_reconcile_post.sql',
  'scripts/audit/isolated-sql-regression.sh','tests/sql-runner-coverage.test.mjs'];
 const pub='2d22d448160d428a977f06482323646b92818fcf';
 const first='a45bb63ffd8a3eee164828c3c81e63baa6a8f155',last='1def2c9d6573297c406192b413ffc3e7620ffe7a';
 const p1='5eca094cf069b820e9cbfd927f7dc6469e2e84fa',p2='1521edf9c6a81ce80253a217dcf08d5c0b0b5f83';
 const before=[null,null,null,null,null,'ff048e4e1e68cfeb73b82c922148683813107ad9','ffafb78bdaf9751696d2b6b948857c79abd66b1a'];
 const mid=['8b66a860e6dba420c447d0c9de13d7e69e53879c',null,'2573be7360c184b33fa6f44609e18d7e25c60178','a64c72781017301d4b547842099f09c8a01e25d9',null,'32e169dda9f3a297656198b9a7e60a48322fdb86','6035e6e4af92722e279c5376ba3fd75ed174c41c'];
 const end=[mid[0],'26b06be50ebb0c823ec6a98a0015963925dcc6f0','730b789570f85ffb085bb74c0011408bb7f62c9f',mid[3],'7013829d296a2d6b1a9a450374285ab8738169f4','526ccf9a276acee21e4362cacf8a2fda69b8c8d2','587d36c5931b1c14220914bd32460af5690984e9'];
 const live=[...end.slice(0,5),'76578af1b7a2a9acce39802e2db933a8af9d0d10','9550fd21ff0edc93adbeed716e657a504a41d2e9'];
 const objects={[p1]:before,[first]:mid,[p2]:mid,[last]:end,[A]:live,[pub]:[null,null,...live.slice(2)]};
 const row={id:'DIC-Q-509-stale-family-statistics-reconcile',issue:509,merged_source_sha:last,scope_paths:paths.slice(0,2),
  state:'TESTING',title:'dual migration',owner_source:'owner scope',tests:['exact historic receipts'],
  ci_runs:[44519926449,44519926537,44519926388,44519926461,44526403238,44526403147,44526403127,44526403259],
  blockers:['#3347 independent candidate certification pending']};
 const opts={row,developmentSourceSha:A,publishedSourceSha:pub,
  readParents:s=>s===first?[p1,'89fcc5a79855b0a44d77e787aca8b33dbf043688']:s===last?[p2,'0977a43e4a6eb15c8bb1e33de59ed44577f364c2']:[],
  isAncestor:(a,b)=>a===first&&b===p2||a===last&&b===A,
  firstParentChangedPaths:s=>s===first?paths.filter((_,i)=>before[i]!==mid[i]):s===last?paths.filter((_,i)=>mid[i]!==end[i]):[],
  sourceObjectAt:(s,p)=>{const v=objects[s]?.[paths.indexOf(p)];return v==null?null:'100644:'+v;}};
 const beforeRow=structuredClone(row),proof=review(opts);
 assert.deepEqual(proof.source_merges.map(s=>s.merge_sha),[first,last]);
 assert.deepEqual(proof.deployable_paths,paths.slice(0,2));
 assert.deepEqual(row,beforeRow);
 const f=fixture();f.baselineQueue.published_base.tested_source_sha=pub;f.liveQueue.published_base.tested_source_sha=pub;
 f.baselineQueue.items[0]=structuredClone(row);f.liveQueue.items[0]=structuredClone(row);
 const result=batch({...f,...opts,selectedIds:[row.id]});
 assert.deepEqual(result.selected_composite_sources,[proof]);
 assert.equal(result.queue.items[0].state,'READY');assert.equal(f.liveQueue.items[0].state,'TESTING');
 assert.equal(result.ready_certified,false);assert.equal(result.publication_authorized,false);
 assert.throws(()=>proposeProspectiveReadyQueue({...f,...opts,selectedId:row.id}),/composite batch/);
 for(const edit of [
  {row:{...row,merged_source_sha:first}}, {row:{...row,scope_paths:[paths[1]]}},
  {row:{...row,ci_runs:row.ci_runs.slice(4)}},{publishedSourceSha:P},
  {readParents:()=>[]},{readParents:s=>opts.readParents(s).reverse()},
  {isAncestor:()=>false},{firstParentChangedPaths:s=>[...opts.firstParentChangedPaths(s),'site/cloud/main.js']},
  {firstParentChangedPaths:s=>opts.firstParentChangedPaths(s).filter(p=>p!==paths[0])},
  ...[p1,first,p2,last,A,pub].map(ref=>({sourceObjectAt:(s,p)=>s===ref&&p===paths[0]?'100644:'+P:opts.sourceObjectAt(s,p)})),
  {sourceObjectAt:(s,p)=>s===A&&p===paths[5]?'100644:'+P:opts.sourceObjectAt(s,p)},
  {sourceObjectAt:(s,p)=>s===pub&&p===paths[2]?null:opts.sourceObjectAt(s,p)}
 ])assert.throws(()=>review({...opts,...edit}),/HOLD/);
 assert.equal(review({...opts,row:{...row,id:'DIC-Q-509-unrelated'}}),null);
});
