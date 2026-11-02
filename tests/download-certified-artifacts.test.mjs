import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,rmSync} from 'node:fs';
import {downloadCertifiedArtifactContainers} from '../scripts/release/download-certified-artifacts.mjs';
const sha='a'.repeat(40),zip=Buffer.concat([Buffer.from('PK'),Buffer.alloc(110)]);
const discover=async()=>({dist_artifact_id:1,certificate_artifact_id:2,source_sha:sha,run_id:42});
test('downloads only discovered artifact IDs to temporary private files',async()=>{
 const calls=[];const r=await downloadCertifiedArtifactContainers({token:'fake',sourceSha:sha,discover,
 fetcher:async url=>{calls.push(url);return {ok:true,arrayBuffer:async()=>zip};}});
 try{assert.equal(calls.length,2);assert.ok(existsSync(r.dist_container_path));
 assert.ok(existsSync(r.certificate_container_path));
 assert.match(r.status,/NOT_YET_VERIFIED/);}
 finally{rmSync(r.temporary_dir,{recursive:true,force:true});}
});
test('download error rejects and never returns unverified artifacts',async()=>{
 await assert.rejects(downloadCertifiedArtifactContainers({token:'fake',sourceSha:sha,discover,
  fetcher:async()=>({ok:false})}));
 await assert.rejects(downloadCertifiedArtifactContainers({token:'fake',sourceSha:sha,discover,
  fetcher:async()=>({ok:true,arrayBuffer:async()=>Buffer.from('bad')})}));
});
