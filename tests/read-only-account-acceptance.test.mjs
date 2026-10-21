import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../scripts/qa/read-only-account-acceptance.mjs',import.meta.url),'utf8');
const run=vm.runInNewContext(source.split('// BROWSER ENTRY:')[0]+'\nrunReadOnlyAccountAcceptance;',{URL,URLSearchParams,AbortSignal});
const uid='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const token='secret-test-session-value';
const email='private-test@example.invalid';
const arrays=['setups','versions','setupPreferences','calibrations','baskets','basketVersions','library','submissions','workspaces','workspaceCoffees','shots','notes','families','recipePreferences','experiments'];
const fields=['coffee_name','roaster','release_key','release_label','release_origin','release_process','release_producer','release_variety','release_roast_level','style','observed_on','dose_g','yield_g','ratio','time_s','extraction','body','clarity','sweetness','astringency','shot_count','contributor_count'];
function fixture({role='admin',serverRole=role,leak='',expired=false,transport=false,denyStatus=403,denyCode='42501'}={}){
 const requests=[];
 const privateState=Object.fromEntries(arrays.map(k=>[k,[{id:uid,owner_id:uid,private_value:'private note text'}]]));
 privateState.preferences={owner_id:uid};
 const row=Object.fromEntries(fields.map(k=>[k,null]));row.release_key='a'.repeat(64);row.coffee_name='Public coffee';
 if(leak==='community')row.owner_id=other;
 if(leak==='email')row.coffee_name=email;
 if(leak==='personal')privateState.notes[0].owner_id=other;
 let identityCalls=0;
 const env={location:{origin:'https://app.dialincollective.com'},prompt:()=>role,AbortSignal,
  localStorage:{getItem:()=>JSON.stringify({access_token:token,expires_at:expired?0:Date.now()/1000+3600,user:{id:uid,email}})},
  async fetch(url,options){
   requests.push({url,options});if(transport)throw new Error('sensitive transport detail '+token);
   const u=new URL(url),name=u.pathname.split('/').at(-1);
   const denied=()=>({status:denyStatus,ok:false,data:{code:denyCode,message:email,details:token}});
   let r;
   if(options.headers.Authorization==='Bearer dic-invalid-nonsecret-test')r={status:401,ok:false,data:{message:'Invalid JWT'}};
   else if(!options.headers.Authorization)r=denied();
   else if(u.pathname==='/auth/v1/user'){identityCalls++;r={status:200,ok:true,data:{id:leak==='identity'&&identityCalls===2?other:uid,email}};}
   else if(name==='dic_session_status')r={status:200,ok:true,data:{authenticated:true,admitted:true,emailVerified:true,admin:serverRole==='admin'}};
   else if(name==='dic_read_personal_state')r={status:200,ok:true,data:privateState};
   else if(name==='dic_browse_community_shots')r={status:200,ok:true,data:{shots:[row],total:1,offset:0,page_size:40}};
   else if(name==='dic_my_community_outliers')r={status:200,ok:true,data:leak==='held'?[{shot_id:other}]:[]};
   else if(name==='dic_admin_dashboard')r=role==='admin'?{status:200,ok:true,data:{review_only:true,counts:{},private_test:email}}:denied();
   else if(name==='dic_admin_access_overview')r=role==='admin'?{status:200,ok:true,data:{members:[{id:other,email}],invites:[]}}:denied();
   else if(name==='community_shots')r=denied();
   else r={status:200,ok:true,data:leak==='foreign'&&name==='shots'?[{owner_id:other}]:[]};
   return {status:r.status,ok:r.ok,json:async()=>r.data};
  }};
 return {env,requests,loadConfig:async()=>({CLOUD_CONFIG:{supabaseUrl:'https://azviqqejypsefzilgonr.supabase.co',publishableKey:'public-test-key'}})};
}
test('both roles: bounded read requests, reviewed POSTs only, and no secret/record output',async()=>{
 for(const role of ['admin','member']){
  const f=fixture({role});const report=await run(f.env,f.loadConfig);
  assert.equal(report.summary.failed,0);assert.ok(report.summary.passed>25);
  const output=JSON.stringify(report);for(const secret of [uid,other,token,email,'private note text'])assert.ok(!output.includes(secret));
  assert.ok(f.requests.length<45);
  for(const {url,options}of f.requests){
   assert.equal(new URL(url).origin,'https://azviqqejypsefzilgonr.supabase.co');
   assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
   assert.ok(['GET','POST'].includes(options.method));
   if(options.method==='POST')assert.ok(['/rest/v1/rpc/dic_session_status','/rest/v1/rpc/dic_read_personal_state'].includes(new URL(url).pathname));
   assert.ok(!/issue_invite|revoke_invite|set_member_access|apply_client_change|confirm_community|commit_import|redeem_invite/.test(url));
  }
 }
});
test('foreign personal/table/held rows and schema or value leaks fail without leaking values',async()=>{
 for(const leak of ['personal','foreign','held','community','email','identity']){
  const f=fixture({leak});const report=await run(f.env,f.loadConfig);
  assert.ok(report.summary.failed>0,leak);
  const output=JSON.stringify(report);for(const secret of [uid,other,token,email])assert.ok(!output.includes(secret));
 }
});
test('wrong role and stale token stop rather than testing a different account',async()=>{
 const f=fixture({serverRole:'member'});const report=await run(f.env,f.loadConfig);
 assert.equal(report.checks.at(-1).result,'FAIL');assert.equal(f.requests.length,2);
 const expired=fixture({expired:true});await assert.rejects(run(expired.env,expired.loadConfig),/SIGN_IN_OR_REFRESH_FIRST/);assert.equal(expired.requests.length,0);
});
test('transport failures and wrong error classes are never PASS denials',async()=>{
 const f=fixture({role:'member',denyCode:'PGRST202'});const report=await run(f.env,f.loadConfig);
 assert.ok(report.summary.failed>=8);
 const t=fixture({transport:true});const failed=await run(t.env,t.loadConfig);
 assert.equal(failed.checks[0].result,'FAIL');assert.equal(failed.checks[0].error_class,'TRANSPORT_ERROR');
 assert.ok(!JSON.stringify(failed).includes(token));
});
test('wrong origin or project blocks all authenticated requests',async()=>{
 const f=fixture();f.env.location.origin='https://other.invalid';await assert.rejects(run(f.env,f.loadConfig),/WRONG_ORIGIN/);assert.equal(f.requests.length,0);
 const g=fixture();await assert.rejects(run(g.env,async()=>({CLOUD_CONFIG:{supabaseUrl:'https://other.invalid',publishableKey:'public'}})),/WRONG_PROJECT/);assert.equal(g.requests.length,0);
});
