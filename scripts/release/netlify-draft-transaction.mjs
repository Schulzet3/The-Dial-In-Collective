// Issue #368: draft-first immutable Netlify publication transaction.
// INERT unless exact owner grant, consumed one-use claim, verified offsite
// recovery and explicit production permission are supplied by a trusted caller.
// A single final restore is the publication event; NEVER retry uncertain writes.
import {buildDigestManifest} from './netlify-digest-deploy.mjs';
import {assertNetlifyPublishedSource} from './netlify-provider-readback.mjs';
import {assertCoffeePreviewFunctionContinuity} from './netlify-live-readback.mjs';
const SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
const API='https://api.netlify.com/api/v1/';
const SHA=/^[a-f0-9]{40}$/;
const ORIGIN='https://app.dialincollective.com';
export const PREVIEW_FUNCTION_CONFIG={
 'coffee-url-preview':{
  routes:[{pattern:'/api/coffee-preview',methods:['POST']}],
  traffic_rules:{action:{type:'rate_limit',config:{
   aggregate:{keys:[{type:'ip'}]},
   rate_limit_config:{algorithm:'sliding_window',window_size:60,window_limit:12}
  }}}
 }
};
export function assertPreviewFunction(deploy){
 assertCoffeePreviewFunctionContinuity(deploy);
 return true;
}
const publishedId=site=>site?.published_deploy?.id||site?.published_deploy_id;
export async function publishCertifiedDraftTransaction({token,bundle,sourceSha,releaseSha,
 approvedReadyItemIds,expectedCurrentDeployId,ownerGrantVerified=false,
 oneUseClaimConsumed=false,backupVerified=false,allowProductionPublication=false,
 fetcher=fetch,pause=async()=>{},recheckPublicationAuthority}={}){
 // ALL irreversible gates precede the first provider request.
 if(!token||!ownerGrantVerified||!oneUseClaimConsumed||!backupVerified||
  !allowProductionPublication||typeof recheckPublicationAuthority!=='function')
  throw Error('Atomic Netlify publication not authorized');
 if(!SHA.test(sourceSha||'')||!SHA.test(releaseSha||'')||
  bundle?.status!=='EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION'&&
  bundle?.status!=='EXACT_SOURCE_STATIC_AND_FUNCTION_BYTES_VERIFIED_NO_PUBLICATION'||
  bundle?.source_sha!==sourceSha||bundle?.receipt?.source_sha!==sourceSha||
  !Array.isArray(approvedReadyItemIds)||!approvedReadyItemIds.length||
  new Set(approvedReadyItemIds).size!==approvedReadyItemIds.length||
  JSON.stringify(approvedReadyItemIds.slice().sort())!==
   JSON.stringify(bundle?.receipt?.ready_item_ids?.slice().sort())||
  typeof expectedCurrentDeployId!=='string'||!expectedCurrentDeployId)
  throw Error('Exact source, queue scope or expected current deploy missing');
 const {manifest,byHash,functionHash,functionZip}=buildDigestManifest({
  files:bundle.files,functionZip:bundle.functionZip});
 if(functionHash!==bundle.receipt.immutable_function_sha256||
  manifest.functions['coffee-url-preview']!==functionHash)
  throw Error('Certified Netlify Function digest mismatch');
 const headers={Authorization:'Bearer '+token,Accept:'application/json'};
 const get=async path=>{
  const response=await fetcher(API+path,{method:'GET',headers});
  if(!response.ok)throw Error('Netlify GET readback failed; no retry of writes');
  return response.json();
 };
 const site=await get('sites/'+SITE);
 if(site.id!==SITE||publishedId(site)!==expectedCurrentDeployId)
  throw Error('Published Netlify baseline changed before draft');
 const payload={...manifest,draft:true,branch:'release/production',
  functions_config:PREVIEW_FUNCTION_CONFIG};
 const createdResponse=await fetcher(API+'sites/'+SITE+'/deploys',{
  method:'POST',headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify(payload)});
 if(!createdResponse.ok)throw Error('Draft creation uncertain; inspect provider, never retry');
 const created=await createdResponse.json();
 if(!created.id||created.site_id!==SITE||created.draft!==true||
  !Array.isArray(created.required)||!Array.isArray(created.required_functions))
  throw Error('Provider did not confirm a safe draft; do not retry');
 if(created.required.some(h=>!byHash.has(h))||
  created.required_functions.some(h=>h!==functionHash))
  throw Error('Provider requested unknown certified file/function hash');
 for(const h of new Set(created.required)){
  const path=Object.keys(manifest.files).find(p=>manifest.files[p]===h);
  const response=await fetcher(API+'deploys/'+encodeURIComponent(created.id)+
   '/files'+path.split('/').map(encodeURIComponent).join('/'),{
    method:'PUT',headers:{...headers,'Content-Type':'application/octet-stream'},body:byHash.get(h)});
  if(!response.ok)throw Error('Draft static upload incomplete; no publication');
 }
 if(created.required_functions.includes(functionHash)){
  const response=await fetcher(API+'deploys/'+encodeURIComponent(created.id)+
   '/functions/coffee-url-preview?runtime=js',{method:'PUT',
   headers:{...headers,'Content-Type':'application/zip'},body:functionZip});
  if(!response.ok)throw Error('Draft function upload incomplete; no publication');
 }
 let draft;
 for(let i=0;i<5;i++){
  draft=await get('deploys/'+encodeURIComponent(created.id));
  if(draft.state==='ready')break;
  if(!['preparing','prepared','uploading','uploaded','processing','processed'].includes(draft.state))
   throw Error('Draft did not reach READY; no publication');
  await pause();
 }
 if(draft?.state!=='ready'||draft.draft!==true||draft.site_id!==SITE)
  throw Error('Draft not independently READY; no publication');
 assertPreviewFunction(draft);
 // Netlify's documented metadata update supports commit_ref as a query.
 // A draft is not live; verify the exact release SHA before final restore.
 const update=await fetcher(API+'sites/'+SITE+'/deploys/'+encodeURIComponent(created.id)+
  '?commit_ref='+releaseSha,{method:'PUT',headers});
 if(!update.ok)throw Error('Draft commit_ref update uncertain; no publication');
 const bound=await get('deploys/'+encodeURIComponent(created.id));
 if(bound.id!==created.id||bound.commit_ref!==releaseSha||bound.draft!==true||
  bound.state!=='ready'||bound.branch!=='release/production')
  throw Error('Draft exact release SHA not confirmed; no publication');
 assertPreviewFunction(bound);
 const before=await get('sites/'+SITE);
 if(before.id!==SITE||publishedId(before)!==expectedCurrentDeployId)
  throw Error('Published baseline changed during draft; no publication');
 if(await recheckPublicationAuthority({sourceSha,releaseSha,expectedCurrentDeployId})!==true)
  throw Error('Source refs, owner grant or consumed claim changed before restore');
 // ONE irreversible publication request. Never retry after an uncertain result.
 const restored=await fetcher(API+'sites/'+SITE+'/deploys/'+encodeURIComponent(created.id)+
  '/restore',{method:'POST',headers});
 if(restored.status!==201)throw Error('Restore outcome uncertain; inspect provider, never retry');
 const restoredBody=await restored.json();
 if(restoredBody.id!==created.id||restoredBody.site_id!==SITE)
  throw Error('Restore receipt mismatch; inspect provider, never retry');
 const finalSite=await get('sites/'+SITE);
 const finalDeploy=await get('deploys/'+encodeURIComponent(created.id));
 assertPreviewFunction(finalDeploy);
 const project={id:finalSite.id,_enrichedFields:{
  currentDeploy:{state:publishedId(finalSite)===created.id?'current':'stale',
   currentDeploy:{id:publishedId(finalSite),state:finalDeploy.state}},
  urls:{primarySiteUrl:finalSite.custom_domain?'https://'+finalSite.custom_domain:
   (finalSite.ssl_url||finalSite.url)}}};
 const receipt=assertNetlifyPublishedSource({deploy:finalDeploy,project,
  expectedReleaseSha:releaseSha,expectedDeployId:created.id});
 if(receipt.production_origin!==ORIGIN)throw Error('Wrong production origin');
 return {...receipt,status:'PROVIDER_READY_CURRENT_EXACT_SHA_AND_FUNCTION',
  source_sha:sourceSha,function_sha256:functionHash,publication_count:1};
}
