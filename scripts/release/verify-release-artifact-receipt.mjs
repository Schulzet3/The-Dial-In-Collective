// Fail-closed source-bound CI artifact receipt validation; read-only, no publication.
import {createHash} from 'node:crypto';
import {verifyImmutableArchive} from './netlify-immutable-publish.mjs';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
export function verifyReleaseArtifactReceipt({certificate,sourceSha,archive,functionArchive,runId,artifactName,
 verifiedRequiredChecks=false}={}){
 if(!SHA.test(sourceSha||'')||!certificate||certificate.schema_version!==4||
  certificate.kind!=='DIC_CI_SOURCE_CERTIFICATE_NOT_RELEASE_APPROVAL'||
  certificate.source_sha!==sourceSha||
  certificate.batch_status!=='CERTIFIED_READY_SOURCE'||
  certificate.strict_source_isolation_passed!==true||
  !Array.isArray(certificate.isolation_errors)||certificate.isolation_errors.length!==0)
  throw Error('CI certificate does not certify isolated READY source');
 const ids=certificate.assessed_ready_item_ids,queued=certificate.queue_ready_item_ids;
 if(!Array.isArray(ids)||ids.length===0||new Set(ids).size!==ids.length||
  !Array.isArray(queued)||JSON.stringify(ids)!==JSON.stringify(queued))
  throw Error('Certified READY item IDs are missing or inconsistent');
 if(!Number.isSafeInteger(runId)||runId<=0||certificate.github_run_id!==runId||
  !verifiedRequiredChecks)throw Error('Exact-source successful CI run evidence missing');
 if(!HASH.test(certificate.immutable_artifact_sha256||'')||
  artifactName!==certificate.immutable_artifact_name||
  artifactName!=='dic-production-dist-'+sourceSha)
  throw Error('Immutable artifact name/hash not bound to certificate');
 if(!Buffer.isBuffer(functionArchive)||functionArchive.length<100||
  !HASH.test(certificate.immutable_function_sha256||'')||
  certificate.immutable_function_name!=='coffee-url-preview-function.zip')
  throw Error('Immutable Netlify Function artifact missing');
 if(createHash('sha256').update(functionArchive).digest('hex')!==certificate.immutable_function_sha256)
  throw Error('Immutable Netlify Function checksum mismatch');
 const receipt=verifyImmutableArchive({archive,
  expectedSha256:certificate.immutable_artifact_sha256,
  sourceSha,certifiedSourceSha:certificate.source_sha});
 return {...receipt,immutable_function_sha256:certificate.immutable_function_sha256,ready_item_ids:ids,github_run_id:runId,
  status:'EXACT_ARTIFACT_CI_RECEIPT_VERIFIED_NOT_RELEASE_AUTHORIZATION'};
}
