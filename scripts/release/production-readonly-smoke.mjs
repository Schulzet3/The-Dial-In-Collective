// Read-only hosted smoke. Never signs in, creates members, or writes production data.
// Netlify deployment SHA/readiness must be verified separately against provider receipts.
const allowedOrigin='https://app.dialincollective.com';
export const smokePaths=['/','/cloud.html','/manifest.webmanifest'];
export async function smoke({origin=allowedOrigin,fetchImpl=fetch,paths=smokePaths}={}){
 if(origin!==allowedOrigin)throw Error('Unapproved production origin');
 const results=[];
 for(const path of paths){
  if(!smokePaths.includes(path))throw Error('Unapproved read-only smoke path');
  const response=await fetchImpl(origin+path,{method:'GET',redirect:'error',
   headers:{'accept':'text/html,application/manifest+json'},signal:AbortSignal.timeout(12000)});
  const contentType=response.headers.get('content-type')||'';
  const expectedContentType=path==='/manifest.webmanifest'
   ? /^application\/(?:manifest\+json|json)(?:\s*;|$)/i
   : /^text\/html(?:\s*;|$)/i;
  if(!response.ok||!expectedContentType.test(contentType))
   throw Error('Production smoke failed '+path+' status='+response.status+' type='+contentType);
  const body=await response.text();
  if(!body.trim()||body.length>2_000_000)throw Error('Production smoke invalid body '+path);
  results.push({path,status:response.status,content_type:contentType,bytes:body.length});
 }
 return {origin,checks:results,read_only:true,provider_deploy_sha_verified:false};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 smoke().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
