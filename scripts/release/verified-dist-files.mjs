// Convert only already-verified immutable ZIP to exact Netlify file bytes.
import {execFileSync} from 'node:child_process';
import {buildDigestManifest} from './netlify-digest-deploy.mjs';
export function verifiedDistFiles({zipPath,functionZip,runner=execFileSync}={}){
 if(typeof zipPath!=='string'||!zipPath)throw Error('Missing verified immutable dist path');
 const stdout=runner('python3',['scripts/release/immutable-dist-to-manifest.py',zipPath],
  {encoding:'utf8',timeout:20000,maxBuffer:120*1024*1024});
 const entries=JSON.parse(stdout);
 const files=Object.fromEntries(Object.entries(entries).map(([path,value])=>{
  if(typeof value!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
   throw Error('Malformed immutable file encoding');
  return [path,Buffer.from(value,'base64')];
 }));
 const digest=buildDigestManifest({files,functionZip});
 return {files,manifest:digest.manifest,functionHash:digest.functionHash};
}
