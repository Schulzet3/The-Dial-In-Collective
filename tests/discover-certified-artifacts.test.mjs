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
 {total_count:artifacts.length,artifacts}:{total_count:1,workflow_runs:[run]}});
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
   {total_count:artifacts.length,artifacts:artifacts.map(a=>({...a,expired:true}))}:{total_count:1,workflow_runs:[run]}})}));
 await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:sha,
  fetcher:async url=>({ok:true,json:async()=>url.includes('/artifacts?')?
   {total_count:artifacts.length,artifacts}:{total_count:1,workflow_runs:[{...run,head_sha:'b'.repeat(40)}]}})}));
});

test('rejects truncated, oversized and malformed GitHub run/artifact pages before trusting uniqueness',async()=>{
 const scenarios=[
  {runs:{total_count:2,workflow_runs:[run]}},
  {runs:{total_count:101,workflow_runs:[run]}},
  {runs:{workflow_runs:[run]}},
  {runs:{total_count:1,workflow_runs:'bad'}},
  {artifacts:{total_count:3,artifacts}},
  {artifacts:{total_count:101,artifacts}},
  {artifacts:{artifacts}},
  {artifacts:{total_count:2,artifacts:[artifacts[0]]}}
 ];
 for(const scenario of scenarios){
  const fetcher=async url=>({ok:true,json:async()=>url.includes('/artifacts?')?
   (scenario.artifacts||{total_count:2,artifacts}):
   (scenario.runs||{total_count:1,workflow_runs:[run]})});
  await assert.rejects(discoverCertifiedArtifacts({token:'fake',sourceSha:sha,fetcher}),
   /Incomplete or unbounded/);
 }
});
