import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {renderAdminAccessPanel,renderAdminDashboard,renderAdminDenied,renderAdminDeleteAccountPrompt,renderPendingSignups} from '../site/admin/view.js';
import {gettingStartedMarkup,walkthroughMarkup} from '../site/cloud/help.js';
import {e} from '../site/lib/ui.js';
import {isAccessDenied} from '../site/cloud/client.js';

const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const PENDING='30000000-0000-4000-8000-000000000001';
const UNVERIFIED='30000000-0000-4000-8000-000000000002';
const members=[
 {id:ADMIN,email:'admin@fixture.invalid',admin:true,enabled:true},
 {id:MEMBER,email:'member@fixture.invalid',admin:false,enabled:true}
];
const signups=[
 {id:PENDING,email:'new@fixture.invalid',created_at:'2026-11-09T17:00Z',email_verified:true,review_state:'pending'},
 {id:UNVERIFIED,email:'unverified@fixture.invalid',created_at:'2026-11-09T17:03Z',email_verified:false,review_state:'pending'}
];

test('new-account approval and attention panel expose no invitation-code UI',()=>{
 const html=renderAdminDashboard({counts:{pending_accounts:2,pending_verified_accounts:1,pending_coffees:1,conflicts:2,unfinished_account_deletions:1,active_accounts:2},queue:[]},null,null,{}, {},{signupRequests:{items:signups,total:2,offset:0}});
 assert.match(html,/Requires Your Attention/);
 assert.match(html,/New Account Requests/);
 assert.match(html,/Ready account approvals/i);
 assert.match(html,/new@fixture\.invalid/);
 assert.match(html,/Email verified/);
 assert.match(html,/data-action="approve-signup"/);
 assert.match(html,/data-action="reject-signup"/);
 assert.match(html,/admin-attention-count[^>]*>5<\/span>/);
 assert.doesNotMatch(html,/Beta Invitations|Generate Code|Existing Codes|Invitation Code|admin-invite-form|Copy Code/);
});
test('unverified accounts cannot be approved in UI; hostile emails are escaped',()=>{
 const html=renderPendingSignups({items:[{...signups[1],email:'<img src=x onerror=alert(1)>'}],total:1,offset:0});
 assert.match(html,/Approve<\/button>/);
 assert.match(html,/disabled title="Email verification required"/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img/);
});
test('Admin member access, deletion choice and unfinished operations remain protected',()=>{
 const state={members,members_total:2,pending_deletions:[{id:'40000000-0000-4000-8000-000000000001',email:'deleted@fixture.invalid',phase:'prepared',community_mode:'keep'}]};
 const html=renderAdminAccessPanel(state);
 assert.match(html,/Administrator · Permanent access/);
 assert.match(html,/Member Access/);
 assert.match(html,/data-action="remove-member"/);
 assert.match(html,/data-action="delete-account"/);
 assert.match(html,/Retry Completion/);
 assert.doesNotMatch(html,/data-action="delete-account" data-id="'+ADMIN+'/);
 const dialog=renderAdminDeleteAccountPrompt({member_id:MEMBER,email:'<svg/onload=alert(1)>',shots:12,notes:4,library_entries:2,community_shots:5,eligible_community_shots:3});
 assert.match(dialog,/Delete Account · Keep Community/);
 assert.match(dialog,/Delete Account \+ Community Contributions/);
 assert.match(dialog,/&lt;svg/);
 assert.doesNotMatch(dialog,/<svg/);
});
test('published-in-future written onboarding has no active invitation instructions',()=>{
 const guide=gettingStartedMarkup();
 assert.match(guide,/Account Approval Pending/);
 assert.match(guide,/Check Approval Status/);
 assert.match(guide,/administrator.s approval/i);
 assert.doesNotMatch(guide,/Your Invitation|invitation code|Use Invitation|Never send passwords or invitation codes/i);
 const accessible=walkthroughMarkup();
 assert.match(accessible,/administrator-approved account/);
 assert.doesNotMatch(accessible,/Sign in to your invited account/);
});
test('retired source interfaces are absent and server approval code is present',()=>{
 const view=readFileSync(new URL('../site/admin/view.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8');
 const cloud=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../site/cloud/client.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261110020500_dic_admin_signup_approval_retire_invites.sql',import.meta.url),'utf8');
 assert.doesNotMatch(view,/Beta Invitations|Generate Code|Existing Codes|admin-invite-form/);
 assert.doesNotMatch(main,/dic_admin_issue_invite|dic_admin_revoke_invite|dic_admin_delete_invite|copy-invite|admin-invite-form/);
 assert.doesNotMatch(cloud,/auth-invite|Your Invitation/);
 assert.doesNotMatch(client,/async redeemInvite\(/);
 assert.match(main,/dic_admin_review_signup/);
 assert.match(cloud,/Account Approval Pending/);
 assert.match(sql,/drop table if exists private\.beta_invites;/);
 assert.match(sql,/p_action not in \('approve','reject'\)/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/signup_review_state/);
});
const source=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'').replace(/start\(\);\s*$/,'globalThis.started=start();');
async function flush(){for(let i=0;i<60;i++)await Promise.resolve();}
function boot(){
 const calls=[],events={},responses=[];
 let authChange,role={authenticated:true,admitted:true,admin:true};
 let liveSignups=signups.map(x=>({...x}));
 const root={
  innerHTML:'',lastActionMessage:'',contains(){return true;},
  insertAdjacentHTML(_where,html){this.innerHTML+=html;},
  addEventListener(name,fn){events[name]=fn;},
  querySelector(selector){
   if(selector==='#admin-action-notice'&&this.innerHTML.includes('id="admin-action-notice"'))
    return {set textContent(v){root.lastActionMessage=v;}};
   return null;
  }
 };
 const sdk={
  functions:{async invoke(name,args){responses.push({name,args});return {data:{ok:true,completed:true,community_removed:0}};}},
  auth:{onAuthStateChange(fn){authChange=fn;return {data:{subscription:{unsubscribe(){}}}};},
   async getUser(){return {data:{user:{id:ADMIN}}};}},
  from(){return {select:()=>({eq:()=>({async maybeSingle(){return {data:{theme:'system'}};}})})};},
  async rpc(name,args){
   calls.push({name,args});
   if(name==='dic_session_status')return {data:role};
   if(name==='dic_admin_dashboard')return {data:{counts:{pending_accounts:liveSignups.length,pending_verified_accounts:liveSignups.filter(s=>s.email_verified).length,active_accounts:2,pending_coffees:1,conflicts:0,unfinished_account_deletions:0},queue:[],queue_total:0}};
   if(name==='dic_admin_signup_requests')return {data:{items:structuredClone(liveSignups),total:liveSignups.length,offset:args.p_offset}};
   if(name==='dic_admin_access_overview')return {data:{members,members_total:2,pending_deletions:[]}};
   if(name==='dic_admin_records')return {data:{items:args.p_kind==='accounts'?members:[],total:args.p_kind==='accounts'?2:0,offset:args.p_offset}};
   if(name==='dic_admin_review_signup'){
    const row=liveSignups.find(s=>s.id===args.p_member_id);
    if(!row||row.review_state!=='pending')return {data:{ok:false,code:'stale_review'}};
    if(args.p_action==='approve'&&!row.email_verified)return {data:{ok:false,code:'verify_email_first'}};
    row.review_state=args.p_action==='approve'?'approved':'rejected';
    liveSignups=liveSignups.filter(x=>x.id!==row.id);
    return {data:{ok:true,decision:args.p_action}};
   }
   if(name==='dic_admin_set_member_access')return {data:{ok:true,enabled:args.p_enabled}};
   if(name==='dic_admin_account_delete_preview')return {data:{member_id:MEMBER,email:'member@fixture.invalid',enabled:true,shots:2,notes:1,library_entries:1,community_shots:1,eligible_community_shots:1}};
   if(name==='dic_admin_account_delete_request')return {data:{ok:true,operation_id:'40000000-0000-4000-8000-000000000001'}};
   throw new Error('Unexpected RPC '+name);
  }
 };
 const context=vm.createContext({
  document:{querySelector:x=>x==='#admin-root'?root:null},
  supabase:{createClient:()=>sdk},CLOUD_CONFIG:{enabled:true},
  secureOrigin(){},applyAppearance(){},readAppearance(){return 'system';},
  renderAdminDashboard,renderAdminDenied,renderAdminDeleteAccountPrompt,e,isAccessDenied,getAdminPushStatus:async()=> 'disabled',
  confirm:()=>true
 });
 vm.runInContext(source,context);
 return {root,calls,events,responses,done:context.started,
  openAccounts(){events.toggle({target:{matches:sel=>sel==='details[data-admin-section]',open:true,dataset:{adminSection:'accounts'}}});},
  click(action,id){events.click({target:{closest(){return {dataset:{action,id}};}}});},
  signOut(){authChange('SIGNED_OUT',null);},setRole(x){role=x;},
  get pending(){return liveSignups}};
}
test('Admin approves only verified signup, rejected users retain identity, and badge follows live count',async()=>{
 const b=boot();await b.done;
 assert.match(b.root.innerHTML,/New Account Requests/);
 assert.match(b.root.innerHTML,/new@fixture.invalid/);
 b.click('approve-signup',PENDING);await flush();
 const approved=b.calls.find(x=>x.name==='dic_admin_review_signup'&&x.args.p_action==='approve');
 assert.equal(approved?.args.p_member_id,PENDING);
 assert.equal(approved?.args.p_expected_state,'pending');
 assert.equal(b.pending.length,1);
 b.click('approve-signup',UNVERIFIED);await flush();
 assert.equal(b.calls.filter(x=>x.name==='dic_admin_review_signup'&&x.args.p_member_id===UNVERIFIED).length,0);
 b.click('reject-signup',UNVERIFIED);await flush();
 assert.equal(b.calls.filter(x=>x.name==='dic_admin_review_signup').length,2);
 assert.equal(b.pending.length,0);
 assert.match(b.root.innerHTML,/No pending account requests/);
 assert.doesNotMatch(b.root.innerHTML,/Invitation Code/);
});
test('existing members can still be removed and restored; stale signed-out Admin data is redacted',async()=>{
 const b=boot();await b.done;b.openAccounts();await flush();
 b.click('remove-member',MEMBER);await flush();
 b.click('restore-member',MEMBER);await flush();
 assert.deepEqual(b.calls.filter(x=>x.name==='dic_admin_set_member_access').map(x=>x.args.p_enabled),[false,true]);
 b.signOut();
 assert.match(b.root.innerHTML,/Admin Access Unavailable/);
 assert.doesNotMatch(b.root.innerHTML,/new@fixture.invalid/);
});
test('account deletion retains exact Community choice and authorized Edge flow',async()=>{
 const b=boot();await b.done;b.openAccounts();await flush();
 b.click('delete-account',MEMBER);await flush();
 assert.match(b.root.innerHTML,/Delete Account · Keep Community/);
 b.events.click({target:{closest(){return {dataset:{action:'confirm-delete-account',id:MEMBER,mode:'remove'}};}}});
 await flush();
 const a=b.calls.find(x=>x.name==='dic_admin_account_delete_request');
 assert.equal(a?.args?.p_community_mode,'remove');
 assert.equal(b.responses[0]?.name,'dic-delete-member-account');
});
test('non-admin portal identity is denied without pulling private requests',async()=>{
 const root={innerHTML:'',querySelector(){return null;},addEventListener(){}};
 const calls=[];
 const sdk={auth:{onAuthStateChange(){},async getUser(){return {data:{user:{id:MEMBER}}};}},
  async rpc(name){calls.push(name);if(name!=='dic_session_status')throw Error('Unexpected Admin fetch');return {data:{authenticated:true,admitted:false,admin:false}};}};
 const context=vm.createContext({document:{querySelector:()=>root},supabase:{createClient:()=>sdk},CLOUD_CONFIG:{enabled:true},secureOrigin(){},applyAppearance(){},readAppearance(){return 'system';},renderAdminDashboard,renderAdminDenied,e,isAccessDenied,getAdminPushStatus:async()=> 'disabled'});
 vm.runInContext(source,context);await context.started;
 assert.match(root.innerHTML,/Admin Access Unavailable/);
 assert.deepEqual(calls,['dic_session_status']);
});
