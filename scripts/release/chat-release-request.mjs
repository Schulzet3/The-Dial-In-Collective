// Inert validation for a chat-originated, owner-approved release request.
// No deploy or Git mutation. Hosted controller must also check real refs,
// source CI, unique grant, data recovery and credit state before any push.
export const CHAT_REQUEST_PATH='docs/RELEASE_REQUEST.json';
export const OPS_JOURNAL_PATH='docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/;
const ALLOWED_PATHS=[CHAT_REQUEST_PATH,OPS_JOURNAL_PATH].sort();
const REQUIRED=['schema_version','release_id','tested_source_sha',
 'expected_release_head_sha','expected_development_head_sha',
 'owner_approval_source','created_at_utc','backup_evidence','credit_evidence'];
const REQ_BACKUP=['artifact_id','encrypted_sha256','owner_private_offsite_file_id',
 'archive_completed_at_utc','verified_at_utc','latest_observed_data_write_at_utc'];
const REQ_CREDIT=['observed_remaining_credits','observed_at_utc','source'];
const deny=reason=>{throw new Error('Chat release request denied: '+reason);};
const exactly=(obj,keys)=>!!obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===keys.slice().sort().join('|');
const validDate=(v)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validateChatReleaseRequest({
 request,changedPaths,commitSubject,nowIso,expectedDevelopmentHead,
 expectedReleaseHead,ownerApprovalSource
}={}){
 if(!exactly(request,REQUIRED)||request.schema_version!==1)
  deny('unknown fields or malformed request schema');
 if(!Array.isArray(changedPaths)||
  [...new Set(changedPaths)].sort().join('|')!==ALLOWED_PATHS.join('|')||
  changedPaths.length!==ALLOWED_PATHS.length)
  deny('request commit must change only the request and contemporaneous ops journal');
 if(typeof commitSubject!=='string'||!commitSubject.includes('[skip netlify]')||
    commitSubject.includes('[dic-publish]'))
  deny('chat request commit must not publish or omit skip marker');
 if(!ID.test(request.release_id))deny('release ID format');
 if(!SHA.test(request.tested_source_sha)||!SHA.test(request.expected_release_head_sha)||
    !SHA.test(request.expected_development_head_sha))
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
    !validDate(backup.archive_completed_at_utc)||
    !validDate(backup.verified_at_utc)||
    !validDate(backup.latest_observed_data_write_at_utc))
  deny('encrypted/offsite backup evidence missing or malformed');
 const archived=Date.parse(backup.archive_completed_at_utc);
 const verified=Date.parse(backup.verified_at_utc);
 const latestWrite=Date.parse(backup.latest_observed_data_write_at_utc);
 if(archived<latestWrite||archived>verified||archived>now+60_000)
  deny('encrypted archive does not cover latest observed user data write');
 if(verified>now+60_000||now-verified>2*60*60*1000)
  deny('backup verification is stale or future-dated');
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
