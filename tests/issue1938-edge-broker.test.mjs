import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createPublicKey,verify} from 'node:crypto';
import {createAdminPushBroker,PROJECT_URL,SERVICE_URL} from '../supabase/functions/dic-admin-push-broker/core.mjs';
import {endpointFingerprint} from '../src/server/admin-push.mjs';
const user='10000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000001';
const token='signup:30000000-0000-4000-8000-000000000001';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=privateKey.export({format:'jwk'});
const pub=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
const privateKeyValue=jwk.d;
const now=()=>Date.parse('2026-11-12T01:00:00Z');
const env=k=>({
 SUPABASE_URL:PROJECT_URL,
 SUPABASE_SECRET_KEYS:JSON.stringify({default:['sb','secret','synthetic_fixture_only'].join('_')}),
 SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:['sb','publishable','synthetic_fixture_only'].join('_')})
})[k];
function harness({admin=true,firstPoll=true,rows=[],tokens=[token]}={}){
 const data=new Map(rows.map(x=>[x.endpoint_hash,{...x}])),calls=[],pushes=[];
 let claimed=!firstPoll,storedKey={publicKey:pub,privateKey:privateKeyValue};
 const fetcher=async(url,options={})=>{
  calls.push({url,method:options.method||'GET',headers:options.headers});
  if(url===PROJECT_URL+'/auth/v1/user')return Response.json({id:user});
  if(url.endsWith('/rpc/dic_session_status'))return Response.json({authenticated:true,admitted:true,admin});
  if(url.endsWith('/rpc/dic_admin_push_runtime_keys'))return Response.json(storedKey);
  if(url.endsWith('/rpc/dic_admin_push_claim_poll')){const win=!claimed;claimed=true;return Response.json(win);}
  if(url.endsWith('/rpc/dic_admin_push_snapshot'))return Response.json({admin_ids:[user],tokens});
  if(url.includes('/dic_admin_push_subscriptions?')){
   const u=new URL(url),path=u.pathname;
   if(path.endsWith('dic_admin_push_subscriptions')&&(options.method||'GET')==='GET'){
    const cursor=(u.searchParams.get('endpoint_hash')||'').slice(3);
    const page=[...data.values()].sort((a,b)=>a.endpoint_hash.localeCompare(b.endpoint_hash))
     .filter(x=>!cursor||x.endpoint_hash>cursor).slice(0,50);
    return Response.json(page);
   }
   const hash=(u.searchParams.get('endpoint_hash')||'').slice(3),method=options.method||'GET';
   if(method==='DELETE'){data.delete(hash);return new Response(null,{status:204});}
   if(method==='PATCH'){Object.assign(data.get(hash),JSON.parse(options.body));return new Response(null,{status:204});}
   if(method==='POST'){const b=JSON.parse(options.body);data.set(b.endpoint_hash,b);return new Response(null,{status:204});}
  }
  if(url.startsWith('https://web.push.apple.com/')){
   pushes.push({url,method:options.method,headers:options.headers,body:options.body});
   return new Response(null,{status:201});
  }
  throw Error('Unexpected request '+url);
 };
 const broker=createAdminPushBroker({env,fetcher,now});
 const call=async spec=>broker(new Request(SERVICE_URL,{method:'POST',body:JSON.stringify(spec)}));
 return {call,calls,pushes,data};
}
const row=(i,seenTokens=[],owner=user)=>{
 const endpoint='https://web.push.apple.com/device-opaque-'+i;
 return {endpoint_hash:endpointFingerprint(endpoint),endpoint,owner_id:owner,
  seen_tokens:seenTokens,expires_at:'2090-01-01T00:00:00Z'};
};
test('unauthorized Admin manage request cannot retrieve a VAPID private key or register',async()=>{
 const h=harness({admin:false});
 for(const method of ['GET','POST','DELETE']){
  const r=await h.call({op:'manage',method,jwt:'a'.repeat(36),endpoint:'https://web.push.apple.com/opaque'});
  assert.equal(r.status,403);
 }
 assert.equal(h.data.size,0);
});
test('verified admin gets public key only; can register and opt out without keys in Netlify',async()=>{
 const h=harness();
 let r=await h.call({op:'manage',method:'GET',jwt:'a'.repeat(36)});
 assert.equal(r.status,200);
 let d=await r.json();assert.deepEqual(d,{ok:true,publicKey:pub});assert.ok(!JSON.stringify(d).includes(privateKeyValue));
 const ep='https://web.push.apple.com/opaque-device-a';
 r=await h.call({op:'manage',method:'POST',jwt:'a'.repeat(36),endpoint:ep});
 assert.equal(r.status,200);assert.equal(h.data.get(endpointFingerprint(ep)).owner_id,user);
 r=await h.call({op:'manage',method:'DELETE',jwt:'a'.repeat(36),endpoint:ep});
 assert.equal(r.status,200);assert.equal(h.data.size,0);
});
test('public cron trigger returns no member/token/endpoint, is rate-gated, and VAPID JWT is valid',async()=>{
 const h=harness({rows:[row(1)]});
 const r=await h.call({op:'poll'});assert.equal(r.status,200);
 const payload=await r.json();assert.deepEqual(payload,{ok:true});
 assert.equal(h.pushes.length,1);
 const pushed=h.pushes[0];assert.equal(pushed.body,undefined);
 assert.equal(pushed.method,'POST');
 const auth=pushed.headers.Authorization;assert.match(auth,/^vapid t=/);
 const jwt=auth.slice('vapid t='.length).split(', k=')[0];
 const [hpart,ppart,sig]=jwt.split('.');
 const claim=JSON.parse(Buffer.from(ppart,'base64url').toString());
 assert.equal(claim.aud,'https://web.push.apple.com');
 assert.equal(verify('sha256',Buffer.from(hpart+'.'+ppart),
  {key:createPublicKey(privateKey),dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')),true);
 const second=await h.call({op:'poll'});assert.equal(second.status,200);assert.equal(h.pushes.length,1);
});
test('keyset scan covers 125+ subscriptions; nonadmin device retired, no private response',async()=>{
 const rows=Array.from({length:125},(_,i)=>row(i,[token]));
 rows[100].seen_tokens=[];rows[110].owner_id=other;
 const h=harness({rows});
 const r=await h.call({op:'poll'});assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{ok:true});
 assert.equal(h.pushes.length,1);assert.equal(h.data.has(rows[110].endpoint_hash),false);
 assert.ok(h.calls.filter(x=>x.method==='GET'&&x.url.includes('endpoint_hash=gt.')).length>=2);
});
test('poll endpoint cannot accept arbitrary ops and never returns protected rows',async()=>{
 const h=harness({rows:[row(1)]});
 assert.equal((await h.call({op:'snapshot'})).status,403);
 assert.equal((await h.call({op:'poll',debug:true})).status,400);
 assert.equal((await h.call({op:'manage',method:'GET'})).status,403);
 assert.equal(h.pushes.length,0);
});
