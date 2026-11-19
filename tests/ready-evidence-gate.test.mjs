import test from 'node:test';
import assert from 'node:assert/strict';
import {checkRunReceiptId,exactRecordedChecks,verifyReadyItems,githubReleaseReaders} from '../scripts/release/ready-evidence-gate.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
const item={id:'DIC-Q-1938-test',issue:1938,title:'Toggle',owner_source:'Owner',state:'READY',
 merged_source_sha:A,scope_paths:['site/admin/push.js'],
 tests:['tests/issue1938-toggle.test.mjs'],ci_runs:[11,12,13],blockers:[]};
const queue={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:B,release_sha:C,netlify_deploy_id:'deploy'},
 items:[item],history:[]};
const names=['approval','validate','cloud-tests','mobile-browser-qa','sql'];
const checks=names.map((name,i)=>({id:400+i,app:{slug:'github-actions'},name,head_sha:B,
 details_url:'https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/'+[11,12,13,11,12][i]+'/job/'+(100+i),
 status:'completed',conclusion:'success'}));
const deps={queue,items:[item],loadRun:async id=>({id,head_sha:B,status:'completed',conclusion:'success',event:'pull_request'}),
 loadChecks:async()=>checks,
 mergeChangedPaths:()=>['site/admin/push.js','tests/issue1938-toggle.test.mjs'],
 sourceObjectAt:()=>('100644:'+'f'.repeat(40)),currentSourceSha:C};
test('cited five exact-source checks and full changed test parity are operational',async()=>{
 const r=await verifyReadyItems(deps);
 assert.equal(r.ready,true,JSON.stringify(r.errors));
 assert.equal(r.verified[0].ci_source_sha,B);
});
test('missing, skipped, uncited or superseded checks fail closed',async()=>{
 for(const variant of [
  checks.filter(x=>x.name!=='sql'),
  checks.map(x=>x.name==='sql'?{...x,conclusion:'skipped'}:x),
  checks.map(x=>x.name==='sql'?{...x,details_url:'https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/999/job/1'}:x),
  [...checks,{...checks[0],id:999,conclusion:'failure'}]]){
  assert.equal((await verifyReadyItems({...deps,loadChecks:async()=>variant})).ready,false);
 }
 assert.equal(checkRunReceiptId('https://evil.example/actions/runs/11/job/1'),null);
 assert.equal(exactRecordedChecks(checks,B,[11,12,13]).length,5);
});
test('source drift is reported without false READY downgrade; bad evidence still denies',async()=>{
 const laterDrift=await verifyReadyItems({...deps,sourceObjectAt:(sha,p)=>
  sha===C&&p==='site/admin/push.js'?'100644:drift':'100644:match'});
 assert.equal(laterDrift.ready,true,'later unready same-file work cannot erase independently READY evidence');
 assert.deepEqual(laterDrift.verified[0].source_drift_paths,['site/admin/push.js']);
 assert.equal((await verifyReadyItems({...deps,sourceObjectAt:(sha,p)=>
  sha===B&&p.startsWith('tests/')?'100644:drift':'100644:match'})).ready,false);
 assert.equal((await verifyReadyItems({...deps,mergeChangedPaths:()=>
  ['site/admin/push.js','site/admin/unowned.js','tests/issue1938-toggle.test.mjs']})).ready,false);
 assert.equal((await verifyReadyItems({...deps,loadRun:async id=>
  ({id,head_sha:B,status:'completed',conclusion:'failure',event:'pull_request'})})).ready,false);
});
test('candidate batch enforces actual published diff and exact ownership, not queue labels',async()=>{
 const good=await verifyReadyItems({...deps,currentSourceSha:undefined,
  publishedSourceSha:B,candidateSha:C,candidateChangedPaths:['site/admin/push.js']});
 assert.equal(good.ready,true,good.errors.join(' | '));
 const bad=await verifyReadyItems({...deps,currentSourceSha:undefined,
  publishedSourceSha:B,candidateSha:C,candidateChangedPaths:['site/admin/push.js','site/admin/unfinished.js']});
 assert.equal(bad.ready,false);
});

test('#2169 frozen candidate reuses first-parent Git provenance even when READY test notes are prose',async()=>{
 const prose={...item,tests:['R201 six source-bound regressions PASS; notes have no test filenames']};
 const actual={...deps,queue:{...queue,items:[prose]},items:[prose],
  mergeChangedPaths:()=>['site/admin/push.js','tests/issue1938-parity.test.mjs'],
  currentSourceSha:undefined,publishedSourceSha:B,candidateSha:C,
  candidateChangedPaths:['site/admin/push.js']};
 const ok=await verifyReadyItems(actual);
 assert.equal(ok.ready,true,ok.errors.join(' | '));
 const invalid=await verifyReadyItems({...actual,sourceObjectAt:(sha,path)=>
  sha===B&&path==='tests/issue1938-parity.test.mjs'?'100644:'+'0'.repeat(40):
  '100644:'+'f'.repeat(40)});
 assert.equal(invalid.ready,false,'tested PR-head test drift must still fail closed');
});

test('#2169 co-selected READY overlaps need first-parent, ancestry and exact candidate final bytes',async()=>{
 const D='d'.repeat(40),path='site/admin/push.js';
 const first={...item,id:'DIC-Q-1938-first',merged_source_sha:A,scope_paths:[path],ci_runs:[21,22,23,24,25]};
 const second={...item,id:'DIC-Q-1938-second',merged_source_sha:D,scope_paths:[path],ci_runs:[31,32,33,34,35]};
 const owners=[first,second];
 const proof={queue:{...queue,items:owners},items:owners,publishedSourceSha:B,candidateSha:C,
  candidateChangedPaths:[path],currentSourceSha:undefined,
  loadRun:async id=>({id,head_sha:id<=25?A:D,status:'completed',conclusion:'success',event:'push'}),
  loadChecks:async sha=>names.map((name,i)=>({id:(sha===A?500:600)+i,app:{slug:'github-actions'},
   name,head_sha:sha,details_url:'https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/'+
   ((sha===A?21:31)+i)+'/job/'+(700+i),status:'completed',conclusion:'success'})),
  mergeChangedPaths:()=>[path,'tests/issue1938-toggle.test.mjs'],
  sourceObjectAt:(sha,p)=>p!==path?'100644:identical_test':
   '100644:'+(sha===A?'first':sha===D||sha===C?'last':'published'),
  isAncestor:(a,b)=>a===A&&b===D};
 const ok=await verifyReadyItems(proof);
 assert.equal(ok.ready,true,ok.errors.join(' | '));
 assert.equal((await verifyReadyItems({...proof,isAncestor:undefined})).ready,false);
 assert.equal((await verifyReadyItems({...proof,isAncestor:()=>false})).ready,false);
 assert.equal((await verifyReadyItems({...proof,sourceObjectAt:(sha,p)=>
  p===path&&sha===C?'100644:unreviewed':proof.sourceObjectAt(sha,p)})).ready,false);
 assert.equal((await verifyReadyItems({...proof,mergeChangedPaths:sha=>
  sha===D?['tests/issue1938-toggle.test.mjs']:proof.mergeChangedPaths(sha)})).ready,false);
});

test('#3424 bounded read-only transient GitHub CI retries preserve denial',async()=>{
 let n=0;
 const reader=await githubReleaseReaders('synthetic',{request:async()=>{
  n++;if(n===1)throw new TypeError('fetch failed');
  return {ok:true,status:200,json:async()=>({id:11,head_sha:A,status:'completed',conclusion:'success',event:'push'})};
 }});
 assert.equal((await reader.loadRun(11)).id,11);
 assert.equal(n,2);
 let deniedCount=0;
 const denied=await githubReleaseReaders('synthetic',{request:async()=>{
  deniedCount++;return {ok:false,status:403};}});
 await assert.rejects(denied.loadRun(11),/HTTP 403/);
 assert.equal(deniedCount,1);
 let exhausted=0;
 const broken=await githubReleaseReaders('synthetic',{request:async()=>{
  exhausted++;throw new TypeError('fetch failed');}});
 await assert.rejects(broken.loadRun(11),/transport unavailable after 3 attempt/);
 assert.equal(exhausted,3);
});
test('#3424 missing live CI proof HOLDS without fabricated co-selected overlap errors',async()=>{
 const other={...item,id:'DIC-Q-1938-other',merged_source_sha:C,
  ci_runs:[21,22,23],scope_paths:['site/admin/push.js']};
 const result=await verifyReadyItems({...deps,queue:{...queue,items:[item,other]},
  items:[item,other],currentSourceSha:undefined,publishedSourceSha:B,
  candidateSha:C,candidateChangedPaths:['site/admin/push.js'],
  loadRun:async id=>{
   if(id===11)throw new TypeError('fetch failed');
   return {id,head_sha:B,status:'completed',conclusion:'success',event:'push'};
  },isAncestor:(a,b)=>a===A&&b===C});
 assert.equal(result.ready,false);
 assert.ok(result.errors.some(x=>x.includes('fetch failed')));
 assert.equal(result.errors.some(x=>x.includes('unreviewed same-file READY overlap')),false);
 // The second synthetic owner intentionally has different CI receipts; its genuine
 // missing recorded checks remain HOLD, not source-conflict errors.
});
