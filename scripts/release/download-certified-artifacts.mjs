// Download exact discovered GitHub Actions archives into a temporary directory.
// GitHub artifact archives are containers; their members remain untrusted until
// the independent source-bound CI certificate and SHA-256 validation succeed.
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverCertifiedArtifacts} from './discover-certified-artifacts.mjs';
const REPO='Schulzet3/The-Dial-In-Collective';
export async function downloadCertifiedArtifactContainers({token,sourceSha,fetcher=fetch,
 discover=discoverCertifiedArtifacts}={}){
 const found=await discover({token,sourceSha,fetcher});
 const dir=mkdtempSync(join(tmpdir(),'dic-certified-ci-'));
 try{
  const outputs={};
  for(const [kind,id] of [['dist',found.dist_artifact_id],['certificate',found.certificate_artifact_id]]){
   if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid exact-source artifact ID');
   const response=await fetcher('https://api.github.com/repos/'+REPO+
    '/actions/artifacts/'+id+'/zip',{method:'GET',headers:{
     Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'follow'});
   if(!response.ok)throw Error('Certified artifact container download failed');
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length<4||bytes.length>120*1024*1024||
    bytes.subarray(0,2).toString()!=='PK')throw Error('Unsafe artifact container');
   const path=join(dir,kind+'-artifact.zip');
   writeFileSync(path,bytes,{flag:'wx',mode:0o600});
   outputs[kind+'_container_path']=path;
  }
  return {...found,...outputs,temporary_dir:dir,
   status:'CI_ARTIFACT_CONTAINERS_DOWNLOADED_CONTENT_NOT_YET_VERIFIED'};
 }catch(e){rmSync(dir,{recursive:true,force:true});throw e;}
}
