import test from 'node:test';
import assert from 'node:assert/strict';
import {observeChatReleaseEvent,observeMainChatReleaseEvent,githubActionReceiptReaders} from '../scripts/release/verify-chat-release-event.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
const run={id:101,head_sha:A,name:'DIC chat-approved single-use production request',
 path:'.github/workflows/dic-chat-approved-release.yml',event:'push',status:'in_progress'};
const base={eventName:'push',changedPaths:['docs/RELEASE_REQUEST.json'],
 requestCommitSha:A,mainHeadSha:A,workflowRuns:[run]};
test('non-request main push is NOT_APPLICABLE',()=>{
 assert.equal(observeChatReleaseEvent({...base,changedPaths:['scripts/audit/change.mjs']}).status,'NOT_APPLICABLE');
});
test('real request event receipt is not Netlify deployment',()=>{
 assert.equal(observeChatReleaseEvent(base).status,'RUNNING');
 assert.equal(observeChatReleaseEvent({...base,workflowRuns:[{...run,status:'completed',conclusion:'success'}]}).status,'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');
});
test('missing, duplicate, failed, stale, PR-only events are denied',()=>{
 for(const input of [{...base,workflowRuns:[],elapsedSeconds:150},
  {...base,mainHeadSha:B},{...base,workflowRuns:[run,{...run,id:102}]},
  {...base,workflowRuns:[{...run,status:'completed',conclusion:'failure'}]},
  {...base,workflowRuns:[{...run,event:'pull_request'}],elapsedSeconds:150}])
  assert.equal(observeChatReleaseEvent(input).status,'BLOCKED');
});
test('completed follow-up binds exact finished controller ID',()=>{
 const good={...run,status:'completed',conclusion:'success'};
 assert.equal(observeChatReleaseEvent({...base,eventName:'workflow_run',expectedRunId:101,workflowRuns:[good]}).status,
  'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');
 for(const id of [undefined,0,999])
  assert.equal(observeChatReleaseEvent({...base,eventName:'workflow_run',expectedRunId:id,workflowRuns:[good]}).status,'BLOCKED');
 assert.equal(observeChatReleaseEvent({...base,eventName:'workflow_run',expectedRunId:101}).status,'BLOCKED');
});
test('the real GitHub observation reads repository Actions by request SHA',async()=>{
 const urls=[];
 const reader=githubActionReceiptReaders('token',{request:async u=>{
  urls.push(u);return{ok:true,json:async()=>u.includes('/branches/main')?
   {commit:{sha:A}}:{total_count:1,workflow_runs:[run]}};}});
 const result=await observeMainChatReleaseEvent({...base,...reader,attempts:1});
 assert.equal(result.status,'RUNNING');
 assert(urls.some(u=>u.endsWith('/actions/runs?head_sha='+A+'&per_page=100')));
});
test('bounded missing event always blocks and never creates a grant',async()=>{
 const x=await observeMainChatReleaseEvent({...base,loadMainHead:async()=>A,
  loadRuns:async()=>[],attempts:2,pollMs:1,sleep:async()=>{}});
 assert.equal(x.status,'BLOCKED');
 assert.match(x.reason,/never blindly replay/);
});
