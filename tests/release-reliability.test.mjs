import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyReleaseRisk,assessReadyEvidence,validateReleaseTriggerReceipt,preflightReadyBatch} from '../scripts/release/release-reliability.mjs';
const S='a'.repeat(40),B='b'.repeat(40);
const item={id:'DIC-Q-1938-test',issue:1938,title:'Push status',owner_source:'Owner approved',state:'READY',merged_source_sha:S,scope_paths:['site/admin/push.js'],tests:['focused PASS'],ci_runs:[123],blockers:[]};
const names=['approval','validate','cloud-tests','mobile-browser-qa','sql'];
const checks=names.map(name=>({name,sha:S,conclusion:'success',status:'completed'}));
test('risk tiers keep one build and required security gates',()=>{
 assert.equal(classifyReleaseRisk(['docs/a.md']).builds,0);
 assert.equal(classifyReleaseRisk(['site/style.css']).tier,'low');
 assert.equal(classifyReleaseRisk(['site/lib/engine.js']).tier,'medium');
 assert.equal(classifyReleaseRisk(['site/admin/push.js']).tier,'high');
 assert.equal(classifyReleaseRisk(['supabase/migrations/1.sql']).tier,'high');
 assert.equal(classifyReleaseRisk(['site/admin/push.js']).builds,1);
});
test('READY fails closed on wrong merged SHA, skipped checks and blockers',()=>{
 assert.equal(assessReadyEvidence(item,{mergedSha:S,changedPaths:item.scope_paths,checks}).ready,true);
 assert.equal(assessReadyEvidence(item,{mergedSha:B,changedPaths:item.scope_paths,checks}).ready,false);
 assert.equal(assessReadyEvidence(item,{mergedSha:S,changedPaths:item.scope_paths,checks:checks.map(x=>({...x,conclusion:'skipped'}))}).ready,false);
 assert.equal(assessReadyEvidence({...item,blockers:['unverified']},{mergedSha:S,changedPaths:item.scope_paths,checks}).ready,false);
});
test('release request requires actual controller event; no run is BLOCKED',()=>{
 assert.equal(validateReleaseTriggerReceipt({requestCommitSha:S,mainHeadSha:S,workflowRuns:[],elapsedSeconds:120}).status,'BLOCKED');
 assert.equal(validateReleaseTriggerReceipt({requestCommitSha:S,mainHeadSha:S,workflowRuns:[],elapsedSeconds:20}).status,'WAIT');
 assert.equal(validateReleaseTriggerReceipt({requestCommitSha:S,mainHeadSha:B,workflowRuns:[],elapsedSeconds:120}).status,'BLOCKED');
 assert.equal(validateReleaseTriggerReceipt({requestCommitSha:S,mainHeadSha:S,workflowRuns:[{id:123,head_sha:S,name:'DIC chat-approved single-use production request',path:'.github/workflows/dic-chat-approved-release.yml',event:'push',status:'completed',conclusion:'success'}],elapsedSeconds:120}).status,'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');
 assert.equal(validateReleaseTriggerReceipt({requestCommitSha:S,mainHeadSha:S,workflowRuns:null,elapsedSeconds:120}).status,'UNKNOWN');
});
test('batch rejects overlap, unowned paths and invalid READY evidence',()=>{
 const queue={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',published_base:{tested_source_sha:B,release_sha:S,netlify_deploy_id:'deploy'},items:[item],history:[]};
 const result=preflightReadyBatch(queue,[item],{publishedSourceSha:B,candidateSha:S,changedPaths:item.scope_paths,checksByItem:{[item.id]:checks}});
 assert.equal(result.ready,true);
 assert.equal(preflightReadyBatch(queue,[item,item],{publishedSourceSha:B,candidateSha:S,changedPaths:item.scope_paths,checksByItem:{[item.id]:checks}}).ready,false);
 assert.equal(preflightReadyBatch(queue,[item],{publishedSourceSha:B,candidateSha:S,changedPaths:[...item.scope_paths,'site/admin/main.js'],checksByItem:{[item.id]:checks}}).ready,false);
});

test('#2169 accept tested-head source only when selected code and test blobs equal merged Git objects',()=>{
 const head=B,merged=S,path='tests/issue1938-test.test.mjs';
 const ready={...item,tests:[path+': PASS on PR head']};
 const object=(sha,p)=>'100644:'+(p===path?'e':'f').repeat(40);
 const req={mergedSha:merged,ciSourceSha:head,changedPaths:item.scope_paths,
  checks:names.map(name=>({name,sha:head,conclusion:'success',status:'completed'})),
  sourceObjectAt:object};
 assert.equal(assessReadyEvidence(ready,req).ready,true);
 assert.equal(assessReadyEvidence(ready,{...req,sourceObjectAt:(s,p)=>
  s===head&&p===path?'100644:'+'0'.repeat(40):object(s,p)}).ready,false);
 assert.equal(assessReadyEvidence(ready,{...req,sourceObjectAt:undefined}).ready,false);
 assert.equal(assessReadyEvidence({...ready,tests:['description only']},req).ready,false);
});
test('#2169 release event readback distinguishes true failure, running and claimed from deploy',()=>{
 const run={id:43147831127,head_sha:S,name:'DIC chat-approved single-use production request',
  path:'.github/workflows/dic-chat-approved-release.yml',event:'push',status:'completed',conclusion:'failure'};
 const args={requestCommitSha:S,mainHeadSha:S,workflowRuns:[run],elapsedSeconds:120};
 assert.equal(validateReleaseTriggerReceipt(args).status,'BLOCKED');
 assert.equal(validateReleaseTriggerReceipt({...args,workflowRuns:[{...run,status:'in_progress'}]}).status,'RUNNING');
 assert.equal(validateReleaseTriggerReceipt({...args,consumed:true}).status,'CLAIMED_NETLIFY_UNVERIFIED');
 assert.equal(validateReleaseTriggerReceipt({...args,workflowRuns:[{...run,event:'pull_request'}]}).status,'BLOCKED');
});
