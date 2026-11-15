import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTrustedRun, verifyAuthorizedPushRequest, selectArtifact, assertArchiveIdentity, REPO, FOLDER_ID} from '../scripts/backups/drive-courier.mjs';

const run={id:123,status:'completed',conclusion:'success',head_branch:'main',
  repository:{full_name:REPO},event:'schedule',path:'.github/workflows/nightly-backup.yml'};
const artifact={id:456,name:'dic-encrypted-nightly-123',workflow_run:{id:123},expired:false,
  size_in_bytes:100,digest:'sha256:'+'a'.repeat(64)};
test('only completed trusted scheduled/manual main run is eligible',()=>{
  assert.equal(verifyTrustedRun(run),true);
  for(const patch of [{event:'push'},{conclusion:'failure'},{status:'in_progress'},
    {head_branch:'development/backend-foundation'},{path:'.github/workflows/malicious.yml'},
    {repository:{full_name:'malicious/other'}}]) {
    assert.throws(()=>verifyTrustedRun({...run,...patch}));
  }
  assert.equal(verifyTrustedRun({...run,event:'workflow_dispatch'}),true);
});
test('artifact must have matching run id and provider SHA256',()=>{
  const data={total_count:1,artifacts:[artifact]};
  assert.deepEqual(selectArtifact(data,123),artifact);
  assert.equal(selectArtifact({total_count:0,artifacts:[]},123),null);
  assert.throws(()=>selectArtifact({total_count:2,artifacts:[artifact,artifact]},123));
  assert.equal(selectArtifact({total_count:1,artifacts:[{...artifact,digest:'invalid'}]},123),null);
  assert.equal(selectArtifact({total_count:1,artifacts:[{...artifact,workflow_run:{id:999}}]},123),null);
  assert.throws(()=>selectArtifact({total_count:101,artifacts:[artifact]},123));
});
test('Drive file identity needs exact parent, size, appProperties and digest',()=>{
  const file={size:'100',parents:[FOLDER_ID],md5Checksum:'md5',
    appProperties:{dicArtifactId:'456',dicSha256:artifact.digest}};
  assert.doesNotThrow(()=>assertArchiveIdentity(file,artifact));
  for(const patch of [{size:'99'},{parents:['incorrect']},{parents:[FOLDER_ID,'other']},
    {appProperties:{dicArtifactId:'456',dicSha256:'sha256:bad'}},{appProperties:null},{md5Checksum:undefined}]){
    assert.throws(()=>assertArchiveIdentity({...file,...patch},artifact));
  }
});

test('only one-file authorized backup request main push can opt into courier',()=>{
  const sha='a'.repeat(40);
  const push={...run,event:'push',head_sha:sha};
  const commit={sha,parents:[{sha:'b'.repeat(40)}],files:[{filename:'docs/BACKUP_REQUEST.json',status:'modified'}]};
  assert.throws(()=>verifyTrustedRun(push));
  assert.equal(verifyAuthorizedPushRequest(push,commit),true);
  assert.equal(verifyTrustedRun(push,REPO,true),true);
  for(const bad of [
    {...commit,sha:'c'.repeat(40)},
    {...commit,parents:[]},
    {...commit,parents:[{},{}]},
    {...commit,files:[]},
    {...commit,files:[...commit.files,{filename:'AGENTS.md',status:'modified'}]},
    {...commit,files:[{filename:'docs/RELEASE_REQUEST.json',status:'modified'}]},
    {...commit,files:[{filename:'docs/BACKUP_REQUEST.json',status:'added'}]}
  ]) assert.throws(()=>verifyAuthorizedPushRequest(push,bad));
  assert.throws(()=>verifyAuthorizedPushRequest({...push,head_sha:'bad'},commit));
  assert.throws(()=>verifyAuthorizedPushRequest({...push,event:'schedule'},commit));
});
