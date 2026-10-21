import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatReleaseRequest as validate,CHAT_REQUEST_PATH,OPS_JOURNAL_PATH}
 from '../scripts/release/chat-release-request.mjs';
const S='1'.repeat(40),D='2'.repeat(40),R='3'.repeat(40);
const NOW='2026-10-21T18:00:00Z';
const APPROVAL="Owner's exact release grant in GitHub source-of-truth";
const request={
 schema_version:1,release_id:'DIC-20261021-EXAMPLE1',
 tested_source_sha:S,expected_release_head_sha:R,
 expected_development_head_sha:D,owner_approval_source:APPROVAL,
 created_at_utc:'2026-10-21T17:58:00Z',
 backup_evidence:{
  artifact_id:12345,encrypted_sha256:'a'.repeat(64),
  owner_private_offsite_file_id:'private-drive-file-123',
  archive_completed_at_utc:'2026-10-21T17:40:00Z',
  verified_at_utc:'2026-10-21T17:57:00Z',
  latest_observed_data_write_at_utc:'2026-10-21T17:00:00Z'},
 credit_evidence:{observed_remaining_credits:100,
  observed_at_utc:'2026-10-21T17:57:00Z',source:'Private Netlify billing dashboard'}
};
const base={request,changedPaths:[CHAT_REQUEST_PATH,OPS_JOURNAL_PATH],
 commitSubject:'ops: one approved chat release request [skip netlify]',
 nowIso:NOW,expectedReleaseHead:R,expectedDevelopmentHead:D,
 ownerApprovalSource:APPROVAL};
test('one precisely scoped, recently checked approved request passes inert validation',()=>{
 const result=validate(base);
 assert.equal(result.releaseId,request.release_id);
 assert.equal(result.testedSourceSha,S);
 assert.equal(result.expectedReleaseHeadSha,R);
});
test('missing request, unknown fields and additional/absent commit paths fail closed',()=>{
 for(const req of [null,{...request,inject:true},{...request,schema_version:2}])
  assert.throws(()=>validate({...base,request:req}),/schema/);
 for(const paths of [[CHAT_REQUEST_PATH], [CHAT_REQUEST_PATH,'package.json'],
   [CHAT_REQUEST_PATH,OPS_JOURNAL_PATH,'netlify.toml'],
   [CHAT_REQUEST_PATH,CHAT_REQUEST_PATH]])
  assert.throws(()=>validate({...base,changedPaths:paths}),/only the request/);
});
test('never permit an unmarked or publishing request commit',()=>{
 for(const commitSubject of ['ops request','Release DIC: DIC-20261021-EXAMPLE1 [dic-publish]'])
  assert.throws(()=>validate({...base,commitSubject}),/skip marker|must not publish/);
});
test('stale branch heads, changed grant and malformed SHA/ID fail closed',()=>{
 assert.throws(()=>validate({...base,expectedReleaseHead:'4'.repeat(40)}),/release HEAD moved/);
 assert.throws(()=>validate({...base,expectedDevelopmentHead:'4'.repeat(40)}),/development HEAD moved/);
 assert.throws(()=>validate({...base,ownerApprovalSource:'other verified owner grant source'}),/differs/);
 for(const input of [{release_id:'BAD'},{tested_source_sha:'abc'},
   {expected_release_head_sha:'no'},{expected_development_head_sha:'no'}])
  assert.throws(()=>validate({...base,request:{...request,...input}}),/format/);
});
test('old or future dated request, bad backup evidence and missing private copy fail',()=>{
 assert.throws(()=>validate({...base,request:{...request,created_at_utc:'2026-10-21T12:00:00Z'}}),/stale/);
 assert.throws(()=>validate({...base,request:{...request,created_at_utc:'2026-10-22T12:00:00Z'}}),/future-dated/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,encrypted_sha256:'bad'}}}),/backup evidence/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,
  archive_completed_at_utc:'2026-10-21T11:30:00Z',
  latest_observed_data_write_at_utc:'2026-10-21T11:00:00Z',
  verified_at_utc:'2026-10-21T12:00:00Z'}}}),/backup verification is stale/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,
  owner_private_offsite_file_id:''}}}),/backup evidence/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,
  archive_completed_at_utc:'2026-10-21T16:00:00Z'}}}),/archive does not cover/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,
  archive_completed_at_utc:'2026-10-21T18:10:00Z'}}}),/archive does not cover/);
});
test('credit evidence below ceiling, stale or forged extra fields refuses release',()=>{
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  observed_remaining_credits:14}}}),/credit budget/);
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  observed_at_utc:'2026-10-18T10:00:00Z'}}}),/credit check stale/);
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  extraneous:'yes'}}}),/credit budget/);
});
