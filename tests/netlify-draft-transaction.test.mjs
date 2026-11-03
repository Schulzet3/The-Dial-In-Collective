import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publishCertifiedDraftTransaction,PREVIEW_FUNCTION_CONFIG} from '../scripts/release/netlify-draft-transaction.mjs';
const siteId='153277f2-e19e-4862-b9a6-f2e18ccde271',sha='a'.repeat(40),release='b'.repeat(40);
const zip=Buffer.concat([Buffer.from('PK'),Buffer.alloc(120)]);
const fnHash=createHash('sha256').update(zip).digest('hex');
const bundle={status:'EXACT_SOURCE_STATIC_FUNCTION_VERIFIED_NO_PUBLICATION',
 source_sha:sha,receipt:{source_sha:sha,ready_item_ids:['DIC-Q-1'],
 immutable_function_sha256:fnHash},files:{'/index.html':Buffer.from('<html>app</html>')},
 functionZip:zip};
const args={token:'fake',bundle,sourceSha:sha,releaseSha:release,
 approvedReadyItemIds:['DIC-Q-1'],expectedCurrentDeployId:'old',
 ownerGrantVerified:true,oneUseClaimConsumed:true,backupVerified:true,allowProductionPublication:true,
 recheckPublicationAuthority:async()=>true};
function provider({draft=true,functionRoute=true,uploadOk=true,restoreStatus=201,
 changeCurrentBeforeRestore=false}={}){
 let current='old',commit=null,restores=0,siteReads=0;
 const calls=[];
 const fetcher=async(url,options)=>{
  const method=options.method;calls.push({url,method,body:options.body});
  if(method==='GET'&&url.endsWith('/sites/'+siteId)){
   siteReads++;
   if(changeCurrentBeforeRestore&&siteReads===2)current='changed';
   return {ok:true,json:async()=>({id:siteId,published_deploy:{id:current},
    custom_domain:'app.dialincollective.com'})};
  }
  if(method==='POST'&&url.endsWith('/sites/'+siteId+'/deploys')){
   const body=JSON.parse(options.body);
   assert.equal(body.draft,true);
   assert.equal(body.branch,'release/production');
   assert.deepEqual(body.functions_config,PREVIEW_FUNCTION_CONFIG);
   return {ok:true,json:async()=>({id:'new',site_id:siteId,draft,
    required:[body.files['/index.html']],required_functions:[fnHash]})};
  }
  if(method==='PUT'&&url.includes('/files/'))return {ok:uploadOk};
  if(method==='PUT'&&url.includes('/functions/'))return {ok:uploadOk};
  if(method==='PUT'&&url.includes('commit_ref=')){commit=release;return {ok:true};}
  if(method==='GET'&&url.endsWith('/deploys/new'))return {ok:true,json:async()=>({
   id:'new',site_id:siteId,draft,state:'ready',branch:'release/production',
   context:'production',commit_ref:commit,ssl_url:'https://app.dialincollective.com',
   available_functions:functionRoute?[{n:'coffee-url-preview',r:'nodejs22.x',
    ro:[{p:'/api/coffee-preview',m:['POST']}]}]:[]})};
  if(method==='POST'&&url.endsWith('/deploys/new/restore')){
   restores++;
   if(restoreStatus===201)current='new';
   return {status:restoreStatus,json:async()=>({id:'new',site_id:siteId})};
  }
  throw Error('Unexpected mocked Netlify API '+method+' '+url);
 };
 return {fetcher,calls,getRestores:()=>restores};
}
test('authorization, queue and certified Function gates make zero provider calls',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;throw Error('should never call');};
 for(const patch of [{ownerGrantVerified:false},{oneUseClaimConsumed:false},
  {recheckPublicationAuthority:null},
  {backupVerified:false},{allowProductionPublication:false},
  {bundle:{...bundle,source_sha:'c'.repeat(40)}},
  {approvedReadyItemIds:['wrong']},
  {bundle:{...bundle,receipt:{...bundle.receipt,immutable_function_sha256:'d'.repeat(64)}}}]){
  await assert.rejects(publishCertifiedDraftTransaction({...args,...patch,fetcher}));
 }
 assert.equal(calls,0);
});
test('draft static/function upload and one restore yield exact current READY/function receipt',async()=>{
 const p=provider();
 const result=await publishCertifiedDraftTransaction({...args,fetcher:p.fetcher});
 assert.equal(result.status,'PROVIDER_READY_CURRENT_EXACT_SHA_AND_FUNCTION');
 assert.equal(result.release_sha,release);
 assert.equal(result.function_sha256,fnHash);
 assert.equal(p.getRestores(),1);
 assert.equal(p.calls.filter(x=>x.method==='POST'&&x.url.endsWith('/restore')).length,1);
 assert.equal(p.calls.filter(x=>x.method==='POST'&&x.url.endsWith('/deploys')).length,1);
 assert.equal(p.calls.filter(x=>x.method==='PUT'&&x.url.includes('/functions/')).length,1);
});
test('wrong draft, missing route, failed upload or baseline race never restores',async()=>{
 for(const opts of [{draft:false},{functionRoute:false},{uploadOk:false},
  {changeCurrentBeforeRestore:true}]){
  const p=provider(opts);
  await assert.rejects(publishCertifiedDraftTransaction({...args,fetcher:p.fetcher}));
  assert.equal(p.getRestores(),0);
 }
});
test('uncertain restore fails without retry or READY claim',async()=>{
 const p=provider({restoreStatus:503});
 await assert.rejects(publishCertifiedDraftTransaction({...args,fetcher:p.fetcher}));
 assert.equal(p.getRestores(),1);
});

test('late owner/ref/claim recheck prevents irreversible restore',async()=>{
 const p=provider();
 await assert.rejects(publishCertifiedDraftTransaction({...args,fetcher:p.fetcher,
  recheckPublicationAuthority:async()=>false}));
 assert.equal(p.getRestores(),0);
});
