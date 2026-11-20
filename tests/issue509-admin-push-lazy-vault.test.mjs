import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createAdminPushBroker,PROJECT_URL,SERVICE_URL} from '../supabase/functions/dic-admin-push-broker/core.mjs';
import {endpointFingerprint} from '../src/server/admin-push.mjs';

// #509: Synthetic-only Edge poll regression; never calls live Supabase or push providers.
const OWNER='10000000-0000-4000-8000-000000000001';
const REVOKED='20000000-0000-4000-8000-000000000001';
const TOKEN='signup:30000000-0000-4000-8000-000000000001';
const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({format:'jwk'});
const keys={publicKey:Buffer.concat([Buffer.from([4]),Buffer.from(pair.x,'base64url'),Buffer.from(pair.y,'base64url')]).toString('base64url'),privateKey:pair.d};
const now=()=>Date.parse('2026-11-20T08:00:00Z');
const env=name=>({
 SUPABASE_URL:PROJECT_URL,
 SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_synthetic_fixture_only'}),
 SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_synthetic_fixture_only'})
})[name];
const row=(id,seen_tokens=[],owner_id=OWNER)=>{
 const endpoint='https://web.push.apple.com/synthetic-device-'+id;
 return {endpoint_hash:endpointFingerprint(endpoint),endpoint,owner_id,
  seen_tokens,expires_at:'2090-01-01T00:00:00Z'};
};
function fixture({rows=[],tokens=[TOKEN],adminIds=[OWNER],vault='present',pushStatuses={}}={}){
 const store=new Map(rows.map(r=>[r.endpoint_hash,{...r}])),calls=[],pushes=[];
 const fetcher=async(url,opts={})=>{
  const method=opts.method||'GET';
  calls.push({url,method});
  if(url.endsWith('/rpc/dic_admin_push_claim_poll'))return Response.json(true);
  if(url.endsWith('/rpc/dic_admin_push_runtime_keys'))
   return vault==='error'?new Response('vault unavailable',{status:503}):
    Response.json(vault==='absent'?null:keys);
  if(url.endsWith('/rpc/dic_admin_push_snapshot'))
   return Response.json({admin_ids:adminIds,tokens});
  if(url.includes('/dic_admin_push_subscriptions?')){
   const u=new URL(url),filter=u.searchParams.get('endpoint_hash');
   if(method==='GET'){
    const cursor=filter?.startsWith('gt.')?filter.slice(3):'';
    return Response.json([...store.values()].sort((a,b)=>a.endpoint_hash.localeCompare(b.endpoint_hash))
     .filter(r=>!cursor||r.endpoint_hash>cursor).slice(0,50));
   }
   assert.ok(filter?.startsWith('eq.'));
   const hash=filter.slice(3);
   if(method==='DELETE'){store.delete(hash);return new Response(null,{status:204});}
   if(method==='PATCH'){
    assert.ok(store.has(hash));
    Object.assign(store.get(hash),JSON.parse(opts.body));
    return new Response(null,{status:204});
   }
  }
  if(url.startsWith('https://web.push.apple.com/')){
   assert.equal(method,'POST');
   assert.equal(opts.body,undefined,'Web push contains no private payload');
   pushes.push(url);
   return new Response(null,{status:pushStatuses[url]||201});
  }
  throw Error('Unexpected synthetic request: '+url);
 };
 const broker=createAdminPushBroker({env,fetcher,now});
 return {call:()=>broker(new Request(SERVICE_URL,{method:'POST',body:'{"op":"poll"}'})),
  store,calls,pushes,vaultCalls:()=>calls.filter(c=>c.url.endsWith('/rpc/dic_admin_push_runtime_keys')).length};
}
test('No-op poll and revoked subscription retire without any Vault key request even during Vault failure',async()=>{
 const current=row('a',[TOKEN]),revoked=row('b',[TOKEN],REVOKED);
 const h=fixture({rows:[current,revoked],vault:'error'});
 const res=await h.call();
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{ok:true});
 assert.equal(h.vaultCalls(),0);
 assert.equal(h.pushes.length,0);
 assert.equal(h.store.has(revoked.endpoint_hash),false);
 assert.deepEqual(h.store.get(current.endpoint_hash).seen_tokens,[TOKEN]);
});
test('Seen-token reconciliation works without Vault when latest snapshot has no active tokens',async()=>{
 const stale=row('c',[TOKEN]),h=fixture({rows:[stale],tokens:[],vault:'error'});
 assert.equal((await h.call()).status,200);
 assert.equal(h.vaultCalls(),0);assert.deepEqual(h.store.get(stale.endpoint_hash).seen_tokens,[]);
});
test('Two actionable devices share one Vault lookup and both accept signed payload-free pushes',async()=>{
 const a=row('d'),b=row('e'),h=fixture({rows:[a,b]});
 const res=await h.call();
 assert.equal(res.status,200);assert.equal(h.vaultCalls(),1);
 assert.equal(h.pushes.length,2);
 assert.deepEqual(h.store.get(a.endpoint_hash).seen_tokens,[TOKEN]);
 assert.deepEqual(h.store.get(b.endpoint_hash).seen_tokens,[TOKEN]);
 assert.equal((await h.call()).status,200);
 assert.equal(h.vaultCalls(),1,'Next no-action tick must not read Vault');
 assert.equal(h.pushes.length,2);
});
test('Vault failure during actionable push still fails closed and keeps every token retryable',async()=>{
 const a=row('f'),b=row('g'),h=fixture({rows:[a,b],vault:'error'});
 const res=await h.call();
 assert.equal(res.status,503);assert.equal(h.vaultCalls(),1);
 assert.equal(h.pushes.length,0);
 assert.deepEqual(h.store.get(a.endpoint_hash).seen_tokens,[]);
 assert.deepEqual(h.store.get(b.endpoint_hash).seen_tokens,[]);
});
test('Absent uninitialized key never acknowledges an unsent push',async()=>{
 const a=row('h'),h=fixture({rows:[a],vault:'absent'});
 const res=await h.call();
 assert.equal(res.status,200);assert.equal(h.vaultCalls(),1);
 assert.equal(h.pushes.length,0);
 assert.deepEqual(h.store.get(a.endpoint_hash).seen_tokens,[]);
});
