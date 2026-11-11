import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createAdminPushPoller} from '../netlify/functions/dic-admin-push-poll.mjs';
import {endpointFingerprint} from '../src/server/admin-push.mjs';

const base='https://example.supabase.co';
const admin='10000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000001';
const token='signup:30000000-0000-4000-8000-000000000001';
const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=publicKey.export({format:'jwk'}),privateJwk=privateKey.export({format:'jwk'});
const vars={SUPABASE_URL:base,SUPABASE_SECRET_KEY:['sb','secret','synthetic_fixture_only'].join('_'),
 DIC_ADMIN_PUSH_VAPID_PUBLIC_KEY:Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url'),
 DIC_ADMIN_PUSH_VAPID_PRIVATE_KEY:privateJwk.d};
const env=k=>vars[k];
const endpoint=i=>'https://web.push.apple.com/opaque-device-'+i;
function makeRow(i,seenTokens=[token],ownerId=admin){
 const url=endpoint(i);
 return {owner_id:ownerId,endpoint:url,endpoint_hash:endpointFingerprint(url),seen_tokens:seenTokens,
  expires_at:'2090-01-01T00:00:00Z'};
}
function harness(initialRows,{tokens=[token],adminIds=[admin],pushStatuses={}}={}){
 const rows=new Map(initialRows.map(r=>[r.endpoint_hash,{...r}])),calls=[],pushes=[];
 const fetcher=async(url,options={})=>{
  calls.push({url,method:options.method||'GET'});
  if(url===base+'/rest/v1/rpc/dic_admin_push_snapshot')return Response.json({admin_ids:adminIds,tokens});
  if(url.startsWith(base+'/rest/v1/dic_admin_push_subscriptions?')){
   const u=new URL(url),hash=u.searchParams.get('endpoint_hash'),method=options.method||'GET';
   if(method==='GET'){
    const cursor=hash?.startsWith('gt.')?hash.slice(3):'';
    const page=[...rows.values()].sort((a,b)=>a.endpoint_hash.localeCompare(b.endpoint_hash))
     .filter(r=>!cursor||r.endpoint_hash>cursor).slice(0,Number(u.searchParams.get('limit')));
    return Response.json(page);
   }
   if(!hash?.startsWith('eq.'))throw Error('Mutation missing exact hash');
   const id=hash.slice(3);
   if(method==='DELETE'){rows.delete(id);return new Response(null,{status:204});}
   if(method==='PATCH'){
    if(!rows.has(id))throw Error('Updated missing subscription');
    Object.assign(rows.get(id),JSON.parse(options.body));
    return new Response(null,{status:204});
   }
  }
  if(url.startsWith('https://web.push.apple.com/')){
   assert.equal(options.method,'POST');
   assert.equal(options.body,undefined,'No private member content in Web Push payload');
   pushes.push(url);
   return new Response(null,{status:pushStatuses[url]||201});
  }
  throw Error('Unexpected sender request: '+url);
 };
 const poll=createAdminPushPoller({env,fetcher,now:()=>Date.parse('2026-11-11T19:00:00Z')});
 return {poll,rows,calls,pushes};
}

test('keyset scan inspects all 125 unchanged subscriptions on every tick without starving later pages',async()=>{
 const h=harness(Array.from({length:125},(_,i)=>makeRow(i)));
 for(let tick=0;tick<2;tick++){
  const r=await h.poll();assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true,checked:125,delivered:0,retired:0,failed:0});
 }
 assert.equal(h.pushes.length,0);
 const list=h.calls.filter(c=>c.method==='GET');
 assert.equal(list.length,6,'Three pages per run, two complete runs');
 assert.ok(list.some(c=>c.url.includes('&endpoint_hash=gt.')));
 assert.ok(list.every(c=>c.url.includes('order=endpoint_hash.asc')));
});

test('failure in earliest page cannot block new actionable tokens after subscription 50',async()=>{
 const all=Array.from({length:65},(_,i)=>makeRow(i));
 const ordered=all.sort((a,b)=>a.endpoint_hash.localeCompare(b.endpoint_hash));
 ordered[0].seen_tokens=[];ordered[60].seen_tokens=[];
 const h=harness(ordered,{pushStatuses:{[ordered[0].endpoint]:503}});
 const r=await h.poll();assert.equal(r.status,503);
 assert.deepEqual(await r.json(),{ok:false,checked:65,delivered:1,retired:0,failed:1});
 assert.deepEqual(h.pushes.sort(),[ordered[0].endpoint,ordered[60].endpoint].sort());
 assert.deepEqual(h.rows.get(ordered[0].endpoint_hash).seen_tokens,[],'Failed push remains retryable');
 assert.deepEqual(h.rows.get(ordered[60].endpoint_hash).seen_tokens,[token],'Later page successfully acknowledged');
});

test('deauthorized and gone endpoints retire without preventing later-page delivery',async()=>{
 const all=Array.from({length:62},(_,i)=>makeRow(i));
 const ordered=all.sort((a,b)=>a.endpoint_hash.localeCompare(b.endpoint_hash));
 ordered[1].owner_id=other;ordered[3].seen_tokens=[];ordered[59].seen_tokens=[];
 const h=harness(ordered,{pushStatuses:{[ordered[3].endpoint]:410}});
 const r=await h.poll();assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{ok:true,checked:62,delivered:1,retired:2,failed:0});
 assert.equal(h.rows.has(ordered[1].endpoint_hash),false);
 assert.equal(h.rows.has(ordered[3].endpoint_hash),false);
 assert.deepEqual(h.rows.get(ordered[59].endpoint_hash).seen_tokens,[token]);
 assert.ok(!h.pushes.includes(ordered[1].endpoint));
});

test('overlapping read-only scheduled scans retain stable coverage without resorting to mutable timestamps',async()=>{
 const h=harness(Array.from({length:105},(_,i)=>makeRow(i)));
 const [a,b]=await Promise.all([h.poll(),h.poll()]);
 assert.equal(a.status,200);assert.equal(b.status,200);
 assert.equal((await a.json()).checked,105);assert.equal((await b.json()).checked,105);
 assert.equal(h.pushes.length,0);
});
