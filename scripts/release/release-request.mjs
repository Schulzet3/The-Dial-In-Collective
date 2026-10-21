// A read-only gate for a single explicit chat-originated production release request.
// No provider writes, no extra releases, no Git ref mutation. Actual publication
// remains guarded by the existing serialized non-force one-use controller.
import {validateReleaseGrant,RELEASE_BRANCH} from './one-use-claim.mjs';
export const REQUEST_PATH='docs/RELEASE_REQUEST.json';
export const JOURNAL_PATH='docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md';
export const REQUEST_SCHEMA=1;
const SHA=/^[a-f0-9]{40}$/;
const ID=/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/;
const REQUIRED=['schema_version','release_id','tested_source_sha','expected_development_head_sha',
 'expected_release_head_sha','expected_main_parent_sha','owner_approval_reference','requested_at_utc'].sort();
const deny=reason=>{throw Error('Chat release request denied: '+reason);};
const validSha=s=>typeof s==='string'&&SHA.test(s);

export function validateChatReleaseRequest({request,grant,developmentHead,releaseHead,mainParentSha,nowIso}={}){
 if(!request||typeof request!=='object'||Array.isArray(request))deny('request must be an object');
 if(JSON.stringify(Object.keys(request).sort())!==JSON.stringify(REQUIRED))
  deny('request must contain exact supported fields, no extras');
 if(request.schema_version!==REQUEST_SCHEMA)deny('unsupported request schema');
 if(!ID.test(request.release_id||''))deny('bad release ID');
 for(const key of ['tested_source_sha','expected_development_head_sha',
   'expected_release_head_sha','expected_main_parent_sha']){
  if(!validSha(request[key]))deny('invalid '+key);
 }
 if(request.expected_development_head_sha!==developmentHead)deny('development branch moved');
 if(request.expected_release_head_sha!==releaseHead)deny('release branch moved');
 if(request.expected_main_parent_sha!==mainParentSha)deny('main parent changed');
 if(typeof request.owner_approval_reference!=='string'||
   request.owner_approval_reference!==grant?.approval_source)
  deny('owner grant provenance mismatch');
 validateReleaseGrant(grant,{releaseId:request.release_id,
  sourceSha:request.tested_source_sha,nowIso});
 if(grant.production_branch!==RELEASE_BRANCH)deny('wrong release branch');
 const requested=Date.parse(request.requested_at_utc);
 const now=Date.parse(nowIso);
 if(typeof request.requested_at_utc!=='string'||!request.requested_at_utc.endsWith('Z')||
   !Number.isFinite(requested)||!Number.isFinite(now)||
   requested>now||now-requested>2*60*60*1000)
  deny('request timestamp missing, future or older than two hours');
 if(requested<Date.parse(grant.approved_at_utc))deny('request predates owner approval');
 return true;
}

export function validateChatReleaseCommit({request,commitSha,eventBeforeSha,remoteMainHeadSha,
 actualParentSha,changedFiles,subject,journalText}={}){
 if(!request||!ID.test(request.release_id||'')||!validSha(request.tested_source_sha))
  deny('request identity missing');
 if(!validSha(commitSha)||!validSha(eventBeforeSha)||!validSha(remoteMainHeadSha)||
   !validSha(actualParentSha))deny('invalid Git event SHA');
 if(commitSha!==remoteMainHeadSha)deny('request commit is not latest main');
 if(eventBeforeSha!==actualParentSha||
   request.expected_main_parent_sha!==actualParentSha)
  deny('commit parent does not match the pushed request');
 const paths=Array.isArray(changedFiles)?changedFiles.slice().sort():[];
 if(JSON.stringify(paths)!==JSON.stringify([REQUEST_PATH,JOURNAL_PATH].sort()))
  deny('request commit modified files other than request and contemporaneous ops journal');
 if(subject!=='ops(release-request): '+request.release_id+' [skip netlify]')
  deny('exact request-only commit subject missing');
 if(typeof journalText!=='string'||!journalText.includes('Chat-trigger release request')||
    !journalText.includes('release_id='+request.release_id)||
    !journalText.includes('source_sha='+request.tested_source_sha))
  deny('same-commit operations journal identity missing');
 return true;
}
