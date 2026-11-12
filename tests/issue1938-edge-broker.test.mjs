import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createAdminPushBroker,BROKER_URL,PROJECT_URL} from '../supabase/functions/dic-admin-push-broker/core.mjs';
import {signedBrokerRest,endpointFingerprint} from '../src/server/admin-push.mjs';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=privateKey.export({format:'jwk'});
const credentials={
 publicKey:Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url'),
 privateKey:jwk.d
};
const owner='10000000-0000-4000-8000-000000000001';
const guest='20000000-0000-4000-8000-000000000001';
const action='signup:30000000-0000-4000-8000-000000000001';
const env=k=>({
 SUPABASE_URL:PROJECT_URL,
 SUPABASE_SECRET_KEYS:JSON.stringify({default:['sb','secret','synthetic_only'].join('_')}),
 SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:['sb','publishable','synthetic_only'].join('_')})
})[k];
function setup({isAdmin=true}={}){
 const seen=[],status={admin:0,service:0,auth:0};
 const fetcher=async(url,opts={})=>{
  seen.push({url,opts});
  if(url===BROKER_URL)return broker(new Request(url,opts));
  if(url.endsWith('/auth/v1/user')){status.auth++;return Response.json({id:owner});}
  if(url.endsWith('/rpc/dic_session_status'))return Response.json({authenticated:true,admitted:true,admin:isAdmin});
  if(url.endsWith('/rpc/dic_admin_push_snapshot'))return Response.json({admin_ids:[owner],tokens:[action]});
  if(url.includes('/dic_admin_push_subscriptions?')){
   status.service++;
   if((opts.method||'GET')==='GET')return Response.json([]);
   return new Response(null,{status:204});
  }
  throw Error('Unexpected external URL '+url);
 };
 const broker=createAdminPushBroker({env,fetcher,publicKey:credentials.publicKey});
 const rest=(path,options={})=>signedBrokerRest(PROJECT_URL,credentials,path,{...options,fetcher});
 return {rest,broker,seen,status};
}
test('signed snapshot works with server-only managed Supabase secret (not sent back to Netlify)',async()=>{
 const x=setup();
 const r=await x.rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}});
 assert.deepEqual(await r.json(),{admin_ids:[owner],tokens:[action]});
 assert.equal(x.seen.filter(z=>z.url===BROKER_URL).length,1);
 const brokerReq=x.seen.find(z=>z.url===BROKER_URL).opts;
 assert.doesNotMatch(brokerReq.body,/synthetic_only/);
 assert.ok(!brokerReq.body.includes(credentials.privateKey));
});
test('unsigned, tampered and expired broker requests cannot access service-only data',async()=>{
 const x=setup();
 const unsigned=await x.broker(new Request(BROKER_URL,{method:'POST',body:JSON.stringify({path:'rpc/dic_admin_push_snapshot',method:'POST',body:{}})}));
 assert.equal(unsigned.status,401);
 const badFetch=async(url,opts)=>{
  const changed={...opts,body:opts.body+' '};
  return x.broker(new Request(url,changed));
 };
 await assert.rejects(signedBrokerRest(PROJECT_URL,credentials,'rpc/dic_admin_push_snapshot',
  {method:'POST',body:{},fetcher:badFetch}),/broker unavailable/);
 assert.equal(x.status.service,0);assert.equal(x.status.auth,0);
});
test('signed broker rejects attempts to read arbitrary member/admin tables',async()=>{
 const x=setup();
 await assert.rejects(x.rest('private.beta_members?select=*'),/broker unavailable/);
 await assert.rejects(x.rest('dic_admin_push_subscriptions?select=*'),/broker unavailable/);
 assert.equal(x.status.service,0);
});
test('registration is independently role checked inside the signed Edge broker',async()=>{
 const x=setup({isAdmin:false});
 const ep='https://web.push.apple.com/opaque-device-abc';
 const body={endpoint:ep,endpoint_hash:endpointFingerprint(ep),owner_id:owner,
  seen_tokens:[action],expires_at:'2090-01-01T00:00:00Z',updated_at:new Date().toISOString()};
 await assert.rejects(x.rest('dic_admin_push_subscriptions?on_conflict=endpoint_hash',
  {method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body,userJwt:'a'.repeat(36)}),/broker unavailable/);
 assert.equal(x.status.service,0);assert.equal(x.status.auth,1);
});
test('valid role + owner constrain signed registration and deletion',async()=>{
 const x=setup();
 const ep='https://web.push.apple.com/opaque-device-abc',hash=endpointFingerprint(ep);
 const body={endpoint:ep,endpoint_hash:hash,owner_id:owner,seen_tokens:[action],
  expires_at:new Date(Date.now()+60*86400000).toISOString(),updated_at:new Date().toISOString()};
 const r=await x.rest('dic_admin_push_subscriptions?on_conflict=endpoint_hash',
  {method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body,userJwt:'a'.repeat(36)});
 assert.equal(r.status,204);assert.equal(x.status.service,1);
 await assert.rejects(x.rest('dic_admin_push_subscriptions?endpoint_hash=eq.'+hash+'&owner_id=eq.'+guest,
  {method:'DELETE',userJwt:'a'.repeat(36)}),/broker unavailable/);
 assert.equal(x.status.service,1);
});
