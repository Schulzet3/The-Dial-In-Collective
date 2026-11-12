import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectControllerDelivery,inspectCompletedController,observeCompletedController,liveControllerIndex,liveMainSha} from '../scripts/release/observe-chat-controller-event.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
const run={id:123,head_sha:A,name:'DIC chat-approved single-use production request',
 path:'.github/workflows/dic-chat-approved-release.yml',event:'push',status:'in_progress'};
test('observing a push controller never establishes deployment',()=>{
 assert.equal(inspectControllerDelivery({requestSha:A,mainHeadSha:A,workflowRuns:[run],elapsedSeconds:0}).status,'RUNNING');
 const x=inspectControllerDelivery({requestSha:A,mainHeadSha:A,workflowRuns:[{...run,status:'completed',conclusion:'success'}],elapsedSeconds:150});
 assert.equal(x.status,'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');assert.equal(x.observed,true);
});
test('missing, stale, duplicate, wrong-event or failed controller blocks',()=>{
 for(const runs of [[],[run,run],[{...run,event:'pull_request'}],[{...run,status:'completed',conclusion:'failure'}]])
  assert.equal(inspectControllerDelivery({requestSha:A,mainHeadSha:A,workflowRuns:runs,elapsedSeconds:150}).observed,false);
 assert.equal(inspectControllerDelivery({requestSha:A,mainHeadSha:B,workflowRuns:[run],elapsedSeconds:150}).observed,false);
 assert.equal(inspectControllerDelivery({requestSha:A,mainHeadSha:A,workflowRuns:[],elapsedSeconds:5}).status,'WAIT');
});
test('official API fails closed on 403 and unpaginated index',async()=>{
 const ok=async()=>({ok:true,json:async()=>({workflow_runs:[run],total_count:1})});
 assert.equal((await liveControllerIndex({sha:A,token:'x',request:ok})).length,1);
 await assert.rejects(liveControllerIndex({sha:A,token:'x',request:async()=>({ok:false,status:403})}),/403/);
 await assert.rejects(liveControllerIndex({sha:A,token:'x',request:async()=>({ok:true,json:async()=>({workflow_runs:[],total_count:101})})}),/Incomplete/);
 assert.equal(await liveMainSha({token:'x',request:async()=>({ok:true,json:async()=>({commit:{sha:A}})})}),A);
});
test('actual workflow and guarded runner invoke the operational validators',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/release-controller-ci.yml',import.meta.url),'utf8');
 const runner=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
 assert.match(workflow,/run: node scripts\/release\/observe-chat-controller-event\.mjs/);
 assert.match(runner,/await liveControllerIndex/);assert.match(runner,/await verifyReadyItems/);
});

test('completed controller follow-up binds exact run ID and final outcome, never Netlify',()=>{
 const ok={...run,status:'completed',conclusion:'success'};
 const receipt=inspectCompletedController({requestSha:A,mainHeadSha:A,workflowRuns:[ok],expectedRunId:123});
 assert.equal(receipt.status,'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');
 assert.equal(receipt.observed,true);
 for(const id of [undefined,0,124]){
  const denied=inspectCompletedController({requestSha:A,mainHeadSha:A,workflowRuns:[ok],expectedRunId:id});
  assert.equal(denied.status,'BLOCKED');
 }
 assert.equal(inspectCompletedController({requestSha:A,mainHeadSha:A,workflowRuns:[run],expectedRunId:123}).observed,false);
 assert.equal(inspectCompletedController({requestSha:A,mainHeadSha:B,workflowRuns:[ok],expectedRunId:123}).observed,false);
 assert.equal(inspectCompletedController({requestSha:A,mainHeadSha:A,workflowRuns:[{...ok,conclusion:'failure'}],expectedRunId:123}).observed,false);
});
test('actual workflow_run listener is lean, separate from full acceptance suite',async()=>{
 const workflow=readFileSync(new URL('../.github/workflows/release-controller-ci.yml',import.meta.url),'utf8');
 assert.match(workflow,/workflow_run:\n\s+workflows:/);
 assert.match(workflow,/release-controller-validate:\n\s+if: github.event_name != 'workflow_run'/);
 assert.match(workflow,/controller-event-verification:\n\s+if: github.event_name == 'push' \|\| github.event_name == 'workflow_run'/);
 const ok={...run,status:'completed',conclusion:'success'};
 const env={GITHUB_EVENT_NAME:'workflow_run',DIC_COMPLETED_CONTROLLER_SHA:A,
  DIC_COMPLETED_CONTROLLER_RUN_ID:'123',GITHUB_TOKEN:'test'};
 const request=async url=>({ok:true,json:async()=>url.includes('/branches/main')?
  {commit:{sha:A}}:{total_count:1,workflow_runs:[ok]}});
 assert.equal((await observeCompletedController(env,{request})).observed,true);
 await assert.rejects(observeCompletedController({...env,DIC_COMPLETED_CONTROLLER_RUN_ID:'124'},{request}),/mismatches/);
});
