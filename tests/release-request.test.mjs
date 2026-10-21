import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatReleaseRequest,validateChatReleaseCommit,REQUEST_PATH,JOURNAL_PATH}
 from '../scripts/release/release-request.mjs';
const SOURCE='1'.repeat(40),DEV='2'.repeat(40),REL='3'.repeat(40),MAIN='4'.repeat(40),
 COMMIT='5'.repeat(40),ID='DIC-20261021-BETA-COFFEE-01',NOW='2026-10-21T18:00:00Z';
const grant={id:ID,tested_source_sha:SOURCE,owner_approved:true,status:'APPROVED',
 production_branch:'release/production',max_publications:1,estimated_credits_limit:15,
 approved_at_utc:'2026-10-21T16:00:00Z',expires_at_utc:'2026-10-22T18:00:00Z',
 approval_source:'Explicit owner approved one tested production publication'};
const request={schema_version:1,release_id:ID,tested_source_sha:SOURCE,
 expected_development_head_sha:DEV,expected_release_head_sha:REL,
 expected_main_parent_sha:MAIN,owner_approval_reference:grant.approval_source,
 requested_at_utc:'2026-10-21T17:45:00Z'};
const envelope={request,grant,developmentHead:DEV,releaseHead:REL,
 mainParentSha:MAIN,nowIso:NOW};
const commit={request,commitSha:COMMIT,eventBeforeSha:MAIN,remoteMainHeadSha:COMMIT,
 actualParentSha:MAIN,changedFiles:[REQUEST_PATH,JOURNAL_PATH],
 subject:'ops(release-request): '+ID+' [skip netlify]',
 journalText:'Chat-trigger release request release_id='+ID+' source_sha='+SOURCE};
test('exact owner-approved unexpired chat request and same-commit journal pass inert checks',()=>{
 assert.equal(validateChatReleaseRequest(envelope),true);
 assert.equal(validateChatReleaseCommit(commit),true);
});
test('malformed and unexpectedly expanded request fail closed',()=>{
 assert.throws(()=>validateChatReleaseRequest({...envelope,request:{...request,debug:true}}),/exact supported fields/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,request:{...request,schema_version:2}}),/schema/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,request:{...request,tested_source_sha:REL}}),/exact tested source/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,request:{...request,owner_approval_reference:'invented'}}),/provenance mismatch/);
});
test('stale and moved branch request cannot initiate a release',()=>{
 assert.throws(()=>validateChatReleaseRequest({...envelope,developmentHead:REL}),/development branch moved/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,releaseHead:DEV}),/release branch moved/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,mainParentSha:REL}),/main parent changed/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,nowIso:'2026-10-22T05:00:00Z'}),/older than two hours/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,request:{...request,requested_at_utc:'2026-10-22T05:00:00Z'}}),/future/);
});
test('no forged, expired, repeat-authorized, or expanded credit grant',()=>{
 assert.throws(()=>validateChatReleaseRequest({...envelope,grant:{...grant,owner_approved:false}}),/explicit owner/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,grant:{...grant,expires_at_utc:'2026-10-21T17:00:00Z'}}),/expired/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,grant:{...grant,estimated_credits_limit:30}}),/cost ceiling/);
 assert.throws(()=>validateChatReleaseRequest({...envelope,grant:{...grant,approval_source:'other approval'}}),/provenance mismatch/);
});
test('request commit rejects unrelated changes, replay and absent journal',()=>{
 assert.throws(()=>validateChatReleaseCommit({...commit,changedFiles:[REQUEST_PATH,JOURNAL_PATH,'src/server/api.js']}),/other than request/);
 assert.throws(()=>validateChatReleaseCommit({...commit,remoteMainHeadSha:REL}),/not latest main/);
 assert.throws(()=>validateChatReleaseCommit({...commit,eventBeforeSha:REL}),/parent does not match/);
 assert.throws(()=>validateChatReleaseCommit({...commit,subject:'Release DIC: '+ID+' [dic-publish]'}),/subject/);
 assert.throws(()=>validateChatReleaseCommit({...commit,journalText:'Chat-trigger release request'}),/journal identity/);
});
