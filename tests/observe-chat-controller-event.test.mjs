import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectControllerDelivery,liveControllerIndex,liveMainSha} from '../scripts/release/observe-chat-controller-event.mjs';
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
