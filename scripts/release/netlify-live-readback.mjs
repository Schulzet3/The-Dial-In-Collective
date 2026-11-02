// Read-only Netlify API postflight: current deploy, branch, SHA, site and hostname.
// Uses GET only. Never creates or modifies a deployment.
import {assertNetlifyPublishedSource} from './netlify-provider-readback.mjs';
const SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
export async function verifyLiveNetlify({token,expectedReleaseSha,fetcher=fetch}={}){
 if(!token||typeof token!=='string')throw Error('NETLIFY_AUTH_TOKEN missing: cannot verify live publication');
 if(!/^[a-f0-9]{40}$/.test(expectedReleaseSha||''))throw Error('Expected release SHA missing');
 const get=async path=>{
  const response=await fetcher('https://api.netlify.com/api/v1/'+path,{
   method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
  if(!response.ok)throw Error('Netlify readback HTTP '+response.status);
  return response.json();
 };
 const site=await get('sites/'+SITE);
 const currentId=site.published_deploy?.id||site.published_deploy_id;
 if(!currentId)throw Error('Netlify has no published deployment ID');
 const deploy=await get('deploys/'+encodeURIComponent(currentId));
 const project={id:site.id,_enrichedFields:{
  currentDeploy:{state:'current',currentDeploy:{id:currentId,state:deploy.state}},
  urls:{primarySiteUrl:site.custom_domain?'https://'+site.custom_domain:(site.ssl_url||site.url)}}};
 return assertNetlifyPublishedSource({deploy,project,expectedReleaseSha,expectedDeployId:currentId});
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 verifyLiveNetlify({token:process.env.NETLIFY_AUTH_TOKEN,
  expectedReleaseSha:process.env.DIC_EXPECTED_RELEASE_SHA})
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{console.error('Netlify postflight denied: '+e.message);process.exitCode=1;});
}
