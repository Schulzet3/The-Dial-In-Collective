import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLiveNetlify} from '../scripts/release/netlify-live-readback.mjs';
const sha='a'.repeat(40),siteId='153277f2-e19e-4862-b9a6-f2e18ccde271';
const site={id:siteId,published_deploy:{id:'deploy-1'},ssl_url:'https://sample.netlify.app',custom_domain:'app.dialincollective.com'};
const deploy={available_functions:[{n:'coffee-url-preview',r:'nodejs22.x',
 ro:[{p:'/api/coffee-preview',m:['POST']}],tr:{action:{type:'rate_limit',config:{aggregate:{keys:[{type:'ip'}]},
  rate_limit_config:{algorithm:'sliding_window',window_size:60,window_limit:12}}}}}],id:'deploy-1',site_id:siteId,state:'ready',branch:'release/production',
 context:'production',commit_ref:sha,ssl_url:'https://app.dialincollective.com'};
const fetcher=async(url)=>({ok:true,json:async()=>url.endsWith('/deploy-1')?deploy:site});
test('live provider verifier uses GET-only and exact published SHA',async()=>{
 const calls=[];
 const result=await verifyLiveNetlify({token:'fake',expectedReleaseSha:sha,fetcher:async(url,opts)=>{
  calls.push([url,opts.method]);return fetcher(url,opts);
 }});
 assert.equal(result.status,'PROVIDER_READY_CURRENT_EXACT_SHA');
 assert.equal(result.function_continuity.route,'/api/coffee-preview');
 assert.equal(result.function_continuity.rate_limit.window_limit,12);
 assert.deepEqual(calls.map(x=>x[1]),['GET','GET']);
 assert.match(calls[0][0],/sites\/153277f2/);
 await assert.rejects(verifyLiveNetlify({token:'fake',expectedReleaseSha:'b'.repeat(40),fetcher}));
 for(const available_functions of [[],[{n:'coffee-url-preview',r:'nodejs22.x',ro:[]}],
  [{n:'coffee-url-preview',r:'nodejs20.x',ro:[{p:'/api/coffee-preview',m:['POST']}]}]])
  await assert.rejects(verifyLiveNetlify({token:'fake',expectedReleaseSha:sha,
   fetcher:async url=>({ok:true,json:async()=>url.endsWith('/deploy-1')?
    {...deploy,available_functions}:site})}));
 for(const functionChange of [{tr:null},{tr:{action:{type:'rate_limit',config:{
  aggregate:{keys:[{type:'ip'}]},rate_limit_config:{algorithm:'sliding_window',
   window_size:60,window_limit:120}}}}},
  {ro:[{p:'/api/coffee-preview',m:['POST','GET']}]},
  {ro:[{p:'/api/coffee-preview',m:['POST']},{p:'/api/unapproved',m:['GET']}]},
  {ro:[{p:'/api/coffee-preview',m:['POST']},{p:'/api/coffee-preview',m:['POST']}]}]){
  await assert.rejects(verifyLiveNetlify({token:'fake',expectedReleaseSha:sha,
   fetcher:async url=>({ok:true,json:async()=>url.endsWith('/deploy-1')?
    {...deploy,available_functions:[{...deploy.available_functions[0],...functionChange}]}:site})}));
 }
 await assert.rejects(verifyLiveNetlify({token:'',expectedReleaseSha:sha,fetcher}));
 await assert.rejects(verifyLiveNetlify({token:'fake',expectedReleaseSha:sha,fetcher:async()=>({ok:false,status:403})}));
 await assert.rejects(verifyLiveNetlify({token:'fake',expectedReleaseSha:sha,fetcher:async()=>({ok:true,json:async()=>({...site,published_deploy:null,published_deploy_id:null})})}));
});
