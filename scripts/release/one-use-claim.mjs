// Immutable release-grant validation and single-use claim state.
// Pure functions only: no GitHub/Netlify calls, no secrets, no deployment.
// A caller MUST atomically update the release ref by NON-FORCE fast-forward;
// a JSON check without that ref update is NOT a release lock.
export const RELEASE_BRANCH='release/production';
export const CONTROL_SCHEMA=1;
const SHA=/^[a-f0-9]{40}$/;
const ID=/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/;
const has=Object.hasOwn;
function reject(reason){throw new Error('Release denied: '+reason);}
export function validateReleaseGrant(grant,{releaseId,sourceSha,nowIso}={}){
 if(!grant||typeof grant!=='object'||Array.isArray(grant))reject('missing owner grant');
 if(typeof releaseId!=='string'||!ID.test(releaseId)||grant.id!==releaseId)reject('invalid or mismatched release ID');
 if(typeof sourceSha!=='string'||!SHA.test(sourceSha)||grant.tested_source_sha!==sourceSha)
  reject('grant is not bound to this exact tested source SHA');
 if(grant.owner_approved!==true||grant.status!=='APPROVED')reject('explicit owner consent absent');
 if(grant.production_branch!==RELEASE_BRANCH||grant.max_publications!==1)reject('unsafe branch or more than one publication authorized');
 if(grant.estimated_credits_limit!==15)reject('release cost ceiling differs from owner locked grant');
 if(typeof grant.approved_at_utc!=='string'||!Number.isFinite(Date.parse(grant.approved_at_utc)))
  reject('approval timestamp missing');
 const now=Date.parse(nowIso||'');
 if(!Number.isFinite(now)||now<Date.parse(grant.approved_at_utc))reject('approval not valid yet');
 if(typeof grant.expires_at_utc!=='string'||!Number.isFinite(Date.parse(grant.expires_at_utc))||
    now>=Date.parse(grant.expires_at_utc))reject('grant expired or has no finite expiry');
 if(!grant.approval_source||typeof grant.approval_source!=='string'||grant.approval_source.length<12)
  reject('owner consent provenance missing');
 if(grant.owner_approved !== true)reject('invalid consent');
 return true;
}
export function planSingleUseClaim({grant,releaseId,sourceSha,nowIso,ledger,currentPublishedSourceSha}={}){
 validateReleaseGrant(grant,{releaseId,sourceSha,nowIso});
 if(!ledger||ledger.schema_version!==CONTROL_SCHEMA||!Array.isArray(ledger.consumed))
  reject('release consumption ledger unavailable');
 if(ledger.consumed.some(x=>x.id===releaseId))reject('approval ID is already consumed');
 if(ledger.consumed.some(x=>x.tested_source_sha===sourceSha))
  reject('this tested source SHA was already published under another grant');
 if(currentPublishedSourceSha===sourceSha)reject('source is already published, refusing redundant build');
 if(ledger.consumed.some(x=>!x||!ID.test(x.id)||!SHA.test(x.tested_source_sha))||
    new Set(ledger.consumed.map(x=>x.id)).size!==ledger.consumed.length)
  reject('historical release ledger corrupt or duplicate');
 const entry={id:releaseId,tested_source_sha:sourceSha,claimed_at_utc:nowIso,
  approval_source:grant.approval_source};
 return {schema_version:CONTROL_SCHEMA,consumed:[...ledger.consumed,entry]};
}
export function readLastClaim(ledger){
 if(!ledger||ledger.schema_version!==CONTROL_SCHEMA||!Array.isArray(ledger.consumed))reject('invalid release ledger');
 return ledger.consumed.at(-1)||null;
}
export function assertProductionClaim({ledger,grant,commitSubject,sourceSha,nowIso}={}){
 const claim=readLastClaim(ledger);
 if(!claim)reject('release branch contains no consumed claim');
 if(!/^Release DIC: (DIC-[0-9]{8}-[A-Z0-9_-]{6,64}) \[dic-publish\]$/.test(commitSubject||''))
  reject('exact signed-off release commit subject missing');
 const subjectId=commitSubject.slice('Release DIC: '.length).split(' ')[0];
 if(subjectId!==claim.id||claim.tested_source_sha!==sourceSha)reject('release commit does not match latest consumed ID/SHA');
 if(ledger.consumed.filter(x=>x.id===claim.id).length!==1)reject('release ID is repeated');
 validateReleaseGrant(grant,{releaseId:claim.id,sourceSha,nowIso});
 return true;
}
export function assertReadyForRelease({requiredChecks,flags}={}){
 if(!flags||flags.githubPrivateBranchProtectionVerified!==true||
  flags.netlifyProductionBranchVerified!==true||flags.defaultBranchRunnerVerified!==true)
  reject('mandatory hosted configuration not independently verified');
 for(const check of ['approval','validate','cloud-tests','mobile-browser-qa','review']){
  if(requiredChecks?.[check]!=='success')reject('required CI not green: '+check);
 }
 return true;
}
