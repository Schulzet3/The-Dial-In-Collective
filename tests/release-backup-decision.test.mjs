import test from 'node:test';
import assert from 'node:assert/strict';
import {decideReleaseBackup as decide} from '../scripts/release/release-backup-decision.mjs';
const folder='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf',hash='a'.repeat(64);
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
 {githubArtifact:{...evidence.githubArtifact,size_in_bytes:100}},
 {githubArtifact:{...evidence.githubArtifact,size_in_bytes:99.5}},
 {githubArtifact:{...evidence.githubArtifact,id:undefined},expectedArtifactId:undefined},
 {expectedArtifactId:undefined},
 {expectedDriveId:undefined,driveFile:{...evidence.driveFile,id:undefined}},
 {driveFile:{...evidence.driveFile,size:'100'}},
 {driveFile:{...evidence.driveFile,size:'99.5'}},
 {driveFile:{...evidence.driveFile,parent_ids:['wrong']}},
 {driveFile:{...evidence.driveFile,parent_ids:[folder,'other']}},
 {approvedFolderId:'attacker-folder',driveFile:{...evidence.driveFile,parent_ids:['attacker-folder']}},
 {approvedFolderId:undefined},
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

test('microsecond and nanosecond writes AFTER snapshot are never covered',()=>{
 const start='2026-11-01T11:00:00.000000000Z';
 for(const latestDataWriteUtc of [
  '2026-11-01T11:00:00.000001Z',
  '2026-11-01T11:00:00.000000001Z',
  '2026-11-01T11:00:00.000000999Z']){
  const result=decide({...evidence,snapshotStartUtc:start,latestDataWriteUtc});
  assert.equal(result.reusable,false,latestDataWriteUtc);
  assert.match(result.reasons.join('; '),/latest observed database write/);
 }
 assert.equal(decide({...evidence,snapshotStartUtc:start,
  latestDataWriteUtc:'2026-11-01T11:00:00.000000000Z'}).reusable,true);
 assert.equal(decide({...evidence,snapshotStartUtc:start,
  latestDataWriteUtc:'2026-11-01T10:59:59.999999999Z'}).reusable,true);
});
test('verification instant must follow snapshot at full precision; malformed UTC fails shut',()=>{
 const snapshotStartUtc='2026-11-01T11:00:00.000000009Z';
 for(const verificationUtc of ['2026-11-01T11:00:00.000000008Z',
  '2026-02-31T12:00:00Z','2026-11-01T12:00:00+00:00',
  '2026-11-01T12:00:00.1234567890Z']){
  assert.equal(decide({...evidence,snapshotStartUtc,verificationUtc}).reusable,false,
   verificationUtc);
 }
 assert.equal(decide({...evidence,snapshotStartUtc,
  verificationUtc:'2026-11-01T11:00:00.000000009Z'}).reusable,true);
});
