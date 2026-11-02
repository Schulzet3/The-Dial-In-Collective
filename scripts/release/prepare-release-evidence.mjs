// Release preflight orchestrator: no provider publication and no grant consumption.
// Reuses independently verified recovery; otherwise requests the existing encrypted
// backup workflow and blocks until a separate offsite ciphertext verification.
import {decideReleaseBackup} from './release-backup-decision.mjs';
import {requestEncryptedBackup} from './request-encrypted-backup.mjs';
import {verifyImmutableArchive} from './netlify-immutable-publish.mjs';
import {retrieveVerifiedReleaseBundle} from './retrieve-certified-release-bundle.mjs';
export async function prepareReleaseEvidence({backup,artifact,githubToken,sourceSha,
 backupRequester=requestEncryptedBackup,artifactRetriever=retrieveVerifiedReleaseBundle}={}){
 const recovery=decideReleaseBackup(backup||{});
 if(!recovery.reusable){
  if(!githubToken)return {ready:false,status:'BACKUP_UNVERIFIED_DISPATCH_UNAVAILABLE',
   reasons:recovery.reasons};
  const request=await backupRequester({token:githubToken,
   freshnessKey:backup?.latestDataWriteUtc});
  return {ready:false,status:'WAITING_FOR_NEW_BACKUP_OFFSITE_VERIFICATION',
   backup_request:request,reasons:recovery.reasons};
 }
 const immutable=artifact?verifyImmutableArchive(artifact):null;
 const certified=immutable?null:await artifactRetriever({token:githubToken,sourceSha});
 return {ready:true,status:'PREFLIGHT_EVIDENCE_READY_NOT_AUTHORIZED_TO_PUBLISH',
  recovery_action:recovery.action,artifact:immutable,certified_bundle:certified};
}
