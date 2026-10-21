import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRequestShape,assertPushReleaseEnvelope,assertChatReleaseAuthorized,
 RELEASE_REQUEST_PATH,RELEASE_OPS_JOURNAL} from '../scripts/release/verified-chat-release-request.mjs';
const DEV='a'.repeat(40),PUB='b'.repeat(40),SHA='c'.repeat(40),COMMIT='d'.repeat(40),PARENT='e'.repeat(40);
const NOW='2026-10-21T18:45:00Z',REL='DIC-20261021-BETA123',REQ='DIC-REQ-20261021-UNIQUE12345678';
const approval='Explicit owner production approval in canonical GitHub Decision Ledger';
const request={schema_version:1,request_id:REQ,release_id:REL,
 tested_source_sha:SHA,expected_development_head_sha:DEV,
 expected_release_head_sha:PUB,approval_decision_key:'current_owner_release_20261021',
 approval_source:approval,requested_at_utc:'2026-10-21T18:44:00Z'};
const grant={id:REL,tested_source_sha:SHA,owner_approved:true,status:'APPROVED',
 production_branch:'release/production',max_publications:1,estimated_credits_limit:15,
 approved_at_utc:'2026-10-21T18:00:00Z',expires_at_utc:'2026-10-22T19:00:00Z',
 owner_private_free_compensating_controls:true,approval_source:approval};
const envelope={request,event:{ref:'refs/heads/main',before:PARENT,after:COMMIT,
 forced:false,created:false,deleted:false},commitSha:COMMIT,parentSha:PARENT,
 remoteMainSha:COMMIT,changedPaths:[RELEASE_OPS_JOURNAL,RELEASE_REQUEST_PATH],
 commitSubject:'ops(release-request): '+REL+' [skip netlify]',
 journalAdded:'+ release request '+REQ+' approved release '+REL};
const auth={request,grant,decision:{status:'OWNER APPROVED'},nowIso:NOW,
 developmentHead:DEV,releaseHead:PUB};
const fails=(fn,part)=>assert.throws(fn,new RegExp(part));
test('valid authorized request and non-force, same-commit main envelope pass without releasing',()=>{
 assert.equal(assertRequestShape(request),true);
 assert.equal(assertPushReleaseEnvelope(envelope),true);
 assert.equal(assertChatReleaseAuthorized(auth),true);
});
test('reject missing, extra, malformed fields, invalid IDs and timestamps',()=>{
 for(const bad of [{...request,extra:'x'}, {...request,release_id:'bad'},
  {...request,request_id:'bad'}, {...request,expected_release_head_sha:'oops'},
  {...request,approval_decision_key:'not-an-owner'},
  {...request,requested_at_utc:'2026-10-21'}])
  fails(()=>assertRequestShape(bad),'request');
});
test('reject non-main, changed, forced and multi-path pushes before any release',()=>{
 fails(()=>assertPushReleaseEnvelope({...envelope,remoteMainSha:PARENT}),'current main');
 fails(()=>assertPushReleaseEnvelope({...envelope,event:{...envelope.event,forced:true}}),'non-force');
 fails(()=>assertPushReleaseEnvelope({...envelope,event:{...envelope.event,ref:'refs/heads/development/backend-foundation'}}),'non-force');
 fails(()=>assertPushReleaseEnvelope({...envelope,event:{...envelope.event,before:SHA}}),'non-force');
 fails(()=>assertPushReleaseEnvelope({...envelope,changedPaths:[...envelope.changedPaths,'src/app.jsx']}),'changed files');
 fails(()=>assertPushReleaseEnvelope({...envelope,changedPaths:[RELEASE_REQUEST_PATH]}),'changed files');
 fails(()=>assertPushReleaseEnvelope({...envelope,commitSubject:'Release DIC: '+REL+' [dic-publish]'}),'bounded');
 fails(()=>assertPushReleaseEnvelope({...envelope,journalAdded:'no request marker'}),'journal');
});
test('reject expired grant, mismatched decision, stale request and moved refs',()=>{
 fails(()=>assertChatReleaseAuthorized({...auth,developmentHead:PARENT}),'development branch moved');
 fails(()=>assertChatReleaseAuthorized({...auth,releaseHead:PARENT}),'production ref moved');
 fails(()=>assertChatReleaseAuthorized({...auth,decision:{status:'PROPOSED'}}),'owner approval');
 fails(()=>assertChatReleaseAuthorized({...auth,decision:null}),'owner approval');
 fails(()=>assertChatReleaseAuthorized({...auth,grant:{...grant,owner_approved:false}}),'explicit owner');
 fails(()=>assertChatReleaseAuthorized({...auth,grant:{...grant,approval_source:'different owner evidence'}}),'provenance');
 fails(()=>assertChatReleaseAuthorized({...auth,grant:{...grant,estimated_credits_limit:30}}),'cost ceiling');
 fails(()=>assertChatReleaseAuthorized({...auth,grant:{...grant,expires_at_utc:'2026-10-21T18:10:00Z'}}),'expired');
 fails(()=>assertChatReleaseAuthorized({...auth,nowIso:'2026-10-23T20:00:00Z'}),'expired');
 fails(()=>assertChatReleaseAuthorized({...auth,request:{...request,requested_at_utc:'2026-10-19T18:00:00Z'}}),'stale');
});
test('one request cannot authorize previously published SHA',()=>{
 fails(()=>assertChatReleaseAuthorized({...auth,releaseHead:SHA,
  request:{...request,expected_release_head_sha:SHA}}),'already-published');
});
