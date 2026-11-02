import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {rehearseNoWriteTransaction as rehearse} from '../scripts/release/rehearse-no-write-transaction.mjs';
const sha='a'.repeat(40),release='b'.repeat(40);
const zip=Buffer.concat([Buffer.from('PK'),Buffer.alloc(120)]);
const hash=createHash('sha256').update(zip).digest('hex');
const backup={githubArtifact:{id:5,expired:false,size_in_bytes:200},
 driveFile:{id:'d',parent_ids:['1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf'],size:200},
 expectedArtifactId:5,expectedDriveId:'d',
 approvedFolderId:'1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf',
 verifiedCiphertextSha256:'c'.repeat(64),expectedCiphertextSha256:'c'.repeat(64),
 latestDataWriteUtc:'2026-11-01T01:00:00Z',
 snapshotStartUtc:'2026-11-01T02:00:00Z',verificationUtc:'2026-11-01T03:00:00Z'};
const bundle={status:'EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION',
 source_sha:sha,run_id:77,receipt:{source_sha:sha,ready_item_ids:['DIC-Q-1'],
 immutable_function_sha256:hash},functionZip:zip,
 files:{'/index.html':Buffer.from('html')},
 manifest:{functions:{'coffee-url-preview':hash}}};
const live={status:'PROVIDER_READY_CURRENT_EXACT_SHA',release_sha:release,
 deploy_id:'existing',function_continuity:{function_name:'coffee-url-preview',
 route:'/api/coffee-preview',method:'POST',runtime:'nodejs22.x',
 rate_limit:{algorithm:'sliding_window',window_size:60,window_limit:12,aggregate_key:'ip'}}};
const args={backup,githubToken:'fake',netlifyToken:'fake',sourceSha:sha,
 expectedReleaseSha:release,approvedReadyItemIds:['DIC-Q-1']};
test('read-only end-to-end rehearsal checks certified bytes and live existing function, never READY',async()=>{
 let artifacts=0,reads=0;
 const result=await rehearse({...args,artifactRetriever:async x=>{
  artifacts++;assert.equal(x.sourceSha,sha);return bundle;},
 liveReadback:async x=>{reads++;assert.equal(x.expectedReleaseSha,release);return live;}});
 assert.equal(result.ready,false);
 assert.match(result.status,/INERT_READONLY_REHEARSAL_PASS/);
 assert.equal(result.provider_write_calls,0);
 assert.equal(artifacts,1);assert.equal(reads,1);
});
test('missing or forged backup folder prevents even CI or Netlify readback',async()=>{
 let calls=0;
 for(const backupInput of [{}, {...backup,approvedFolderId:'forged',
  driveFile:{...backup.driveFile,parent_ids:['forged']}}, {...backup,latestDataWriteUtc:'2026-11-01T04:00:00Z'}]){
  const result=await rehearse({...args,backup:backupInput,
   artifactRetriever:async()=>{calls++;throw Error('unsafe');},
   liveReadback:async()=>{calls++;throw Error('unsafe');}});
  assert.equal(result.ready,false);assert.match(result.status,/HOLD_BACKUP/);
 }
 assert.equal(calls,0);
});
test('tampered CI identity, READY scope, function digest or missing index blocks provider access',async()=>{
 let reads=0;
 const cases=[{...bundle,source_sha:release},
  {...bundle,receipt:{...bundle.receipt,ready_item_ids:['DIC-Q-2']}},
  {...bundle,receipt:{...bundle.receipt,immutable_function_sha256:'d'.repeat(64)}},
  {...bundle,files:{}}];
 for(const bad of cases)
  await assert.rejects(rehearse({...args,artifactRetriever:async()=>bad,
   liveReadback:async()=>{reads++;return live;}}),/certified static\/function\/READY/);
 assert.equal(reads,0);
});
test('unverified or mismatched live production function never reports success',async()=>{
 for(const bad of [{...live,release_sha:sha},
  {...live,function_continuity:{...live.function_continuity,method:'GET'}},
  {...live,status:'stale'},
  {...live,function_continuity:{...live.function_continuity,rate_limit:null}}])
  await assert.rejects(rehearse({...args,artifactRetriever:async()=>bundle,
   liveReadback:async()=>bad}),/Function continuity missing/);
});
test('invalid authority inputs fail before any read',async()=>{
 let calls=0;
 const read=async()=>{calls++;throw Error('unsafe');};
 for(const patch of [{sourceSha:'bad'},{expectedReleaseSha:'bad'},
  {approvedReadyItemIds:[]},{approvedReadyItemIds:['DIC-Q-1','DIC-Q-1']},
  {githubToken:null},{netlifyToken:null}])
  await assert.rejects(rehearse({...args,...patch,artifactRetriever:read,
   liveReadback:read}),/requires exact source/);
 assert.equal(calls,0);
});
