import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatReleaseRequest as validate,validateManualReleaseRequest as validateManual,
 CHAT_REQUEST_PATH,OPS_JOURNAL_PATH,CHAT_REQUEST_SCHEMA,assertChatPushEnvelope}
 from '../scripts/release/chat-release-request.mjs';
import {planSingleUseClaim} from '../scripts/release/one-use-claim.mjs';
const S='1'.repeat(40),D='2'.repeat(40),R='3'.repeat(40),M='4'.repeat(40),E='5'.repeat(40);
const NOW='2026-10-21T18:00:00Z';
const APPROVAL="Owner's exact release grant in GitHub source-of-truth";
const request={
 schema_version:CHAT_REQUEST_SCHEMA,mode:'validate_only',expected_main_parent_sha:M,
 release_id:'DIC-20261021-EXAMPLE1',
 tested_source_sha:S,expected_release_head_sha:R,
 expected_development_head_sha:D,owner_approval_source:APPROVAL,
 created_at_utc:'2026-10-21T17:58:00Z',
 backup_evidence:{
  artifact_id:12345,encrypted_sha256:'a'.repeat(64),
  owner_private_offsite_file_id:'private-drive-file-123',
  snapshot_started_at_utc:'2026-10-21T17:35:00Z',
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
 for(const req of [null,{...request,inject:true},{...request,schema_version:1}])
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

test('snapshot start, archive completion and verification must cover writes in chronological order',()=>{
 const withBackup=changes=>({...base,request:{...request,backup_evidence:{
  ...request.backup_evidence,...changes}}});
 // A write during pg_dump is earlier than completion but after the snapshot.
 assert.throws(()=>validate(withBackup({latest_observed_data_write_at_utc:
  '2026-10-21T17:37:00Z'})),/snapshot start/);
 assert.equal(validate(withBackup({latest_observed_data_write_at_utc:
  request.backup_evidence.snapshot_started_at_utc})).releaseId,request.release_id);
 assert.throws(()=>validate(withBackup({snapshot_started_at_utc:
  '2026-10-21T17:41:00Z'})),/snapshot start/);
 assert.throws(()=>validate(withBackup({verified_at_utc:
  '2026-10-21T17:39:00Z'})),/archive does not cover/);
 const missing=structuredClone(request);
 delete missing.backup_evidence.snapshot_started_at_utc;
 assert.throws(()=>validate({...base,request:missing}),/backup evidence/);
});

const manualRequest=(()=>{
 const proof=structuredClone(request);
 delete proof.expected_main_parent_sha;
 return {...proof,mode:'publish',expected_main_head_sha:M};
})();
const manual={request:manualRequest,inputReleaseId:request.release_id,inputTestedSourceSha:S,
 nowIso:NOW,expectedReleaseHead:R,expectedDevelopmentHead:D,expectedMainHead:M,
 checkedOutHeadSha:M,workflowHeadSha:M,ownerApprovalSource:APPROVAL};

test('manual fallback requires its own exact current-main lease and the same source/grant evidence',()=>{
 assert.equal(validateManual(manual).releaseId,request.release_id);
 for(const mutation of [{expectedMainHead:E},{checkedOutHeadSha:E},{workflowHeadSha:E},
  {expectedMainHead:undefined},{expectedDevelopmentHead:undefined},
  {expectedReleaseHead:undefined},{ownerApprovalSource:undefined},
  {inputReleaseId:'DIC-20261021-OTHER123'},{inputTestedSourceSha:R}])
  assert.throws(()=>validateManual({...manual,...mutation}),/lease|context|bind/);
 assert.throws(()=>validateManual({...manual,request}),/schema/);
 assert.throws(()=>validateManual({...manual,request:{...manualRequest,mode:'validate_only'}}),/publish mode/);
});

test('manual missing, stale or uncovered recovery/credit proof fails closed',()=>{
 for(const request of [undefined,{...manualRequest,backup_evidence:undefined},
  {...manualRequest,credit_evidence:undefined},
  {...manualRequest,created_at_utc:'2026-10-21T12:00:00Z'},
  {...manualRequest,backup_evidence:{...manualRequest.backup_evidence,
   verified_at_utc:'2026-10-21T12:00:00Z'}},
  {...manualRequest,backup_evidence:{...manualRequest.backup_evidence,
   latest_observed_data_write_at_utc:'2026-10-21T17:37:00Z'}},
  {...manualRequest,credit_evidence:{...manualRequest.credit_evidence,
   observed_at_utc:'2026-10-18T12:00:00Z'}}])
  assert.throws(()=>validateManual({...manual,request}),/schema|evidence|stale|snapshot start|credit budget/);
});

test('fresh manual proof cannot replay a consumed grant or a previously published source',()=>{
 const evidence=validateManual(manual);
 const grant={id:evidence.releaseId,tested_source_sha:evidence.testedSourceSha,
  owner_approved:true,status:'APPROVED',production_branch:'release/production',
  max_publications:1,estimated_credits_limit:15,approval_source:APPROVAL,
  approved_at_utc:'2026-10-21T17:00:00Z',expires_at_utc:'2026-10-21T19:00:00Z'};
 const input={grant,releaseId:evidence.releaseId,sourceSha:evidence.testedSourceSha,
  nowIso:NOW,currentPublishedSourceSha:R,ledger:{schema_version:1,consumed:[]}};
 const consumed=planSingleUseClaim(input);
 assert.throws(()=>planSingleUseClaim({...input,ledger:consumed}),/already consumed/);
 const otherGrant={...grant,id:'DIC-20261021-OTHER123'};
 assert.throws(()=>planSingleUseClaim({...input,grant:otherGrant,releaseId:otherGrant.id,
  ledger:consumed}),/already published under another grant/);
});
