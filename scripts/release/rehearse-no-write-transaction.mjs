// #368: independent, no-write rehearsal of certified CI bytes and current live Netlify.
// Deliberately cannot consume a grant, dispatch a backup, create a draft or publish.
// Backup input is structural evidence only; never treat caller-provided hashes as
// independently sourced provider attestations or authorize a release from this result.
import {createHash} from 'node:crypto';
import {decideReleaseBackup} from './release-backup-decision.mjs';
import {retrieveVerifiedReleaseBundle} from './retrieve-certified-release-bundle.mjs';
import {verifyLiveNetlify} from './netlify-live-readback.mjs';
const SHA=/^[a-f0-9]{40}$/;
export async function rehearseNoWriteTransaction({backup,githubToken,netlifyToken,
 sourceSha,expectedReleaseSha,approvedReadyItemIds,
 artifactRetriever=retrieveVerifiedReleaseBundle,liveReadback=verifyLiveNetlify}={}){
 if(!SHA.test(sourceSha||'')||!SHA.test(expectedReleaseSha||'')||
  !githubToken||!netlifyToken||!Array.isArray(approvedReadyItemIds)||
  !approvedReadyItemIds.length||new Set(approvedReadyItemIds).size!==approvedReadyItemIds.length)
  throw Error('No-write rehearsal requires exact source, current release and unique READY scope');
 const recovery=decideReleaseBackup(backup||{});
 if(!recovery.reusable)return {ready:false,status:'HOLD_BACKUP_EVIDENCE_INCOMPLETE_NO_WRITES',
  reasons:recovery.reasons};
 const bundle=await artifactRetriever({token:githubToken,sourceSha});
 if(bundle?.status!=='EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION'||
  bundle.source_sha!==sourceSha||bundle.receipt?.source_sha!==sourceSha||
  !Array.isArray(bundle.receipt?.ready_item_ids)||
  JSON.stringify(bundle.receipt.ready_item_ids.slice().sort())!==
   JSON.stringify(approvedReadyItemIds.slice().sort())||
  !Buffer.isBuffer(bundle.functionZip)||
  !/^[a-f0-9]{64}$/.test(bundle.receipt.immutable_function_sha256||'')||
  createHash('sha256').update(bundle.functionZip).digest('hex')!==
   bundle.receipt.immutable_function_sha256||
  bundle.manifest?.functions?.['coffee-url-preview']!==
   bundle.receipt.immutable_function_sha256||
  !Buffer.isBuffer(bundle.files?.['/index.html']))
  throw Error('No-write rehearsal: exact-source certified static/function/READY scope mismatch');
 const live=await liveReadback({token:netlifyToken,expectedReleaseSha});
 if(live?.status!=='PROVIDER_READY_CURRENT_EXACT_SHA'||
  live.release_sha!==expectedReleaseSha||!live.deploy_id||
  live.function_continuity?.function_name!=='coffee-url-preview'||
  live.function_continuity?.route!=='/api/coffee-preview'||
  live.function_continuity?.method!=='POST'||
  live.function_continuity?.runtime!=='nodejs22.x')
  throw Error('No-write rehearsal: live Netlify READY/current Function continuity missing');
 return {ready:false,status:'INERT_READONLY_REHEARSAL_PASS_NOT_RELEASE_APPROVAL',
  source_sha:sourceSha,certified_run_id:bundle.run_id,
  certified_ready_item_ids:approvedReadyItemIds.slice().sort(),
  existing_production_sha:expectedReleaseSha,existing_deploy_id:live.deploy_id,
  backup_evidence_structurally_consistent:true,provider_write_calls:0,
  remaining:['Independent trusted offsite latest-write and restore attestation',
   'Actual provider draft/restore compatibility (requires separate owner authorization)',
   'New exact-source release grant and independently verified production transaction']};
}
