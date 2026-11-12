import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createMemberApprovalBroker} from '../supabase/functions/dic-member-approval-broker/core.mjs';

const PROJECT='https://azviqqejypsefzilgonr.supabase.co';
const MEMBER='30000000-0000-4000-8000-000000000001';
const CLAIM='40000000-0000-4000-8000-000000000001';
const ENDPOINT='https://web.push.apple.com/test-endpoint-member-approval-123456789';
const ENDPOINT_HASH=createHash('sha256').update(ENDPOINT).digest('hex');
const keys=(()=>{
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const jwk=privateKey.export({format:'jwk'});
 return {publicKey:Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),
  Buffer.from(jwk.y,'base64url')]).toString('base64url'),privateKey:jwk.d};
})();
const defaults={SUPABASE_URL:PROJECT,SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_mock'}),
 SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_mock'}),
 RESEND_API_KEY:'re_mock_for_isolated_tests',DIC_APPROVAL_FROM_EMAIL:'approvals@dialincollective.com'};
function request(op,payload={},auth=true){
 return new Request(PROJECT+'/functions/v1/dic-member-approval-broker',{
  method:'POST',headers:{'Content-Type':'application/json',
   ...(auth?{Authorization:'Bearer '+'a'.repeat(64)}:{})},
  body:JSON.stringify({op,...payload})});
}
function fixture({status={authenticated:true,emailVerified:true,admitted:false,
 approvalState:'pending',admin:false},secrets={},claims=true,
 pushItems=[{hash:ENDPOINT_HASH,endpoint:ENDPOINT}],foreign=null}={}){
 const calls=[],receipts=[],sentEmails=[],sentPush=[],rows=[];
 const env=name=>({...defaults,...secrets})[name]??null;
 const fetcher=async(url,opts={})=>{
  calls.push({url,method:opts.method,body:opts.body,headers:opts.headers});
  if(url===PROJECT+'/auth/v1/user')return Response.json({id:MEMBER});
  if(url===PROJECT+'/rest/v1/rpc/dic_session_status')return Response.json(status);
  if(url.endsWith('/rpc/dic_admin_push_runtime_keys'))return Response.json(keys);
  if(url.endsWith('/rpc/dic_member_approval_claim_poll'))return Response.json(claims);
  if(url.endsWith('/rpc/dic_member_approval_claim')){
   const channel=JSON.parse(opts.body).p_channel;
   return Response.json([{eventId:42,claimToken:CLAIM,
    email:channel==='email'?'approved@fixture.invalid':null,
    endpoints:channel==='push'?pushItems:[]}]);
  }
  if(url.endsWith('/rpc/dic_member_approval_finish')){
   receipts.push(JSON.parse(opts.body));return Response.json(true);
  }
  if(url.startsWith(PROJECT+'/rest/v1/dic_member_approval_push_subscriptions')){
   if(opts.method==='POST'||opts.method==='PATCH'||opts.method==='DELETE'){
    rows.push({url,method:opts.method,body:opts.body});return Response.json({});
   }
   if(url.includes('select=owner_id'))return Response.json(foreign?[{owner_id:foreign}]:[]);
   return Response.json([]);
  }
  if(url==='https://api.resend.com/emails'){
   sentEmails.push({options:opts,body:JSON.parse(opts.body)});
   return Response.json({id:'email-provider-id-123456789'});
  }
  if(url===ENDPOINT){sentPush.push(opts);return Response.json({}, {status:201});}
  throw Error('Unexpected external test request: '+url);
 };
 return {broker:createMemberApprovalBroker({env,fetcher,now:()=>1794500000000}),
  calls,receipts,sentEmails,sentPush,rows};
}

test('unverified, rejected and admitted accounts cannot create pending-member push subscriptions',async()=>{
 for(const state of [
  {authenticated:true,emailVerified:false,admitted:false,approvalState:'pending'},
  {authenticated:true,emailVerified:true,admitted:false,approvalState:'rejected'},
  {authenticated:true,emailVerified:true,admitted:true,approvalState:'approved'}
 ]){
  const f=fixture({status:state});
  const response=await f.broker(request('subscribe',{endpoint:ENDPOINT}));
  assert.equal(response.status,403);
  assert.equal(f.rows.length,0);
 }
});

test('member JWT is required, Admin role cannot subscribe, and SSRF endpoints fail closed',async()=>{
 const f=fixture();assert.equal((await f.broker(request('subscribe',{endpoint:ENDPOINT},false))).status,403);
 const admin=fixture({status:{authenticated:true,emailVerified:true,admitted:true,admin:true,approvalState:'approved'}});
 assert.equal((await admin.broker(request('subscribe',{endpoint:ENDPOINT}))).status,403);
 const hostile=await f.broker(request('subscribe',{endpoint:'https://127.0.0.1/private'}));
 assert.equal(hostile.status,400);
 assert.equal(f.rows.length,0);
});

test('pending user owns an independent subscription and cannot overwrite another account endpoint',async()=>{
 const f=fixture();
 const r=await f.broker(request('subscribe',{endpoint:ENDPOINT}));
 assert.equal(r.status,200);
 assert.equal((await r.json()).subscribed,true);
 assert.equal(f.rows.length,1);
 assert.match(f.rows[0].url,/dic_member_approval_push_subscriptions/);
 assert.doesNotMatch(f.rows[0].url,/dic_admin_push_subscriptions/);
 assert.equal(JSON.parse(f.rows[0].body).owner_id,MEMBER);
 const foreign=fixture({foreign:'20000000-0000-4000-8000-000000000002'});
 assert.equal((await foreign.broker(request('subscribe',{endpoint:ENDPOINT}))).status,409);
 assert.equal(foreign.rows.length,0);
});

test('approved event sends accepted email and generic payload-free member push then independently acknowledges',async()=>{
 const f=fixture();const res=await f.broker(request('poll',{},false));
 assert.equal(res.status,200);
 assert.deepEqual(await res.json(),{ok:true,handled:2});
 assert.equal(f.sentEmails.length,1);
 assert.equal(f.sentEmails[0].options.headers['Idempotency-Key'],'dic-member-account-approved-42');
 assert.equal(f.sentEmails[0].body.to[0],'approved@fixture.invalid');
 assert.equal(f.sentPush.length,1);
 assert.equal(f.sentPush[0].body,undefined,'no member data in the push payload');
 assert.match(f.sentPush[0].headers.Authorization,/^vapid t=/);
 assert.deepEqual(f.receipts.map(r=>[r.p_channel,r.p_outcome]).sort(),
  [['email','sent'],['push','sent']]);
 assert.equal(f.calls.some(c=>c.url?.includes('/dic_admin_push_subscriptions')),false);
});

test('email credentials missing: retain email for retry; an opted-in device can still receive push',async()=>{
 const f=fixture({secrets:{RESEND_API_KEY:'',DIC_APPROVAL_FROM_EMAIL:''}});
 const res=await f.broker(request('poll',{},false));
 assert.equal(res.status,503);assert.equal((await res.json()).reason,'email_not_configured');
 assert.equal(f.sentEmails.length,0);assert.equal(f.sentPush.length,1);
 assert.deepEqual(f.receipts.map(r=>[r.p_channel,r.p_outcome]),[['push','sent']]);
});

test('no subscribed device is skipped rather than generating fabricated push delivery',async()=>{
 const f=fixture({pushItems:[]});
 assert.equal((await f.broker(request('poll',{},false))).status,200);
 assert.equal(f.sentPush.length,0);
 assert.ok(f.receipts.some(r=>r.p_channel==='push'&&r.p_outcome==='skipped'));
});
test('failed provider remains retryable and caller cannot select an email recipient/event',async()=>{
 const f=fixture({pushItems:[{hash:'not-a-hash',endpoint:ENDPOINT}]});
 assert.equal((await f.broker(request('poll',{recipient:'victim@fixture.invalid'},false))).status,400);
 assert.equal((await f.broker(request('poll',{},false))).status,503);
 assert.ok(f.receipts.some(r=>r.p_channel==='push'&&r.p_outcome==='retry'));
 assert.equal(f.sentEmails.length,1);
});
test('duplicate cron claim sends no email or push',async()=>{
 const f=fixture({claims:false});
 const res=await f.broker(request('poll',{},false));
 assert.deepEqual(await res.json(),{ok:true,handled:0});
 assert.equal(f.sentEmails.length+f.sentPush.length,0);
});

test('schema: member endpoints are service-only and only real verified Admin approval creates both receipts',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261112135900_dic_member_approval_notices.sql',import.meta.url),'utf8');
 assert.match(sql,/create trigger dic_enqueue_member_approval_notices_on_review[\s\S]*after insert on private\.dic_signup_review_events/);
 assert.match(sql,/if new\.action='approve'/);
 assert.match(sql,/new\.id,new\.member_id,'email'/);
 assert.match(sql,/new\.id,new\.member_id,'push'/);
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/revoke all on public\.dic_member_approval_push_subscriptions from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.dic_member_approval_claim\(text,integer\) to service_role/);
 assert.match(sql,/grant execute on function public\.dic_member_approval_finish\(bigint,text,uuid,text\) to service_role/);
 assert.match(sql,/for update of d skip locked/i);
 assert.match(sql,/claim_token=gen_random_uuid\(\)/);
 assert.doesNotMatch(sql,/grant (select|insert|update|delete) on public\.dic_member_approval_push_subscriptions to authenticated/i);
});
test('dedicated service worker never replaces Admin notifications or embeds account details',()=>{
 const source=readFileSync(new URL('../scripts/pwa/member-approval-worker.template.txt',import.meta.url),'utf8');
 const existing=readFileSync(new URL('../scripts/pwa/service-worker.template.txt',import.meta.url),'utf8');
 assert.match(existing,/Administrator review required/);
 assert.doesNotMatch(source,/Admin review|email|owner_id|auth\.users|service_role/i);
 let handlePush,notified=null;const self={
  addEventListener(name,handler){if(name==='push')handlePush=handler;},
  registration:{showNotification(title,options){notified={title,options};return Promise.resolve();}}
 };
 vm.runInNewContext(source,{self});
 assert.equal(typeof handlePush,'function');
 let completed;handlePush({waitUntil(p){completed=p;}});
 assert.match(notified.options.body,/account is approved/i);
 assert.equal(notified.options.data.path,'/');
 assert.equal(notified.options.tag,'dic-member-account-approved');
 return completed;
});
