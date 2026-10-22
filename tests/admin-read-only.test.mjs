import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderAdminDashboard,renderAdminDenied,formatCount} from '../site/admin/view.js';

test('admin dashboard offers guarded manual review without destructive delete',()=>{
 const html=renderAdminDashboard({
  counts:{pending_coffees:4,conflicts:1,verified_coffees:5,active_accounts:1,shot_records:14},
  queue_total:1,queue:[{id:'test',status:'pending',name:'Example',roaster:'Roaster',created_at:'2026-10-14T00:00:00Z'}]
 });
 assert.match(html,/Review Queue/);
 assert.match(html,/Pending Coffee Review/);
 assert.match(html,/Approved Coffees/);
 assert.match(html,/Unique coffees are approved automatically/);
 assert.doesNotMatch(html,/Pending Coffee Verification|Source-backed coffees can verify automatically/);
 assert.match(html,/data-action="review-approve"/);
 assert.match(html,/data-action="review-merge-prepare"/);
 assert.match(html,/data-action="review-hold"/);
 assert.doesNotMatch(html,/data-action="delete"|>Delete</);
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
 const html=renderAdminDashboard();
 assert.match(html,/No pending coffee submissions/);assert.match(html,/No coffee conflicts/);
 assert.doesNotMatch(html,/NaN|Infinity/);
 assert.equal((html.match(/<strong>—<\/strong>/g)||[]).length,5);
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
 const sql=await readFile(new URL('../supabase/migrations/20261014212829_dic_admin_read_only_dashboard.sql',import.meta.url),'utf8');
 assert.match(sql,/private\.is_admin\(\)/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/security invoker set search_path=''/);
 assert.match(sql,/revoke all on function public\.dic_admin_dashboard\(\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.dic_admin_dashboard\(\) to authenticated/);
 assert.doesNotMatch(sql,/insert into private\.app_admins|update public\.coffees|alter policy|create policy/i);
});

test('admin review UI enforces exact revision, single-click approve and reasons for manual conflict decisions',async()=>{
 const main=await readFile(new URL('../site/admin/main.js',import.meta.url),'utf8');
 const sql=await readFile(new URL('../supabase/migrations/20261021053500_dic_admin_coffee_review.sql',import.meta.url),'utf8');
 assert.match(main,/dic_admin_review_coffee/);
 assert.match(main,/p_expected_revision:revision/);
 assert.match(main,/if\(decision!=='approve'\)/);
  assert.match(main,/if\(reason.length<8\)return/);
  const updated=await readFile(new URL('../supabase/migrations/20261022024000_dic_admin_fast_review_and_identity_edits.sql',import.meta.url),'utf8');
  assert.match(updated,/p_action='approve' and reason_text is null/);
  assert.match(updated,/Administrator approved distinct coffee/);
 assert.match(sql,/private\.require_member\(\)/);
 assert.match(sql,/not private\.is_admin\(\)/);
 assert.match(sql,/s\.revision is distinct from p_expected_revision/);
 assert.match(sql,/insert into public\.admin_reviews/);
 assert.match(sql,/p_action not in \('approve','merge','hold'\)/);
 assert.match(sql,/revoke all on function private\.dic_admin_review_coffee/);
 assert.match(sql,/grant execute on function private\.dic_admin_review_coffee.*to authenticated/);
 assert.match(sql,/revoke all on function public\.dic_admin_review_coffee.*from public,anon,authenticated/);
});
test('manual review displays compatible duplicates and escapes candidate names',()=>{
 const html=renderAdminDashboard({queue_total:1,queue:[{
  id:'00000000-0000-4000-8000-000000000001',revision:2,name:'<img src=x onerror=1>',roaster:'Sweet Bloom'
 }]},null,null,{
  '00000000-0000-4000-8000-000000000001':[{id:'00000000-0000-4000-8000-000000000002',name:'<script>bad</script>',roaster:'Sweet Bloom'}]
 });
 assert.match(html,/data-action="review-merge"/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>|<img/);
});

test('routine admin Save requires no human correction reason or redundant confirmation',async()=>{
 const main=await readFile(new URL('../site/admin/main.js',import.meta.url),'utf8');
 const records=await readFile(new URL('../site/admin/records.js',import.meta.url),'utf8');
 const migration=await readFile(new URL('../supabase/migrations/20261022024000_dic_admin_fast_review_and_identity_edits.sql',import.meta.url),'utf8');
 const cloud=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(records,/Save Changes/);
 assert.doesNotMatch(records,/Reason for correction|name="reason"/);
 assert.doesNotMatch(main,/Save this administrator correction\?/);
 assert.match(main,/p_reason:''/);
 assert.match(migration,/Administrator saved record changes/);
 assert.match(migration,/insert into private\.admin_content_edits/);
 assert.match(main,/if\(decision!=='approve'\)/);
 assert.doesNotMatch(cloud,/if\(Math\.abs\(Number\(d\.doseG\)-dose\)>1&&!confirm/);
});
