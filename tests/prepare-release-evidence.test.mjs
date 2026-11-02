import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareReleaseEvidence} from '../scripts/release/prepare-release-evidence.mjs';
const sha='a'.repeat(40),zip=Buffer.concat([Buffer.from('PK'),Buffer.alloc(120)]);
const hash=createHash('sha256').update(zip).digest('hex');
const folder='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
const backup={githubArtifact:{id:5,expired:false,size_in_bytes:200},
 driveFile:{id:'d',parent_ids:[folder],size:200},expectedArtifactId:5,
 expectedDriveId:'d',approvedFolderId:folder,verifiedCiphertextSha256:'b'.repeat(64),
 expectedCiphertextSha256:'b'.repeat(64),latestDataWriteUtc:'2026-11-01T01:00:00Z',
 snapshotStartUtc:'2026-11-01T02:00:00Z',verificationUtc:'2026-11-01T03:00:00Z'};
const bundle={status:'EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION',
 source_sha:sha,run_id:77,receipt:{source_sha:sha,ready_item_ids:['DIC-Q-1'],
 immutable_function_sha256:hash},functionZip:zip,
 files:{'/index.html':Buffer.from('<html>')},
 manifest:{functions:{'coffee-url-preview':hash}}};
const args={backup,githubToken:'fake',sourceSha:sha,approvedReadyItemIds:['DIC-Q-1']};
test('structural backup plus certified exact-source static/function bytes remains HOLD, never READY',async()=>{
 let retrievals=0,dispatches=0;
 const r=await prepareReleaseEvidence({...args,
  artifactRetriever:async input=>{retrievals++;assert.equal(input.sourceSha,sha);return bundle;},
  backupRequester:async()=>{dispatches++;throw Error('unexpected dispatch');}});
 assert.equal(retrievals,1);assert.equal(dispatches,0);
 assert.equal(r.ready,false);assert.equal(r.provider_write_calls,0);
 assert.equal(r.backup_structural_evidence_only,true);
 assert.equal(r.certified_run_id,77);
 assert.equal(r.status,'HOLD_INDEPENDENT_OFFSITE_RESTORE_ATTESTATION_REQUIRED');
});
test('raw caller ZIP and checksum cannot bypass CI certificate and function validation',async()=>{
 let calls=0;
 await assert.rejects(prepareReleaseEvidence({...args,
  artifact:{archive:zip,sourceSha:sha,certifiedSourceSha:sha,
   expectedSha256:hash},artifactRetriever:async()=>{calls++;}}),
 /Raw artifact override/);
 assert.equal(calls,0);
});
test('unverified backup dispatches at most through durable requester and always blocks',async()=>{
 let calls=0,retrievals=0;
 const r=await prepareReleaseEvidence({...args,backup:{latestDataWriteUtc:'2026-11-01T01:00:00Z'},
  backupRequester:async input=>{calls++;assert.equal(input.freshnessKey,'2026-11-01T01:00:00Z');
   return {status:'BACKUP_REQUESTED_NOT_VERIFIED'};},
  artifactRetriever:async()=>{retrievals++;}});
 assert.equal(calls,1);assert.equal(retrievals,0);
 assert.equal(r.ready,false);assert.equal(r.status,'WAITING_FOR_NEW_BACKUP_OFFSITE_VERIFICATION');
});
test('unverified backup without GitHub token never dispatches',async()=>{
 const r=await prepareReleaseEvidence({backup:{},sourceSha:sha});
 assert.equal(r.ready,false);assert.equal(r.status,'BACKUP_UNVERIFIED_DISPATCH_UNAVAILABLE');
});
test('no token, invalid source or missing/duplicate READY IDs deny before retrieval',async()=>{
 let calls=0;
 for(const patch of [{githubToken:null},{sourceSha:'bad'},
  {approvedReadyItemIds:[]},{approvedReadyItemIds:['DIC-Q-1','DIC-Q-1']},
  {approvedReadyItemIds:['']}]){
  const r=await prepareReleaseEvidence({...args,...patch,
   artifactRetriever:async()=>{calls++;throw Error('unexpected');}});
  assert.equal(r.ready,false);
  assert.equal(r.status,'HOLD_EXACT_SOURCE_CI_AND_READY_SCOPE_REQUIRED');
 }
 assert.equal(calls,0);
});
test('tampered CI identity, READY scope, function bytes, manifest or index cannot pass',async()=>{
 for(const bad of [{...bundle,source_sha:'c'.repeat(40)},
  {...bundle,receipt:{...bundle.receipt,ready_item_ids:['DIC-Q-2']}},
  {...bundle,receipt:{...bundle.receipt,immutable_function_sha256:'d'.repeat(64)}},
  {...bundle,manifest:{functions:{'coffee-url-preview':'e'.repeat(64)}}},
  {...bundle,files:{}},{...bundle,run_id:0},{...bundle,status:'not certified'}])
  await assert.rejects(prepareReleaseEvidence({...args,
   artifactRetriever:async()=>bad}),/Exact-source CI static\/Function bytes/);
});
test('retrieval failure propagates; no ready or fallback after a CI error',async()=>{
 await assert.rejects(prepareReleaseEvidence({...args,
  artifactRetriever:async()=>{throw Error('GitHub CI unavailable');}}),/GitHub CI unavailable/);
});
