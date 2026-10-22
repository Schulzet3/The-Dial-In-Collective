// Inert validation for a chat-originated, owner-approved release request.
// No deploy or Git mutation. Hosted controller must also check real refs,
// source CI, unique grant, data recovery and credit state before any push.
export const CHAT_REQUEST_PATH='docs/RELEASE_REQUEST.json';
export const OPS_JOURNAL_PATH='docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md';
// Schema 3 supports risk-specific backup freshness; historical v1/v2
// publication requests are immutable receipts, never silently replayed.
export const CHAT_REQUEST_SCHEMA=3;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/;
const ALLOWED_PATHS=[CHAT_REQUEST_PATH,OPS_JOURNAL_PATH].sort();
const REQUIRED=['schema_version','release_id','tested_source_sha',
 'expected_release_head_sha','expected_development_head_sha',
 'owner_approval_source','created_at_utc','backup_evidence','credit_evidence',
 'database_change_risk','mode'];
const REQ_BACKUP=['artifact_id','encrypted_sha256','owner_private_offsite_file_id',
 'snapshot_started_at_utc','archive_completed_at_utc','verified_at_utc',
 'latest_observed_data_write_at_utc'];
const REQ_CREDIT=['observed_remaining_credits','observed_at_utc','source'];
const deny=reason=>{throw new Error('Release request denied: '+reason);};
const exactly=(obj,keys)=>!!obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===keys.slice().sort().join('|');
const validDate=(v)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
function validateRequestEvidence({
 request,nowIso,expectedDevelopmentHead,expectedReleaseHead,ownerApprovalSource,
 mainShaField
}={}){
 if(!exactly(request,[...REQUIRED,mainShaField])||request.schema_version!==CHAT_REQUEST_SCHEMA)
  deny('unknown fields or malformed request schema');
 if(!ID.test(request.release_id))deny('release ID format');
 if(!['validate_only','publish'].includes(request.mode))
  deny('release mode must be validate_only or publish');
 if(!['none','non_destructive','potentially_destructive'].includes(request.database_change_risk))
  deny('unknown database change risk; require server-side migration diff classification');
 if(!SHA.test(request.tested_source_sha)||!SHA.test(request.expected_release_head_sha)||
    !SHA.test(request.expected_development_head_sha)||
    !SHA.test(request[mainShaField]))
  deny('source or expected Git ref SHA format');
 if(typeof request.owner_approval_source!=='string'||
    request.owner_approval_source.length<12)deny('owner approval provenance absent');
 if(ownerApprovalSource!==undefined&&request.owner_approval_source!==ownerApprovalSource)
  deny('request approval provenance differs from stored owner grant');
 if(expectedDevelopmentHead!==undefined&&
   request.expected_development_head_sha!==expectedDevelopmentHead)
  deny('development HEAD moved since request');
 if(expectedReleaseHead!==undefined&&
   request.expected_release_head_sha!==expectedReleaseHead)
  deny('release HEAD moved since request');
 const now=Date.parse(nowIso||'');
 if(!Number.isFinite(now)||!validDate(request.created_at_utc))
  deny('request timestamp unavailable');
 const created=Date.parse(request.created_at_utc);
 if(created>now+60_000||now-created>2*60*60*1000)
  deny('request is future-dated or stale (two-hour maximum)');
 const backup=request.backup_evidence;
 if(!exactly(backup,REQ_BACKUP)||!Number.isSafeInteger(backup.artifact_id)||
    backup.artifact_id<=0||!HASH.test(backup.encrypted_sha256)||
    typeof backup.owner_private_offsite_file_id!=='string'||
    backup.owner_private_offsite_file_id.length<10||
    !validDate(backup.snapshot_started_at_utc)||
    !validDate(backup.archive_completed_at_utc)||
    !validDate(backup.verified_at_utc)||
    !validDate(backup.latest_observed_data_write_at_utc))
  deny('encrypted/offsite backup evidence missing or malformed');
 const started=Date.parse(backup.snapshot_started_at_utc);
 const archived=Date.parse(backup.archive_completed_at_utc);
 const verified=Date.parse(backup.verified_at_utc);
 const latestWrite=Date.parse(backup.latest_observed_data_write_at_utc);
 const maxEvidenceAge=request.database_change_risk==='potentially_destructive'?2*60*60*1000:48*60*60*1000;
 if(verified>now+60_000||now-verified>maxEvidenceAge)
  deny('backup verification is stale or future-dated');
 // An export can finish after a write while its earlier database snapshot
 // excludes that write. Its completion timestamp alone cannot prove coverage.
 if(started>archived||archived>verified||archived>now+60_000||latestWrite>now+60_000||
    (request.database_change_risk==='potentially_destructive'&&latestWrite>started))
  deny('encrypted archive does not cover latest observed user data write at snapshot start');
 const credit=request.credit_evidence;
 if(!exactly(credit,REQ_CREDIT)||!Number.isSafeInteger(credit.observed_remaining_credits)||
    credit.observed_remaining_credits<15||!validDate(credit.observed_at_utc)||
    typeof credit.source!=='string'||credit.source.length<12)
  deny('credit budget evidence absent or below single-build ceiling');
 const credTime=Date.parse(credit.observed_at_utc);
 if(credTime>now+60_000||now-credTime>24*60*60*1000)
  deny('credit check stale or future-dated');
 // These evidence fields are receipts from independently observed providers,
 // NOT substitutes for actually checking the remote backup/credit sources.
 return {releaseId:request.release_id,testedSourceSha:request.tested_source_sha,
  expectedReleaseHeadSha:request.expected_release_head_sha,
  expectedDevelopmentHeadSha:request.expected_development_head_sha};
}

export function validateChatReleaseRequest(args={}){
 const {request,changedPaths,commitSubject,eventBeforeSha,commitParentSha,
  eventHeadSha,checkedOutHeadSha}=args;
 const result=validateRequestEvidence({...args,mainShaField:'expected_main_parent_sha'});
 if(!Array.isArray(changedPaths)||
  [...new Set(changedPaths)].sort().join('|')!==ALLOWED_PATHS.join('|')||
  changedPaths.length!==ALLOWED_PATHS.length)
  deny('request commit must change only the request and contemporaneous ops journal');
 if(commitSubject!=='ops(release-request): '+request.release_id+' [skip netlify]')
  deny('chat request requires exact nonpublishing ID-bound commit subject');
 if(!SHA.test(eventBeforeSha||'')||eventBeforeSha==='0'.repeat(40)||
    !SHA.test(commitParentSha||'')||!SHA.test(eventHeadSha||'')||
    !SHA.test(checkedOutHeadSha||'')||
    request.expected_main_parent_sha!==eventBeforeSha||
    commitParentSha!==eventBeforeSha||eventHeadSha!==checkedOutHeadSha)
  deny('pushed event, single parent, request main lease or checked-out commit mismatch');
 return result;
}

// Manual dispatch does not create a chat commit or impersonate a push event.
// Its explicit JSON evidence binds the current main checkout and the same
// fresh recovery/credit evidence, exact source and owner grant as chat release.
export function validateManualReleaseRequest(args={}){
 const {request,inputReleaseId,inputTestedSourceSha,expectedMainHead,
  checkedOutHeadSha,workflowHeadSha,expectedDevelopmentHead,expectedReleaseHead,
  ownerApprovalSource}=args;
 const result=validateRequestEvidence({...args,mainShaField:'expected_main_head_sha'});
 if(request.mode!=='publish'||request.release_id!==inputReleaseId||
  request.tested_source_sha!==inputTestedSourceSha)
  deny('manual evidence must bind publish mode, release ID and tested source inputs');
 if(!SHA.test(expectedDevelopmentHead||'')||!SHA.test(expectedReleaseHead||'')||
  typeof ownerApprovalSource!=='string'||ownerApprovalSource.length<12)
  deny('manual current-ref and owner-grant context absent');
 if(!SHA.test(expectedMainHead||'')||request.expected_main_head_sha!==expectedMainHead||
  checkedOutHeadSha!==expectedMainHead||workflowHeadSha!==expectedMainHead)
  deny('manual main lease, workflow SHA or checked-out commit mismatch');
 return result;
}

// Validate the actual signed push envelope and append-only request journal.
export function assertChatPushEnvelope({eventForced,eventAfterSha,eventHeadSha,
 remoteMainSha,request,previousJournal,currentJournal}={}){
 if(eventForced!=='false')deny('forced or unknown push event refused');
 if(!SHA.test(eventAfterSha||'')||eventAfterSha!==eventHeadSha||remoteMainSha!==eventHeadSha)
  deny('event after or current remote main differs from request commit');
 if(typeof previousJournal!=='string'||typeof currentJournal!=='string'||
  !currentJournal.startsWith(previousJournal))deny('ops journal must preserve prior history');
 const appended=currentJournal.slice(previousJournal.length);
 if(!appended.includes(request.release_id)||!appended.includes(request.tested_source_sha)||
  !appended.includes(request.mode))deny('new journal appendix must bind request ID, source and mode');
 return true;
}
