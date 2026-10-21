// Pure fail-closed validation for a chat-authored, single-use main-branch
// release request. This file never changes Git refs or contacts providers.
import {validateReleaseGrant} from './one-use-claim.mjs';
export const RELEASE_REQUEST_PATH='docs/RELEASE_REQUEST.json';
export const RELEASE_OPS_JOURNAL='docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md';
export const RELEASE_REQUEST_SCHEMA=1;
const SHA=/^[0-9a-f]{40}$/;
const RELEASE_ID=/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/;
const REQUEST_ID=/^DIC-REQ-[0-9]{8}-[A-Z0-9_-]{8,64}$/;
const DECISION_KEY=/^current_owner_[a-z0-9_]{8,160}$/;
const ALLOWED=['approval_decision_key','approval_source','expected_development_head_sha',
 'expected_release_head_sha','release_id','request_id','requested_at_utc',
 'schema_version','tested_source_sha'];
const reject=why=>{throw Error('Chat release request denied: '+why);};
export function assertRequestShape(request){
 if(!request||typeof request!=='object'||Array.isArray(request))
  reject('request is not a JSON object');
 if(Object.keys(request).sort().join('|')!==ALLOWED.slice().sort().join('|'))
  reject('missing or unexpected request fields');
 if(request.schema_version!==RELEASE_REQUEST_SCHEMA)reject('unsupported request schema');
 if(!REQUEST_ID.test(request.request_id))reject('invalid unique request ID');
 if(!RELEASE_ID.test(request.release_id))reject('invalid unique release ID');
 if(!SHA.test(request.tested_source_sha)||!SHA.test(request.expected_release_head_sha)||
    !SHA.test(request.expected_development_head_sha))
  reject('expected exact 40-character Git SHA values');
 if(!DECISION_KEY.test(request.approval_decision_key))
  reject('specific owner decision key required');
 if(typeof request.approval_source!=='string'||request.approval_source.length<12||
    request.approval_source.length>1200)
  reject('owner approval evidence is missing or malformed');
 if(typeof request.requested_at_utc!=='string'||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(request.requested_at_utc)||
    !Number.isFinite(Date.parse(request.requested_at_utc)))
  reject('request UTC timestamp missing');
 return true;
}
export function assertPushReleaseEnvelope({request,event,commitSha,parentSha,remoteMainSha,
 changedPaths,commitSubject,journalAdded}={}){
 assertRequestShape(request);
 if(!SHA.test(commitSha)||commitSha!==remoteMainSha)
  reject('requesting commit no longer exactly current main');
 if(!SHA.test(parentSha)||parentSha===commitSha)
  reject('single parent commit required');
 if(!event||event.ref!=='refs/heads/main'||event.after!==commitSha||
    event.before!==parentSha||event.forced===true||
    event.created===true||event.deleted===true)
  reject('not an ordinary non-force main push of this one commit');
 const want=[RELEASE_OPS_JOURNAL,RELEASE_REQUEST_PATH].sort().join('|');
 if(!Array.isArray(changedPaths)||changedPaths.slice().sort().join('|')!==want)
  reject('request commit changed files other than request and contemporaneous ops journal');
 if(commitSubject!=='ops(release-request): '+request.release_id+' [skip netlify]')
  reject('request commit subject is not the bounded non-publishing instruction');
 if(typeof journalAdded!=='string'||
    !journalAdded.includes(request.request_id)||
    !journalAdded.includes(request.release_id))
  reject('same-commit operations journal does not record exact request and release IDs');
 return true;
}
export function assertChatReleaseAuthorized({request,grant,decision,nowIso,
 developmentHead,releaseHead}={}){
 assertRequestShape(request);
 if(request.expected_development_head_sha!==developmentHead)
  reject('development branch moved after request');
 if(request.expected_release_head_sha!==releaseHead)
  reject('production ref moved after request');
 if(request.tested_source_sha===releaseHead)
  reject('already-published source cannot be published again');
 if(!decision||typeof decision!=='object'||typeof decision.status!=='string'||
    !/\bAPPROVED\b/.test(decision.status))
  reject('specific canonical owner approval is absent or unapproved');
 if(!grant||request.approval_source!==grant.approval_source||
    grant.owner_private_free_compensating_controls!==true)
  reject('owner grant provenance or private-Free acceptance mismatched');
 validateReleaseGrant(grant,{releaseId:request.release_id,
  sourceSha:request.tested_source_sha,nowIso});
 const now=Date.parse(nowIso),when=Date.parse(request.requested_at_utc);
 if(!Number.isFinite(now)||when>now+120000||now-when>24*60*60*1000)
  reject('release request is stale, in the future or has invalid clock');
 return true;
}
