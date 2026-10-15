import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderAdminDashboard,renderAdminDenied,formatCount} from '../site/admin/view.js';

test('admin dashboard is genuinely read-only and makes no approval/delete offers',()=>{
 const html=renderAdminDashboard({
  counts:{pending_coffees:4,conflicts:1,verified_coffees:5,active_accounts:1,shot_records:14},
  queue_total:1,queue:[{id:'test',status:'pending',name:'Example',roaster:'Roaster',created_at:'2026-10-14T00:00:00Z'}]
 });
 assert.match(html,/Review Queue/);
 assert.match(html,/Pending Coffee Verification/);
 assert.match(html,/read-only/);
 assert.doesNotMatch(html,/data-action="approve"|data-action="merge"|data-action="reject"|>Delete</);
 assert.match(html,/Logged Shots/);
 assert.match(html,/The Dial In Collective/);
});
test('untrusted coffee fields are HTML escaped, not executable or clickable',()=>{
 const html=renderAdminDashboard({counts:{},queue_total:1,queue:[{
   name:'<img src=x onerror=alert(1)>',
   roaster:'<svg/onload=alert(2)>',
   source_url:'javascript:alert(document.cookie)',
   origin:'<script>alert(3)</script>',
   status:'conflict',
   created_at:'2026-10-14T12:00:00Z',
 }]});
 assert.doesNotMatch(html,/<script>|<img|<svg|href="javascript/);
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script/);
 assert.match(html,/Conflict/);
});
test('invalid and missing aggregates cannot display misleading numbers',()=>{
 for(const bad of ['wat',null,undefined,-1])assert.equal(formatCount(bad),'—');
 assert.equal(formatCount(4),'4');
 assert.equal(formatCount(0),'0');
 assert.match(renderAdminDashboard(),/No coffee submissions need review/);
});
test('administrator denial never renders protected queue',()=>{
 const html=renderAdminDenied('<script>bad</script>');
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/Admin Access Unavailable/);
 assert.match(html,/server-side/);
});
test('admin page uses the same persisted Supabase session and verifies admin RPC',async()=>{
 const main=await readFile(new URL('../site/admin/main.js',import.meta.url),'utf8');
 const builder=await readFile(new URL('../build_cloud.mjs',import.meta.url),'utf8');
 const app=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(main,/storageKey:'dic_cloud_auth_v1'/);
 assert.match(main,/sdk\.auth\.getUser\(\)/);
 assert.match(main,/dic_session_status/);
 assert.match(main,/!status\?\.admin/);
 assert.match(main,/dic_admin_dashboard/);
 assert.match(builder,/admin\.html/);
 assert.match(builder,/admin\/main\.js/);
 assert.match(app,/this\.status\?\.admin/);assert.match(app,/Admin Dashboard/);
});
test('the proposed SQL never grants admin rights or enables mutation operations',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261014211500_dic_admin_read_only_dashboard.sql',import.meta.url),'utf8');
 assert.match(sql,/private\.is_admin\(\)/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/security invoker set search_path=''/);
 assert.match(sql,/revoke all on function public\.dic_admin_dashboard\(\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.dic_admin_dashboard\(\) to authenticated/);
 assert.doesNotMatch(sql,/insert into private\.app_admins|update public\.coffees|alter policy|create policy/i);
});
