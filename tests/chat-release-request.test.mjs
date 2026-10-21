import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatReleaseRequest as validate,CHAT_REQUEST_PATH,OPS_JOURNAL_PATH,assertChatPushEnvelope}
 from '../scripts/release/chat-release-request.mjs';
const S='1'.repeat(40),D='2'.repeat(40),R='3'.repeat(40),M='4'.repeat(40),E='5'.repeat(40);
const NOW='2026-10-21T18:00:00Z';
const APPROVAL="Owner's exact release grant in GitHub source-of-truth";
const request={
 schema_version:1,mode:'validate_only',expected_main_parent_sha:M,
 release_id:'DIC-20261021-EXAMPLE1',
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
 commitSubject:'ops(release-request): DIC-20261021-EXAMPLE1 [skip netlify]',
 eventBeforeSha:M,commitParentSha:M,eventHeadSha:E,checkedOutHeadSha:E,
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
 for(const commitSubject of ['ops request','Release DIC: DIC-20261021-EXAMPLE1 [dic-publish]',
  'ops(release-request): DIC-20261021-WRONG1 [skip netlify]'])
  assert.throws(()=>validate({...base,commitSubject}),/exact nonpublishing/);
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
  verified_at_utc:'2026-10-21T12:00:00Z'}}}),/backup verification is stale/);
 assert.throws(()=>validate({...base,request:{...request,backup_evidence:{...request.backup_evidence,
  owner_private_offsite_file_id:''}}}),/backup evidence/);
});
test('credit evidence below ceiling, stale or forged extra fields refuses release',()=>{
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  observed_remaining_credits:14}}}),/credit budget/);
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  observed_at_utc:'2026-10-18T10:00:00Z'}}}),/credit check stale/);
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{...request.credit_evidence,
  extraneous:'yes'}}}),/credit budget/);
});

test('single commit lease, dry-run or publish modes and replay/stale event cannot be forged',()=>{
 assert.equal(validate(base).releaseId,request.release_id);
 assert.equal(validate({...base,request:{...request,mode:'publish'}}).releaseId,request.release_id);
 for(const req of [{mode:'auto'},{expected_main_parent_sha:S}]){
  assert.throws(()=>validate({...base,request:{...request,...req}}),/mode|mismatch/);
 }
 for(const mutation of [{eventBeforeSha:S},{commitParentSha:S},
  {eventHeadSha:S},{checkedOutHeadSha:S}]){
  assert.throws(()=>validate({...base,...mutation}),/pushed event/);
 }
 assert.throws(()=>validate({...base,eventBeforeSha:'0'.repeat(40)}),/pushed event/);
});

test('actual push envelope refuses force, stale remote main and unbound journal',()=>{
 const envelope={eventForced:'false',eventAfterSha:E,eventHeadSha:E,remoteMainSha:E,
  request,previousJournal:'Prior history\n',
  currentJournal:'Prior history\n'+request.release_id+' '+S+' validate_only\n'};
 assert.equal(assertChatPushEnvelope(envelope),true);
 for(const mutation of [{eventForced:'true'},{eventForced:undefined},
  {eventAfterSha:M},{remoteMainSha:M},{currentJournal:'Replaced history'},
  {currentJournal:'Prior history\nUnrelated appendix\n'}])
  assert.throws(()=>assertChatPushEnvelope({...envelope,...mutation}),/refused|differs|history|bind/);
});

test('archive itself must cover writes, independent of a fresh verification timestamp',()=>{
 for(const archive_completed_at_utc of ['2026-10-21T16:00:00Z','2026-10-21T18:10:00Z'])
  assert.throws(()=>validate({...base,request:{...request,backup_evidence:{
   ...request.backup_evidence,archive_completed_at_utc}}}),/archive does not cover/);
});
