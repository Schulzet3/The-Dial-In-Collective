import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareReleaseEvidence} from '../scripts/release/prepare-release-evidence.mjs';
const sha='a'.repeat(40),archive=Buffer.concat([Buffer.from('PK'),Buffer.alloc(120)]);
const artifact={archive,sourceSha:sha,certifiedSourceSha:sha,
 expectedSha256:createHash('sha256').update(archive).digest('hex')};
const backup={githubArtifact:{id:5,expired:false,size_in_bytes:200},
 driveFile:{id:'d',parent_ids:['approved'],size:200},expectedArtifactId:5,
 expectedDriveId:'d',approvedFolderId:'approved',verifiedCiphertextSha256:'b'.repeat(64),
 expectedCiphertextSha256:'b'.repeat(64),latestDataWriteUtc:'2026-11-01T01:00:00Z',
 snapshotStartUtc:'2026-11-01T02:00:00Z',verificationUtc:'2026-11-01T03:00:00Z'};
test('preflight reuses verified recovery and exact immutable bytes without publishing',async()=>{
 const r=await prepareReleaseEvidence({backup,artifact});
 assert.equal(r.ready,true);assert.match(r.status,/NOT_AUTHORIZED_TO_PUBLISH/);
});
test('unverified backup dispatches once and blocks even if dispatch succeeds',async()=>{
 let calls=0;const r=await prepareReleaseEvidence({backup:{},artifact,githubToken:'fake',
 backupRequester:async()=>{calls++;return {status:'BACKUP_REQUESTED_NOT_VERIFIED'}}});
 assert.equal(calls,1);assert.equal(r.ready,false);
 assert.equal(r.status,'WAITING_FOR_NEW_BACKUP_OFFSITE_VERIFICATION');
});
test('unverified backup with no token blocks and never silently reuses',async()=>{
 const r=await prepareReleaseEvidence({backup:{},artifact});
 assert.equal(r.ready,false);assert.equal(r.status,'BACKUP_UNVERIFIED_DISPATCH_UNAVAILABLE');
});
test('tampered immutable ZIP fails even when recovery verified',async()=>{
 await assert.rejects(prepareReleaseEvidence({backup,artifact:{...artifact,expectedSha256:'c'.repeat(64)}}));
});
