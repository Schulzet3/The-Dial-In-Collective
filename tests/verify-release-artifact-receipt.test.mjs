import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyReleaseArtifactReceipt} from '../scripts/release/verify-release-artifact-receipt.mjs';
const sourceSha='a'.repeat(40),archive=Buffer.concat([Buffer.from('PK'),Buffer.alloc(128,5)]);
const artifactName='dic-production-dist-'+sourceSha;
const certificate={schema_version:3,kind:'DIC_CI_SOURCE_CERTIFICATE_NOT_RELEASE_APPROVAL',
 source_sha:sourceSha,batch_status:'CERTIFIED_READY_SOURCE',strict_source_isolation_passed:true,
 isolation_errors:[],assessed_ready_item_ids:['item'],queue_ready_item_ids:['item'],
 github_run_id:42,immutable_artifact_name:artifactName,
 immutable_artifact_sha256:createHash('sha256').update(archive).digest('hex')};
const args={certificate,sourceSha,archive,artifactName,runId:42,verifiedRequiredChecks:true};
test('accepts only exact READY source, CI and immutable artifact receipt',()=>{
 assert.match(verifyReleaseArtifactReceipt(args).status,/NOT_RELEASE_AUTHORIZATION/);
 for(const patch of [{sourceSha:'b'.repeat(40)},{runId:43},{verifiedRequiredChecks:false},
  {artifactName:'other'},{archive:Buffer.concat([archive,Buffer.from('x')])},
  {certificate:{...certificate,batch_status:'NO_BATCH'}},
  {certificate:{...certificate,strict_source_isolation_passed:false}},
  {certificate:{...certificate,queue_ready_item_ids:['other']}},
  {certificate:{...certificate,assessed_ready_item_ids:['item','item']}}]){
  assert.throws(()=>verifyReleaseArtifactReceipt({...args,...patch}));
 }
});
