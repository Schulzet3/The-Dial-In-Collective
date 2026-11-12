import test from 'node:test';
import assert from 'node:assert/strict';
import {checkRunReceiptId,exactRecordedChecks,verifyReadyItems} from '../scripts/release/ready-evidence-gate.mjs';
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
