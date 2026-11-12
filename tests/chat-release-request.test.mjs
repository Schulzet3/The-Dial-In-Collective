import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateChatReleaseRequest as validate,validateManualReleaseRequest as validateManual,
 CHAT_REQUEST_PATH,OPS_JOURNAL_PATH,CHAT_REQUEST_SCHEMA,assertChatPushEnvelope,formatChatReleaseJournalAppendix,fetchChatControllerRuns,inspectChatControllerRuns}
 from '../scripts/release/chat-release-request.mjs';
import {planSingleUseClaim} from '../scripts/release/one-use-claim.mjs';
const S='1'.repeat(40),D='2'.repeat(40),R='3'.repeat(40),M='4'.repeat(40),E='5'.repeat(40);
const NOW='2026-10-21T18:00:00Z';
const APPROVAL="Owner's exact release grant in GitHub source-of-truth";
const request={
 schema_version:CHAT_REQUEST_SCHEMA,mode:'validate_only',database_change_risk:'potentially_destructive',expected_main_parent_sha:M,
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
  latest_observed_data_write_at_utc:'2026-10-21T17:00:00Z'}
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
test('owner-managed Netlify credits are never required by chat release request',()=>{
 assert.equal(validate(base).releaseId,request.release_id);
 // Old schema-3 balance attestations are rejected as obsolete extra fields:
 // requiring a screenshot is NOT restored by copying a legacy request.
 assert.throws(()=>validate({...base,request:{...request,credit_evidence:{
  observed_remaining_credits:0,observed_at_utc:'1970-01-01T00:00:00Z',source:'obsolete screenshot'
 }}}),/schema/);
 assert.throws(()=>validate({...base,request:{...request,schema_version:3}}),/schema/);
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

test('manual missing, stale or uncovered recovery evidence fails closed',()=>{
 for(const request of [undefined,{...manualRequest,backup_evidence:undefined},
  {...manualRequest,created_at_utc:'2026-10-21T12:00:00Z'},
  {...manualRequest,backup_evidence:{...manualRequest.backup_evidence,
   verified_at_utc:'2026-10-21T12:00:00Z'}},
  {...manualRequest,backup_evidence:{...manualRequest.backup_evidence,
   latest_observed_data_write_at_utc:'2026-10-21T17:37:00Z'}}])
  assert.throws(()=>validateManual({...manual,request}),/schema|evidence|stale|snapshot start/);
});

test('fresh manual proof cannot replay a consumed grant or a previously published source',()=>{
 const evidence=validateManual(manual);
 const grant={id:evidence.releaseId,tested_source_sha:evidence.testedSourceSha,
  owner_approved:true,status:'APPROVED',production_branch:'release/production',
  max_publications:1,approval_source:APPROVAL,
  approved_at_utc:'2026-10-21T17:00:00Z',expires_at_utc:'2026-10-21T19:00:00Z'};
 const input={grant,releaseId:evidence.releaseId,sourceSha:evidence.testedSourceSha,
  nowIso:NOW,currentPublishedSourceSha:R,ledger:{schema_version:1,consumed:[]}};
 const consumed=planSingleUseClaim(input);
 assert.throws(()=>planSingleUseClaim({...input,ledger:consumed}),/already consumed/);
 const otherGrant={...grant,id:'DIC-20261021-OTHER123'};
 assert.throws(()=>planSingleUseClaim({...input,grant:otherGrant,releaseId:otherGrant.id,
  ledger:consumed}),/already published under another grant/);
});

test('normal releases reuse scheduled encrypted backup despite newer logged shots',()=>{
 const backup={...request.backup_evidence,verified_at_utc:'2026-10-20T17:57:00Z',archive_completed_at_utc:'2026-10-20T17:40:00Z',snapshot_started_at_utc:'2026-10-20T17:35:00Z',latest_observed_data_write_at_utc:'2026-10-21T17:50:00Z'};
 for(const database_change_risk of ['none','non_destructive'])
  assert.equal(validate({...base,request:{...request,database_change_risk,backup_evidence:backup}}).releaseId,request.release_id);
 assert.throws(()=>validate({...base,request:{...request,database_change_risk:'potentially_destructive',backup_evidence:backup}}),/stale|snapshot start/);
});

test('release controller reads historical journal bytes exactly, including trailing whitespace',()=>{
 const prior='Existing durable approvals with a trailing space. \n';
 const appendix=request.release_id+' '+S+' validate_only\n';
 const envelope={eventForced:'false',eventAfterSha:E,eventHeadSha:E,remoteMainSha:E,
  request,previousJournal:prior,currentJournal:prior+appendix};
 assert.equal(assertChatPushEnvelope(envelope),true);
 assert.throws(()=>assertChatPushEnvelope({...envelope,currentJournal:
  prior.trimEnd()+'\n'+appendix}),/history/);
 // Git's normalized metadata reads must NEVER be used for the append-only journal.
 const source=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
 assert.match(source,/previousJournal:git\(\['show',parents\[1\]\+':'\+OPS_JOURNAL_PATH\],\{trim:false\}\)/);
 assert.match(source,/currentJournal:git\(\['show','HEAD:'\+OPS_JOURNAL_PATH\],\{trim:false\}\)/);
});

test('#2169 journal helper binds mode; missing mode fails closed',()=>{
 const req={...request,mode:'publish'};
 const suffix=formatChatReleaseJournalAppendix(req);
 assert.ok(suffix.includes(request.release_id)&&suffix.includes(S));
 assert.match(suffix,/- Mode: publish/);
 const env={eventForced:'false',eventAfterSha:E,eventHeadSha:E,remoteMainSha:E,
  request:req,previousJournal:'prior\n',currentJournal:'prior\n'+suffix};
 assert.equal(assertChatPushEnvelope(env),true);
 assert.throws(()=>assertChatPushEnvelope({...env,currentJournal:'prior\n'+request.release_id+' '+S+'\n'}),/must bind request/);
 for(const x of [{...req,mode:undefined},{...req,mode:'auto'},
  {...req,release_id:'invalid'},{...req,tested_source_sha:'x'}])
  assert.throws(()=>formatChatReleaseJournalAppendix(x),/cannot prepare journal/);
});

test('#2169 release trigger receipt uses actual main PUSH runs, never PR-only lookup',async()=>{
 const sha='1'.repeat(40);
 const run={id:43147831127,head_sha:sha,name:'DIC chat-approved single-use production request',
  path:'.github/workflows/dic-chat-approved-release.yml',event:'push',status:'completed',conclusion:'failure'};
 let url='';
 const runs=await fetchChatControllerRuns({requestSha:sha,fetcher:async(u,opt)=>{
  url=u;assert.equal(opt.method,'GET');
  return {ok:true,json:async()=>({total_count:2,workflow_runs:[run,{...run,id:99,name:'DIC main release-controller acceptance'}]})};
 }});
 assert.match(url,/actions\/runs\?head_sha=1111111111111111111111111111111111111111&per_page=100/);
 const args={requestSha:sha,mainHeadSha:sha,workflowRuns:runs,elapsedSeconds:150};
 assert.deepEqual(inspectChatControllerRuns(args),{state:'BLOCKED',runId:43147831127,
  reason:'controller finished failure; inspect failed job'});
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[]}).state,'BLOCKED');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[],elapsedSeconds:5}).state,'WAIT');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:null}).state,'UNKNOWN');
 assert.equal(inspectChatControllerRuns({...args,mainHeadSha:'2'.repeat(40)}).state,'BLOCKED');
 assert.equal(inspectChatControllerRuns({...args,grantConsumed:true}).state,'CLAIMED_NETLIFY_UNVERIFIED');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[{...run,status:'in_progress'}]}).state,'CONTROLLER_RUNNING');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[{...run,conclusion:'success'}]}).state,'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[run,run]}).state,'BLOCKED');
 assert.equal(inspectChatControllerRuns({...args,workflowRuns:[{...run,event:'pull_request'}]}).state,'BLOCKED');
 await assert.rejects(fetchChatControllerRuns({requestSha:sha,fetcher:async()=>({ok:false,status:403})}),/unavailable/);
 await assert.rejects(fetchChatControllerRuns({requestSha:sha,fetcher:async()=>({ok:true,json:async()=>({total_count:101,workflow_runs:[]})})}),/Incomplete/);
});
