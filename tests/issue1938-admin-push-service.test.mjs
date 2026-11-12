import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {generateKeyPairSync} from 'node:crypto';
import {createAdminPushHandler} from '../netlify/functions/dic-admin-push.mjs';
import {createAdminPushPoller} from '../netlify/functions/dic-admin-push-poll.mjs';
import {endpointFingerprint} from '../src/server/admin-push.mjs';

const base='https://example.supabase.co',endpoint='https://web.push.apple.com/opaque-push-device-1';
const admin='10000000-0000-4000-8000-000000000001',member='20000000-0000-4000-8000-000000000001';
const token='signup:30000000-0000-4000-8000-000000000001';
const jwt='x'.repeat(50);
const vars={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:['sb','secret','synthetic_not_a_real_token'].join('_'),
 DIC_ADMIN_PUSH_VAPID_PUBLIC_KEY:'public_test_key',
 DIC_ADMIN_PUSH_VAPID_PRIVATE_KEY:'private_test_key'};
const env=name=>vars[name];
const authRequest=(method='GET',data)=>new Request('https://app.dialincollective.com/api/admin-push',{
 method,headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},
 ...(data?{body:JSON.stringify(data)}:{})});
function apiHarness({adminRole=true,snapshot={admin_ids:[admin],tokens:[token]},userId=admin}={}){
 const calls=[];
 const handler=createAdminPushHandler({env,fetcher:async(url,options={})=>{
  calls.push({url,options});
  if(url===base+'/auth/v1/user')return Response.json({id:userId});
  if(url===base+'/rest/v1/rpc/dic_session_status')return Response.json({authenticated:true,admitted:true,admin:adminRole});
  if(url===base+'/rest/v1/rpc/dic_admin_push_snapshot')return Response.json(snapshot);
  if(url.startsWith(base+'/rest/v1/dic_admin_push_subscriptions'))return new Response('',{status:200});
  throw Error('Unexpected endpoint: '+url);
 }});
 return {handler,calls};
}
test('subscribe API refuses unauthenticated or nonadmin callers before private storage',async()=>{
 const h=apiHarness();
 const noToken=await h.handler(new Request('https://app.dialincollective.com/api/admin-push'));
 assert.equal(noToken.status,401);assert.equal(h.calls.length,0);
 const nonadmin=apiHarness({adminRole:false});
 assert.equal((await nonadmin.handler(authRequest())).status,403);
 assert.equal(nonadmin.calls.some(x=>x.url.includes('dic_admin_push_subscriptions')),false);
});
test('Admin can read only public push key; service credentials never enter response',async()=>{
 const h=apiHarness();
 const response=await h.handler(authRequest());
 assert.equal(response.status,200);
 const data=await response.json();assert.deepEqual(data,{ok:true,publicKey:'public_test_key'});
 assert.equal(JSON.stringify(data).includes(vars.SUPABASE_SECRET_KEY),false);
});
test('Register seeds existing action tokens and scopes owner to verified auth identity',async()=>{
 const h=apiHarness();
 const response=await h.handler(authRequest('POST',{endpoint,owner_id:member,email:'x@example.com'}));
 assert.equal(response.status,200);
 const insertion=h.calls.find(x=>x.url.includes('on_conflict=endpoint_hash'));
 assert.ok(insertion);const body=JSON.parse(insertion.options.body);
 assert.equal(body.owner_id,admin);assert.equal(body.endpoint_hash,endpointFingerprint(endpoint));
 assert.deepEqual(body.seen_tokens,[token]);assert.equal(body.email,undefined);
 assert.equal(insertion.options.headers.apikey,vars.SUPABASE_SECRET_KEY);
 assert.equal(insertion.options.headers.Authorization,undefined,'Modern secret key is API-only, never Bearer');
});
test('Rejects forged endpoint and unlisted service hosts before service-role writes',async()=>{
 const h=apiHarness();
 const response=await h.handler(authRequest('POST',{endpoint:'https://127.0.0.1/private'}));
 assert.equal(response.status,400);
 assert.equal(h.calls.some(x=>x.url.includes('dic_admin_push_subscriptions')),false);
});
test('Opt out deletes only the current verified administrator and requested endpoint',async()=>{
 const h=apiHarness();
 const response=await h.handler(authRequest('DELETE',{endpoint}));
 assert.equal(response.status,200);
 const removal=h.calls.find(x=>x.options?.method==='DELETE');
 assert.ok(removal.url.includes('owner_id=eq.'+admin));
 assert.ok(removal.url.includes('endpoint_hash=eq.'+endpointFingerprint(endpoint)));
});
test('Scheduled sender sends no push for already-seen tasks and removes deauthorized admins',async()=>{
 const calls=[];const subscription={owner_id:admin,endpoint,endpoint_hash:endpointFingerprint(endpoint),
  seen_tokens:[token],expires_at:'2090-01-01T00:00:00Z'};
 const run=createAdminPushPoller({env,fetcher:async(url,options={})=>{
  calls.push({url,options});
  if(url.includes('/rpc/dic_admin_push_snapshot'))return Response.json({admin_ids:[admin],tokens:[token]});
  if(url.includes('/dic_admin_push_subscriptions?select='))return Response.json([subscription]);
  throw Error('Unexpected sender write or push: '+url);
 }});
 const response=await run();assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true,checked:1,delivered:0,retired:0,failed:0});
 assert.equal(calls.filter(x=>x.url.startsWith('https://web.push.apple.com')).length,0);
 const gone=[];
 const revoked=createAdminPushPoller({env,fetcher:async(url,options={})=>{
  gone.push({url,options});
  if(url.includes('/rpc/dic_admin_push_snapshot'))return Response.json({admin_ids:[],tokens:[token]});
  if(url.includes('/dic_admin_push_subscriptions?select='))return Response.json([subscription]);
  if(options.method==='DELETE')return new Response(null,{status:204});
  throw Error('Unexpected: '+url);
 }});
 const result=await revoked();assert.equal(result.status,200);
 assert.equal(gone.some(x=>x.options.method==='DELETE'),true);
 assert.equal(gone.some(x=>x.url.startsWith('https://web.push.apple.com')),false);
});
test('Push worker displays generic text, routes clicks to Admin and preserves existing app drafts',async()=>{
 const source=readFileSync(new URL('../scripts/pwa/service-worker.template.txt',import.meta.url),'utf8');
 const js=source.replaceAll('__DIC_BUILD_ID__','mock').replaceAll('__DIC_ASSETS__','[]');
 const handlers=new Map(),notices=[],opened=[],navigation=[];
 const worker={
  location:{origin:'https://app.dialincollective.com'},
  registration:{async showNotification(title,opts){notices.push({title,opts});}},
  clients:{async matchAll(){return [{url:'https://app.dialincollective.com/',navigate:url=>navigation.push(url)}];},
   async openWindow(path){opened.push(path);}}
 };
 vm.runInNewContext(js,{self:{...worker,addEventListener:(type,fn)=>handlers.set(type,fn)},URL,caches:{},fetch(){}});
 let pending;
 handlers.get('push')({waitUntil:p=>{pending=p;}});
 await pending;
 assert.equal(notices.length,1);
 assert.equal(notices[0].title,'The Dial In Collective');
 assert.equal(notices[0].opts.body,'Administrator review required.');
 assert.doesNotMatch(JSON.stringify(notices[0]),/email|shot|password|member@/i);
 handlers.get('notificationclick')({notification:{close(){}},waitUntil:p=>{pending=p;}});
 await pending;
 assert.deepEqual(opened,['/admin.html']);assert.deepEqual(navigation,[]);
});
test('Missing server configuration fails closed: no scheduled delivery or public key',async()=>{
 const unavailable=()=>null;
 assert.equal((await createAdminPushHandler({env:unavailable}) (authRequest())).status,503);
 assert.equal((await createAdminPushPoller({env:unavailable})()).status,503);
});

// Issue #1938: keep all unshipped push test provenance inside its existing
// issue-scoped filename so READY-only source-isolated candidates can exclude it.
{
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

}
