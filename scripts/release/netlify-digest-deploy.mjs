// Netlify atomic digest deploy adapter. Never call without a consumed, authorized claim.
// Official Netlify API: POST /sites/:site/deploys with SHA1 file digest + SHA256 function digest;
// PUT required static bytes and zipped function to separate endpoints.
import {createHash} from 'node:crypto';
const SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
const API='https://api.netlify.com/api/v1';
const digest=(algorithm,bytes)=>createHash(algorithm).update(bytes).digest('hex');
export function buildDigestManifest({files,functionZip}={}){
 if(!files||typeof files!=='object'||!Buffer.isBuffer(functionZip)||functionZip.length<100||
  functionZip.subarray(0,2).toString()!=='PK')throw Error('Missing immutable function ZIP or static file map');
 const paths=Object.keys(files);
 if(!paths.includes('/index.html')||paths.length===0)throw Error('Missing app index');
 const hashes={};const byHash=new Map();
 for(const path of paths.sort()){
  if(!/^\/[a-zA-Z0-9._/-]+$/.test(path)||path.includes('//')||
   path.split('/').includes('..')||path.split('/').includes('.')||
   !Buffer.isBuffer(files[path]))throw Error('Unsafe static file or path');
  const sha=digest('sha1',files[path]);hashes[path]=sha;byHash.set(sha,files[path]);
 }
 const functionHash=digest('sha256',functionZip);
 return {manifest:{files:hashes,functions:{'coffee-url-preview':functionHash}},
  byHash,functionHash,functionZip};
}
export async function deployImmutableDigest({token,files,functionZip,ownerGrantVerified=false,
 oneUseClaimConsumed=false,allowProductionPublication=false,fetcher=fetch}={}){
 if(!ownerGrantVerified||!oneUseClaimConsumed||!allowProductionPublication||!token)
  throw Error('Immutable production deploy not authorized');
 const {manifest,byHash,functionHash}=buildDigestManifest({files,functionZip});
 const headers={Authorization:'Bearer '+token};
 const start=await fetcher(API+'/sites/'+SITE+'/deploys',{method:'POST',
  headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(manifest)});
 if(!start.ok)throw Error('Netlify digest deploy creation failed; inspect provider before retry');
 const created=await start.json();
 if(!created.id||created.site_id!==SITE||!Array.isArray(created.required)||
  !Array.isArray(created.required_functions))
  throw Error('Unverifiable deploy creation receipt; do not retry');
 for(const hash of created.required){
  if(!byHash.has(hash))throw Error('Provider requested unknown static hash');
 }
 for(const hash of created.required_functions){
  if(hash!==functionHash)throw Error('Provider requested unknown function hash');
 }
 for(const hash of [...new Set(created.required)]){
  const path=Object.keys(manifest.files).find(p=>manifest.files[p]===hash);
  const uploaded=await fetcher(API+'/deploys/'+encodeURIComponent(created.id)+'/files'+
   path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',
   headers:{...headers,'Content-Type':'application/octet-stream'},body:byHash.get(hash)});
  if(!uploaded.ok)throw Error('Static upload incomplete; inspect deploy '+created.id);
 }
 if(created.required_functions.includes(functionHash)){
  const uploaded=await fetcher(API+'/deploys/'+encodeURIComponent(created.id)+
   '/functions/coffee-url-preview?runtime=js',{method:'PUT',
   headers:{...headers,'Content-Type':'application/zip'},body:functionZip});
  if(!uploaded.ok)throw Error('Function upload incomplete; inspect deploy '+created.id);
 }
 return {status:'PROVIDER_DEPLOY_REQUESTED_NOT_VERIFIED',deploy_id:created.id,site_id:SITE,
  static_file_count:Object.keys(manifest.files).length,function_sha256:functionHash};
}
