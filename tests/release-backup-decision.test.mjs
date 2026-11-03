import test from 'node:test';
import assert from 'node:assert/strict';
import {decideReleaseBackup as decide} from '../scripts/release/release-backup-decision.mjs';
const folder='approved-folder',hash='a'.repeat(64);
const evidence={githubArtifact:{id:12,expired:false,size_in_bytes:99},
 driveFile:{id:'file-1',parent_ids:[folder],size:'99'},expectedArtifactId:12,
 expectedDriveId:'file-1',approvedFolderId:folder,verifiedCiphertextSha256:hash,
 expectedCiphertextSha256:hash,latestDataWriteUtc:'2026-11-01T10:00:00Z',
 snapshotStartUtc:'2026-11-01T11:00:00Z',verificationUtc:'2026-11-01T12:00:00Z'};
test('only independently verified, sufficiently recent encrypted backups may be reused',()=>{
 assert.equal(decide(evidence).action,'REUSE_VERIFIED_BACKUP');
 const mutations=[
 {githubArtifact:{...evidence.githubArtifact,expired:true}},
 {githubArtifact:{...evidence.githubArtifact,size_in_bytes:0}},
 {driveFile:{...evidence.driveFile,parent_ids:['wrong']}},
 {driveFile:{...evidence.driveFile,parent_ids:[folder,'other']}},
 {verifiedCiphertextSha256:undefined},
 {verifiedCiphertextSha256:'b'.repeat(64)},
 {latestDataWriteUtc:'2026-11-01T11:01:00Z'},
 {snapshotStartUtc:'invalid'},
 {verificationUtc:'2026-11-01T09:00:00Z'}];
 for(const mutation of mutations){
  const result=decide({...evidence,...mutation});
  assert.equal(result.reusable,false);
  assert.equal(result.action,'REQUEST_FRESH_ENCRYPTED_BACKUP_AND_VERIFY');
  assert.ok(result.reasons.length);
 }
});
