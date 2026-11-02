import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {retrieveVerifiedReleaseBundle,verifyExactSourceReleaseChecks} from '../scripts/release/retrieve-certified-release-bundle.mjs';
const sha='a'.repeat(40),hash=b=>createHash('sha256').update(b).digest('hex');
const zip=files=>execFileSync('python3',['-c',
 'import sys,json,base64,zipfile; d=json.load(sys.stdin); z=zipfile.ZipFile(sys.stdout.buffer,"w",compression=zipfile.ZIP_DEFLATED); [z.writestr(k,base64.b64decode(v)) for k,v in d.items()]; z.close()'],{
 input:JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,v.toString('base64')]))),
 timeout:15000,maxBuffer:2*1024*1024});
const archive=zip({'index.html':Buffer.from('<html>verified app</html>')});
const functionZip=zip({'coffee-url-preview.mjs':Buffer.from('export default async function preview() { return new Response("ok") }')});
const cert={schema_version:4,kind:'DIC_CI_SOURCE_CERTIFICATE_NOT_RELEASE_APPROVAL',
 source_sha:sha,batch_status:'CERTIFIED_READY_SOURCE',strict_source_isolation_passed:true,
 isolation_errors:[],assessed_ready_item_ids:['DIC-Q-1'],queue_ready_item_ids:['DIC-Q-1'],
 github_run_id:42,immutable_artifact_name:'dic-production-dist-'+sha,
 immutable_function_name:'coffee-url-preview-function.zip',
 immutable_artifact_sha256:hash(archive),immutable_function_sha256:hash(functionZip)};
const sidecar=(b,name)=>Buffer.from(hash(b)+'  '+name+'\n');
function fixture({certificate=cert,distHash=sidecar(archive,'dist-immutable.zip'),
 functionHash=sidecar(functionZip,'coffee-url-preview-function.zip'),extra={}}={}){
 let folder;
 return {download:async()=>{
  folder=mkdtempSync(join(tmpdir(),'dic-certified-ci-'));
  writeFileSync(join(folder,'dist.zip'),zip({'dist-immutable.zip':archive,
   'dist-immutable.zip.sha256':distHash,'coffee-url-preview-function.zip':functionZip,
   'coffee-url-preview-function.zip.sha256':functionHash,...extra}));
  writeFileSync(join(folder,'cert.zip'),zip({'CI_CERTIFICATE.json':Buffer.from(JSON.stringify(certificate))}));
  return {source_sha:sha,run_id:42,dist_artifact_id:1,certificate_artifact_id:2,
   temporary_dir:folder,dist_container_path:join(folder,'dist.zip'),
   certificate_container_path:join(folder,'cert.zip')};
 },folder:()=>folder};
}
test('requires five exact-source latest completed GitHub Actions checks',async()=>{
 const checks=['approval','validate','cloud-tests','mobile-browser-qa','sql'].map((name,i)=>({
  id:i+1,name,head_sha:sha,app:{slug:'github-actions'},status:'completed',conclusion:'success'}));
 const fetcher=async()=>({ok:true,json:async()=>({total_count:checks.length,check_runs:checks})});
 assert.equal(await verifyExactSourceReleaseChecks({token:'fake',sourceSha:sha,fetcher}),true);
 await assert.rejects(verifyExactSourceReleaseChecks({token:'fake',sourceSha:sha,
  fetcher:async()=>({ok:true,json:async()=>({total_count:6,check_runs:[...checks,
   {...checks[0],id:99,status:'in_progress'}]})})}));
 await assert.rejects(verifyExactSourceReleaseChecks({token:'fake',sourceSha:sha,
  fetcher:async()=>({ok:true,json:async()=>({total_count:101,check_runs:checks})})}));
});
test('unpacks, verifies static/function and cleans temporary archives',async()=>{
 const f=fixture();
 const r=await retrieveVerifiedReleaseBundle({token:'fake',sourceSha:sha,
  checkVerifier:async()=>true,downloader:f.download});
 assert.match(r.status,/NO_PUBLICATION/);
 assert.equal(r.manifest.functions['coffee-url-preview'],hash(functionZip));
 assert.equal(r.files['/index.html'].toString(),'<html>verified app</html>');
 assert.equal(existsSync(f.folder()),false);
});
test('tampered sidecars, certificate or extra archive members fail closed and clean up',async()=>{
 for(const opts of [{distHash:sidecar(Buffer.from('bad'),'dist-immutable.zip')},
  {functionHash:sidecar(Buffer.from('bad'),'coffee-url-preview-function.zip')},
  {certificate:{...cert,source_sha:'b'.repeat(40)}},
  {extra:{'surprise.txt':Buffer.from('bad')}}]){
  const f=fixture(opts);
  await assert.rejects(retrieveVerifiedReleaseBundle({token:'fake',sourceSha:sha,
   checkVerifier:async()=>true,downloader:f.download}));
  assert.equal(existsSync(f.folder()),false);
 }
});
test('unverified CI stops before any artifact download',async()=>{
 let calls=0;
 await assert.rejects(retrieveVerifiedReleaseBundle({token:'fake',sourceSha:sha,
  checkVerifier:async()=>false,downloader:async()=>{calls++;}}));
 assert.equal(calls,0);
});

test('invalid downloaded source/run identity cleans downloaded private archive containers',async()=>{
 for(const patch of [{source_sha:'b'.repeat(40)},{run_id:0}]){
  const f=fixture();
  await assert.rejects(retrieveVerifiedReleaseBundle({token:'fake',sourceSha:sha,
   checkVerifier:async()=>true,downloader:async()=>({...await f.download(),...patch})}),
   /identity not source-bound/);
  assert.equal(existsSync(f.folder()),false);
 }
});
test('untrusted temp path cannot be extracted into or recursively removed',async()=>{
 const unrelated=mkdtempSync(join(tmpdir(),'unrelated-data-'));
 try{
  await assert.rejects(retrieveVerifiedReleaseBundle({token:'fake',sourceSha:sha,
   checkVerifier:async()=>true,downloader:async()=>({source_sha:sha,run_id:42,
    temporary_dir:unrelated})}),/Unsafe artifact temporary directory/);
  assert.equal(existsSync(unrelated),true);
 }finally{rmSync(unrelated,{recursive:true,force:true});}
});
