// Issue #368: source-bound, read-only CI artifact retrieval. Never publishes.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {downloadCertifiedArtifactContainers} from './download-certified-artifacts.mjs';
import {verifyReleaseArtifactReceipt} from './verify-release-artifact-receipt.mjs';
import {verifiedDistFiles} from './verified-dist-files.mjs';
const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
const REQUIRED=['approval','validate','cloud-tests','mobile-browser-qa','sql'];
const digest=b=>createHash('sha256').update(b).digest('hex');

export async function verifyExactSourceReleaseChecks({token,sourceSha,fetcher=fetch}={}){
 if(!token||!SHA.test(sourceSha||''))throw Error('Missing source-bound CI identity');
 const response=await fetcher('https://api.github.com/repos/'+REPO+
  '/commits/'+sourceSha+'/check-runs?per_page=100',{method:'GET',headers:{
   Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-source CI readback failed');
 const data=await response.json();
 if(!Number.isSafeInteger(data.total_count)||data.total_count>100||
  !Array.isArray(data.check_runs)||data.check_runs.length!==data.total_count)
  throw Error('Incomplete or unbounded exact-source CI checks');
 const latest=new Map();
 for(const check of data.check_runs){
  if(check.head_sha!==sourceSha||check.app?.slug!=='github-actions')continue;
  if(!Number.isSafeInteger(check.id)||check.id<=0)throw Error('Invalid CI check ID');
  if(!latest.has(check.name)||check.id>latest.get(check.name).id)latest.set(check.name,check);
 }
 for(const name of REQUIRED){
  const check=latest.get(name);
  if(!check||check.status!=='completed'||check.conclusion!=='success')
   throw Error('Required exact-source CI not green: '+name);
 }
 return true;
}
function checkSidecar(bytes,sidecar,name){
 const actual=digest(bytes);
 if(sidecar.toString('utf8')!==actual+'  '+name+'\n')
  throw Error('CI artifact sidecar SHA-256 mismatch: '+name);
}
export async function retrieveVerifiedReleaseBundle({token,sourceSha,fetcher=fetch,
 downloader=downloadCertifiedArtifactContainers,checkVerifier=verifyExactSourceReleaseChecks,
 runner=execFileSync}={}){
 if(!token||!SHA.test(sourceSha||''))throw Error('Missing exact source for artifact retrieval');
 if(await checkVerifier({token,sourceSha,fetcher})!==true)
  throw Error('Exact-source CI not independently verified');
 const downloaded=await downloader({token,sourceSha,fetcher});
 if(!downloaded||downloaded.source_sha!==sourceSha||
  !Number.isSafeInteger(downloaded.run_id)||downloaded.run_id<=0||
  typeof downloaded.temporary_dir!=='string'||!downloaded.temporary_dir)
  throw Error('Downloaded artifact identity not source-bound');
 try{
  const dist=join(downloaded.temporary_dir,'dist');
  const cert=join(downloaded.temporary_dir,'certificate');
  mkdirSync(dist,{recursive:true,mode:0o700});
  mkdirSync(cert,{recursive:true,mode:0o700});
  for(const [kind,path,dest] of [['dist',downloaded.dist_container_path,dist],
   ['certificate',downloaded.certificate_container_path,cert]]){
   if(typeof path!=='string'||!path)throw Error('Missing '+kind+' archive');
   runner('python3',['scripts/release/unpack-certified-artifact.py',path,dest,kind],
    {encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
  }
  const archivePath=join(dist,'dist-immutable.zip');
  const archive=readFileSync(archivePath);
  const functionZip=readFileSync(join(dist,'coffee-url-preview-function.zip'));
  checkSidecar(archive,readFileSync(join(dist,'dist-immutable.zip.sha256')),'dist-immutable.zip');
  checkSidecar(functionZip,readFileSync(join(dist,'coffee-url-preview-function.zip.sha256')),
   'coffee-url-preview-function.zip');
  const certificateBytes=readFileSync(join(cert,'CI_CERTIFICATE.json'));
  if(certificateBytes.length>128*1024)throw Error('Unbounded CI certificate');
  const certificate=JSON.parse(certificateBytes.toString('utf8'));
  const receipt=verifyReleaseArtifactReceipt({certificate,sourceSha,archive,functionArchive:functionZip,
   runId:downloaded.run_id,artifactName:'dic-production-dist-'+sourceSha,verifiedRequiredChecks:true});
  const manifest=verifiedDistFiles({zipPath:archivePath,functionZip,runner});
  if(manifest.functionHash!==receipt.immutable_function_sha256)
   throw Error('Function hash mismatch after static manifest conversion');
  return {status:'EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION',source_sha:sourceSha,
   run_id:downloaded.run_id,dist_artifact_id:downloaded.dist_artifact_id,
   certificate_artifact_id:downloaded.certificate_artifact_id,
   receipt,files:manifest.files,manifest:manifest.manifest,functionZip};
 }finally{rmSync(downloaded.temporary_dir,{recursive:true,force:true});}
}
