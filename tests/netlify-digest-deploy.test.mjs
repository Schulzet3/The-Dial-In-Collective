import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDigestManifest,deployImmutableDigest} from '../scripts/release/netlify-digest-deploy.mjs';
const files={'/index.html':Buffer.from('<html></html>'),'/css/main.css':Buffer.from('body{}')};
const functionZip=Buffer.concat([Buffer.from('PK'),Buffer.alloc(120)]);
test('manifest has SHA1 static files and SHA256 named function',()=>{
 const {manifest,functionHash}=buildDigestManifest({files,functionZip});
 assert.equal(manifest.files['/index.html'].length,40);
 assert.equal(manifest.functions['coffee-url-preview'],functionHash);
 assert.equal(functionHash.length,64);
 assert.throws(()=>buildDigestManifest({files:{'/../bad':Buffer.from('a'),...files},functionZip}));
});
test('provider digest upload preserves function and static bytes without rebuilding',async()=>{
 const {manifest,functionHash}=buildDigestManifest({files,functionZip});
 const calls=[];const receipt=await deployImmutableDigest({token:'fake',files,functionZip,
  ownerGrantVerified:true,oneUseClaimConsumed:true,allowProductionPublication:true,
  fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({
   id:'deploy-test',site_id:'153277f2-e19e-4862-b9a6-f2e18ccde271',
   required:[manifest.files['/index.html']],required_functions:[functionHash]})};}});
 assert.equal(receipt.status,'PROVIDER_DEPLOY_REQUESTED_NOT_VERIFIED');
 assert.equal(calls.length,3);
 assert.equal(calls[0].options.method,'POST');
 assert.equal(calls[1].options.body,files['/index.html']);
 assert.equal(calls[2].options.body,functionZip);
 assert.match(calls[2].url,/functions\/coffee-url-preview\?runtime=js$/);
});
test('no authorization causes zero network calls',async()=>{
 let calls=0;await assert.rejects(deployImmutableDigest({token:'fake',files,functionZip,
  fetcher:async()=>{calls++;throw Error('network');}}));
 assert.equal(calls,0);
});
test('provider unexpected function request fails closed',async()=>{
 await assert.rejects(deployImmutableDigest({token:'fake',files,functionZip,
  ownerGrantVerified:true,oneUseClaimConsumed:true,allowProductionPublication:true,
  fetcher:async()=>({ok:true,json:async()=>({id:'x',site_id:'153277f2-e19e-4862-b9a6-f2e18ccde271',required:[],required_functions:['bad']})})}));
});
