import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {renderAdminAccessPanel,renderAdminDashboard,renderAdminDenied} from '../site/admin/view.js';
import {e} from '../site/lib/ui.js';
import {isAccessDenied} from '../site/cloud/client.js';

const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const INVITE='30000000-0000-4000-8000-000000000001';
const SECRET='dic-'+('a'.repeat(64));
const state={
 invites:[{id:INVITE,label:'First Group',status:'active',created_at:'2026-10-18',uses:0,max_uses:1,expires_at:null}],
 invites_total:1,
 members:[{id:ADMIN,email:'admin@fixture.invalid',admin:true,enabled:true},
  {id:MEMBER,email:'member@fixture.invalid',admin:false,enabled:true}],
 members_total:2
};
test('admin code issue list is metadata-only and existing admin cannot be disabled from UI',()=>{
 const html=renderAdminAccessPanel(state);
 assert.match(html,/Beta Invitations/);
 assert.match(html,/Never expires/);
 assert.match(html,/One code admits one verified account, once/);
 assert.doesNotMatch(html,/id="admin-invite-uses"|Up to 5 people|Reusable until revoked/);
 assert.match(html,/Administrator · Permanent access/);
 assert.match(html,/Protected/);
 assert.match(html,/data-action="remove-member"/);
 assert.doesNotMatch(html,/data-id="10000000-0000-4000-8000-000000000001"/);
 assert.doesNotMatch(html,/dic-[a-f0-9]{64}/,'Plaintext invite may not be in admin listing');
 assert.doesNotMatch(html,/type="password"/);
});
test('secret appears only when freshly returned by issuance, not upon subsequent overview',()=>{
 const issued={id:INVITE,invite_code:SECRET};
 const html=renderAdminDashboard({counts:{},queue:[]},state,issued);
 assert.match(html,/New Invitation Code/);
 assert.match(html,new RegExp(SECRET));
 assert.match(html,/cannot be recovered/);
 const later=renderAdminDashboard({counts:{},queue:[]},state,null);
 assert.doesNotMatch(later,new RegExp(SECRET));
 assert.match(later,/Existing Codes/);
});
test('every operator-controlled label/email is escaped, not executable markup',()=>{
 const hostile={...state,
  invites:[{...state.invites[0],label:'<img src=x onerror=alert(1)>'}],
  members:[{...state.members[1],email:'<svg/onload=alert(2)>'}]};
 const html=renderAdminAccessPanel(hostile,{invite_code:'<script>alert(3)</script>'});
 assert.doesNotMatch(html,/<img|<script>|<svg/);
 assert.match(html,/&lt;img/);assert.match(html,/&lt;svg/);assert.match(html,/&lt;script/);
});
test('removed member retains identity and restore access control, admin stays protected',()=>{
 const html=renderAdminAccessPanel({...state,members:[
  state.members[0],{...state.members[1],enabled:false}]});
 assert.match(html,/data-action="restore-member"/);
 assert.match(html,/Access removed · Personal history retained/);
 assert.match(html,/Administrator · Permanent access/);
 assert.doesNotMatch(html,/Delete Account|Delete Data/);
});
test('no direct client-side table insert, privileged access only via member-gated RPC',()=>{
 const js=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261019041452_dic_admin_beta_invitation_controls.sql',import.meta.url),'utf8');
 assert.match(js,/sdk\.auth\.getUser\(\)/);
 assert.match(js,/dic_session_status/);
 assert.match(js,/dic_admin_issue_invite/);
 assert.match(js,/dic_admin_revoke_invite/);
 assert.match(js,/dic_admin_set_member_access/);
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem|\.from\('beta_invites'\)/);
 assert.match(sql,/private\.is_admin\(\)/);
 assert.match(sql,/public\.dic_admin_issue_invite/);
 assert.match(sql,/revoke all on function/);
 assert.match(sql,/to authenticated/);
 assert.match(sql,/expires_at,max_uses/);
 assert.match(sql,/clean_label,actor,null,1\)/);
 assert.doesNotMatch(sql,/dic_admin_issue_invite\(text,integer\)|p_max_uses/);
 assert.match(sql,/Administrator accounts cannot be removed here/);
 assert.doesNotMatch(sql,/delete from auth\.users|drop table|drop policy/);
});

const source=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'')
 .replace(/start\(\);\s*$/,'globalThis.started=start();');
async function flush(){for(let i=0;i<32;i++)await Promise.resolve();}
function boot(){
 const calls=[],events={};
 let authChange,role={authenticated:true,admitted:true,admin:true};
 const root={
  innerHTML:'',
  addEventListener(name,fn){events[name]=fn;},
  querySelector(sel){
   if(sel==='#admin-action-notice'&&this.innerHTML.includes('id="admin-action-notice"'))
    return {set textContent(message){root.lastActionMessage=message;}};
   return null;
  }
 };
 const sdk={
  auth:{
   onAuthStateChange(fn){authChange=fn;return {data:{subscription:{unsubscribe(){}}}};},
   async getUser(){return {data:{user:{id:ADMIN}}};}
  },
  from(){return {select:()=>({eq:()=>({async maybeSingle(){return {data:{theme:'system'}};}})})};},
  async rpc(name,args){
   calls.push({name,args});
   if(name==='dic_session_status')return {data:role};
   if(name==='dic_admin_dashboard')return {data:{counts:{active_accounts:2},queue:[],queue_total:0}};
   if(name==='dic_admin_access_overview')return {data:structuredClone(state)};
   if(name==='dic_admin_records')return {error:{code:'PGRST202',message:'Detailed record RPC is not yet deployed'}};
   if(name==='dic_admin_issue_invite')return {data:{ok:true,id:INVITE,invite_code:SECRET}};
   if(name==='dic_admin_revoke_invite')return {data:{ok:true,revoked:true}};
   if(name==='dic_admin_set_member_access')return {data:{ok:true,enabled:args.p_enabled}};
   throw Error('Unexpected RPC '+name);
  }
 };
 const clipboard=[];
 const context=vm.createContext({
  document:{querySelector:s=>s==='#admin-root'?root:null},
  supabase:{createClient:()=>sdk},
  CLOUD_CONFIG:{enabled:true},
  secureOrigin(){},applyAppearance(){},readAppearance(){return 'system';},
  renderAdminDashboard,renderAdminDenied,e,isAccessDenied,
  navigator:{clipboard:{async writeText(s){clipboard.push(s);}}},
  confirm:()=>true
 });
 vm.runInContext(source,context);
 return {root,calls,events,clipboard,done:context.started,
  signOut(){authChange('SIGNED_OUT',null);},
  switchAccount(){authChange('SIGNED_IN',{user:{id:MEMBER}});},
  setRole(value){role=value;}
 };
}
test('admin can issue and copy a code once, refreshing clears it; no code in list',async()=>{
 const b=boot();await b.done;
 assert.match(b.root.innerHTML,/Beta Invitations/);
 assert.match(b.root.innerHTML,/Administrator · Permanent access/);
 const form={
  id:'admin-invite-form',
  elements:{namedItem(name){return {value:name==='label'?'First tester':''};}}
 };
 b.events.submit({target:form,preventDefault(){}});
 await flush();
 assert.match(b.root.innerHTML,new RegExp(SECRET));
 assert.deepEqual(JSON.parse(JSON.stringify(b.calls.find(x=>x.name==='dic_admin_issue_invite').args)),{p_label:'First tester'});
 assert.doesNotMatch(b.root.innerHTML,/id="admin-invite-uses"/);
 b.events.click({target:{closest(){return {dataset:{action:'copy-invite'}};}}});
 await flush();
 assert.deepEqual(b.clipboard,[SECRET]);
 b.events.click({target:{closest(){return {dataset:{},id:'admin-refresh'};}}});
 await flush();
 assert.doesNotMatch(b.root.innerHTML,new RegExp(SECRET));
 assert.match(b.root.innerHTML,/Existing Codes/);
});
test('member removal/restoration and invitation revocation require RPC, then refresh',async()=>{
 const b=boot();await b.done;
 b.events.click({target:{closest(){return {dataset:{action:'remove-member',id:MEMBER}};}}});
 await flush();
 const removed=b.calls.find(x=>x.name==='dic_admin_set_member_access').args;
 assert.equal(removed.p_member_id,MEMBER);
 assert.equal(removed.p_enabled,false);
 b.events.click({target:{closest(){return {dataset:{action:'restore-member',id:MEMBER}};}}});
 await flush();
 assert.equal(b.calls.filter(x=>x.name==='dic_admin_set_member_access').at(-1).args.p_enabled,true);
 b.events.click({target:{closest(){return {dataset:{action:'revoke-invite',id:INVITE}};}}});
 await flush();
 assert.equal(b.calls.find(x=>x.name==='dic_admin_revoke_invite').args.p_invite_id,INVITE);
});
test('cross-tab account change immediately removes one-time invitation and denies stale render',async()=>{
 const b=boot();await b.done;
 b.events.submit({target:{id:'admin-invite-form',elements:{namedItem(name){return {value:name==='label'?'Single tester':''};}}},preventDefault(){}});
 await flush();assert.match(b.root.innerHTML,new RegExp(SECRET));
 b.signOut();
 assert.match(b.root.innerHTML,/Admin Access Unavailable/);
 assert.doesNotMatch(b.root.innerHTML,new RegExp(SECRET));
});
test('admin cannot open portal without both server admin and admission status',async()=>{
 const status={authenticated:true,admitted:false,admin:false};
 const root={innerHTML:'',querySelector(){return null;},addEventListener(){}};
 const sdk={auth:{onAuthStateChange(){},async getUser(){return {data:{user:{id:MEMBER}}};}},
  async rpc(name){assert.equal(name,'dic_session_status');return {data:status};}};
 const context=vm.createContext({
  document:{querySelector:()=>root},supabase:{createClient:()=>sdk},CLOUD_CONFIG:{enabled:true},
  secureOrigin(){},applyAppearance(){},readAppearance(){return 'system';},
  renderAdminDashboard,renderAdminDenied,e,isAccessDenied
 });
 vm.runInContext(source,context);await context.started;
 assert.match(root.innerHTML,/Admin Access Unavailable/);
 assert.doesNotMatch(root.innerHTML,/Beta Invitations/);
});
