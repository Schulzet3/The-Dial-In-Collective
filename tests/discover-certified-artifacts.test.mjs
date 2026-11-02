import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverCertifiedArtifacts} from '../scripts/release/discover-certified-artifacts.mjs';
const sha='a'.repeat(40);
const run={id:42,head_sha:sha,head_branch:'development/backend-foundation',
 status:'completed',conclusion:'success',event:'push'};
const artifacts=[{id:1,name:'dic-production-dist-'+sha,expired:false,size_in_bytes:100,
 workflow_run:{id:42,head_sha:sha}},{id:2,name:'dic-ci-certificate-'+sha,
 expired:false,size_in_bytes:100,workflow_run:{id:42,head_sha:sha}}];
const fetcher=async url=>({ok:true,json:async()=>url.includes('/artifacts?')?
 {artifacts}:{workflow_runs:[run]}});
test('discovers only exact-source completed CI and both artifacts',async()=>{
 const r=await discoverCertifiedArtifacts({token:'fake',sourceSha:sha,fetcher});
 assert.equal(r.run_id,42);assert.equal(r.dist_artifact_id,1);
});
test('rejects wrong SHA, missing and expired artifacts, and bad API',async()=>{
 await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:'bad',fetcher}));
 await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:sha,
  fetcher:async()=>({ok:false})}));
 await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:sha,
  fetcher:async url=>({ok:true,json:async()=>url.includes('/artifacts?')?
   {artifacts:artifacts.map(a=>({...a,expired:true}))}:{workflow_runs:[run]}})}));
 await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:sha,
  fetcher:async url=>({ok:true,json:async()=>url.includes('/artifacts?')?
   {artifacts}:{workflow_runs:[{...run,head_sha:'b'.repeat(40)}]}})}));
});
