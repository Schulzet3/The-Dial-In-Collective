import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/functions/dic-delete-member-account/index.ts',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'');
const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const OP='40000000-0000-4000-8000-000000000001';
function rig({admin=true,existing=true,deleteFails=false,preparedMode='keep',preparedComplete=false}={}){
 let handler;let userExists=existing;
 const calls=[],keys=[];
 const memberClient={
  auth:{async getUser(){calls.push('verify_user');return {data:{user:{id:ADMIN}},error:null};}},
  async rpc(name){calls.push(name);assert.equal(name,'dic_session_status');
   return {data:{authenticated:true,admitted:true,admin},error:null};}
 };
 const serviceClient={
  auth:{admin:{
   async getUserById(id){calls.push('getUserById');assert.equal(id,MEMBER);
    return userExists?{data:{user:{id}},error:null}:{data:{user:null},error:{status:404}};},
   async deleteUser(id,soft){calls.push('deleteUser');assert.equal(id,MEMBER);assert.equal(soft,false);
    if(deleteFails)return {error:{status:503}};
    userExists=false;return {error:null};}
  }},
  async rpc(name,args){calls.push(name);
   assert.equal(args.p_operation_id,OP);assert.equal(args.p_actor_id,ADMIN);
   if(name==='dic_admin_account_delete_prepare')
    return {data:preparedComplete?{ok:true,completed:true}:{ok:true,target_id:MEMBER,mode:preparedMode,phase:'prepared'},error:null};
   if(name==='dic_admin_account_delete_finish'){
    assert.equal(userExists,false,'DB must not finalize before Auth user is gone');
    return {data:{ok:true,completed:true,community_removed:preparedMode==='remove'?1:0},error:null};
   }
   throw Error('unexpected service RPC '+name);
  }
 };
 const context=vm.createContext({
  Response,JSON,URL,
  Deno:{env:{get(name){return ({SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[name];}},serve(fn){handler=fn;}},
  createClient(_url,key){keys.push(key);return key==='service'?serviceClient:memberClient;},
  async readBoundedJson(request){return request.json();}
 });
 vm.runInContext(source,context);
 const run=async({origin='https://app.dialincollective.com',token='verified',
  operation_id=OP,method='POST',extra={}}={})=>{
  const headers={origin, ...(token?{authorization:'Bearer '+token}:{})};
  const req=new Request('https://project.supabase.co/functions/v1/dic-delete-member-account',{
   method,headers,...(method==='POST'?{body:JSON.stringify({operation_id,...extra})}:{})
  });
  const response=await handler(req);
  return {status:response.status,body:await response.json()};
 };
 return {run,calls,keys};
}
test('server rejects wrong origin, missing token, wrong method, invalid operation before privileged client',async()=>{
 const x=rig();
 assert.equal((await x.run({origin:'https://evil.example'})).status,403);
 assert.equal((await x.run({token:''})).status,401);
 assert.equal((await x.run({method:'GET'})).status,405);
 assert.equal((await x.run({operation_id:'not-a-uuid'})).status,400);
 assert.deepEqual(x.keys,[]);
});
test('signed-in but nonadmin actor cannot call privileged prepare or deleteUser',async()=>{
 const x=rig({admin:false});
 const v=await x.run();
 assert.equal(v.status,403);
 assert.equal(x.keys.includes('service'),false);
 assert.equal(x.calls.includes('deleteUser'),false);
});
test('authorized account deletion checks Auth and finalizes only after GoTrue removal',async()=>{
 const x=rig({preparedMode:'remove'});
 const v=await x.run({extra:{community_mode:'keep',target_id:ADMIN}});
 assert.equal(v.status,200);
 assert.equal(v.body.completed,true);
 assert.equal(v.body.community_removed,1);
 assert.deepEqual(x.calls.filter(s=>s==='deleteUser'),['deleteUser']);
 assert.equal(x.calls.indexOf('deleteUser')<x.calls.indexOf('dic_admin_account_delete_finish'),true);
 assert.equal(x.keys.includes('service'),true);
});
test('failed GoTrue delete returns incomplete and never finalizes',async()=>{
 const x=rig({deleteFails:true});
 const v=await x.run();
 assert.equal(v.status,409);
 assert.equal(v.body.ok,false);
 assert.equal(v.body.retryable,true);
 assert.equal(x.calls.includes('dic_admin_account_delete_finish'),false);
});
test('retry safely handles previously deleted Auth user without calling deleteUser again',async()=>{
 const x=rig({existing:false});
 const v=await x.run();
 assert.equal(v.status,200);
 assert.equal(v.body.completed,true);
 assert.equal(x.calls.includes('deleteUser'),false);
 assert.equal(x.calls.includes('dic_admin_account_delete_finish'),true);
});
test('previously completed ledger operation is idempotent with zero extra Auth calls',async()=>{
 const x=rig({preparedComplete:true});
 const v=await x.run();
 assert.equal(v.status,200);
 assert.equal(v.body.completed,true);
 assert.equal(x.calls.includes('getUserById'),false);
});
