// #368: no-write recovery/immutable preflight. Structural backup fields and
// caller-supplied ZIPs are not independent provider or restore attestations.
// Never promote either to release READY or authorize a provider mutation.
import {createHash} from 'node:crypto';
import {decideReleaseBackup} from './release-backup-decision.mjs';
import {requestEncryptedBackup} from './request-encrypted-backup.mjs';
import {retrieveVerifiedReleaseBundle} from './retrieve-certified-release-bundle.mjs';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
export async function prepareReleaseEvidence({backup,artifact,githubToken,sourceSha,
 approvedReadyItemIds,backupRequester=requestEncryptedBackup,
 artifactRetriever=retrieveVerifiedReleaseBundle}={}){
 const recovery=decideReleaseBackup(backup||{});
 if(!recovery.reusable){
  if(!githubToken)return {ready:false,status:'BACKUP_UNVERIFIED_DISPATCH_UNAVAILABLE',
   reasons:recovery.reasons};
  const request=await backupRequester({token:githubToken,
   freshnessKey:backup?.latestDataWriteUtc});
  return {ready:false,status:'WAITING_FOR_NEW_BACKUP_OFFSITE_VERIFICATION',
   backup_request:request,reasons:recovery.reasons};
 }
 // A raw ZIP plus a matching caller-provided SHA is NOT a source-bound CI
 // certificate. No bypass of the v4 static+Function retrieval is permitted.
 if(artifact!==undefined&&artifact!==null)
  throw Error('Raw artifact override is not a certified release bundle');
 if(!githubToken||!SHA.test(sourceSha||'')||
  !Array.isArray(approvedReadyItemIds)||!approvedReadyItemIds.length||
  approvedReadyItemIds.some(id=>typeof id!=='string'||!id.trim())||
  new Set(approvedReadyItemIds).size!==approvedReadyItemIds.length)
  return {ready:false,status:'HOLD_EXACT_SOURCE_CI_AND_READY_SCOPE_REQUIRED',
   recovery_action:recovery.action,backup_structural_evidence_only:true};
 const certified=await artifactRetriever({token:githubToken,sourceSha});
 const functionZip=certified?.functionZip;
 const functionHash=certified?.receipt?.immutable_function_sha256;
 if(certified?.status!=='EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION'||
  certified.source_sha!==sourceSha||certified.receipt?.source_sha!==sourceSha||
  !Number.isSafeInteger(certified.run_id)||certified.run_id<=0||
  !Array.isArray(certified.receipt?.ready_item_ids)||
  JSON.stringify(certified.receipt.ready_item_ids.slice().sort())!==
   JSON.stringify(approvedReadyItemIds.slice().sort())||
  !Buffer.isBuffer(functionZip)||!HASH.test(functionHash||'')||
  createHash('sha256').update(functionZip).digest('hex')!==functionHash||
  certified.manifest?.functions?.['coffee-url-preview']!==functionHash||
  !Buffer.isBuffer(certified.files?.['/index.html']))
  throw Error('Exact-source CI static/Function bytes or READY scope not verified');
 // This is a *no-write* preparation result. The recovery object is untrusted
 // until independent provider-source, latest-write and same-archive restore
 // evidence is obtained. Only the final guarded controller can authorize a
 // future one-use claim and Netlify transaction.
 return {ready:false,status:'HOLD_INDEPENDENT_OFFSITE_RESTORE_ATTESTATION_REQUIRED',
  recovery_action:recovery.action,backup_structural_evidence_only:true,
  certified_source_sha:sourceSha,certified_run_id:certified.run_id,
  certified_ready_item_ids:approvedReadyItemIds.slice().sort(),
  provider_write_calls:0};
}
