import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAdminRecord,renderAdminRecordCollection} from '../site/admin/records.js';
import {renderAdminDashboard,renderAdminAccessPanel} from '../site/admin/view.js';

test('admin five metric cards navigate in exact owner order',()=>{
 const html=renderAdminDashboard({counts:{}},null,null,{},{});
 const targets=[...html.matchAll(/class="admin-stat" href="#admin-([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(targets,['pending','conflicts','approved','shots','accounts']);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'section navigation targets must be unique');
 for(const target of targets)assert.equal(ids.filter(id=>id==='admin-'+target).length,1,
  'the '+target+' metric must reach exactly one section');
});
test('metric counts match complete listings including hidden shots, removed accounts, unmerged coffees and zero',()=>{
 const html=renderAdminDashboard({counts:{pending_coffees:9,conflicts:8,verified_coffees:4,shot_records:2,active_accounts:1}},
  null,null,{}, {
   pending:{items:[],total:0},conflicts:{items:[],total:0},
   approved:{items:[{name:'Unmerged coffee'}],total:3},
   shots:{items:[{hidden_at:'2026-10-21T00:00:00Z'}],total:3},
   accounts:{items:[{enabled:false}],total:2}
  });
 const cards=[...html.matchAll(/class="admin-stat" href="#admin-([^"]+)"><span>([^<]+)<\/span><strong>([^<]+)<\/strong>/g)]
  .map(([,kind,label,count])=>[kind,label,count]);
 assert.deepEqual(cards,[['pending','Pending Coffees','0'],['conflicts','Conflicts','0'],
  ['approved','Approved Coffees','3'],['shots','Logged Shots','3'],['accounts','Admitted Accounts','2']]);
});
test('metric cards retain legacy counts only when complete page totals are unavailable or invalid',()=>{
 const counts={pending_coffees:5,conflicts:4,verified_coffees:3,shot_records:2,active_accounts:1};
 for(const total of [undefined,null,-1,1.5,'0',NaN,Infinity]){
  const html=renderAdminDashboard({counts},null,null,{}, {
   conflicts:{items:[],total:0,error:'Unavailable'},approved:{items:[],total},
   shots:{total:0},accounts:{items:[],total:9,error:'Unavailable'}
  });
  const displayed=[...html.matchAll(/class="admin-stat"[^>]*><span>[^<]*<\/span><strong>([^<]+)<\/strong>/g)].map(x=>x[1]);
  assert.deepEqual(displayed,['5','4','3','2','1']);
 }
});
test('records are escaped, creator displayed and fields editable only through a form',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const html=renderAdminRecord({id,revision:2,name:'<script>alert(1)</script>',creator_email:'owner@example.com',notes:'<img onerror=bad>',dose_g:18},'shots');
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/owner@example.com/);
 assert.match(html,/data-record-form/);
 assert.match(html,/name="notes"/);
 assert.match(html,/<textarea name="notes"[^>]*maxlength="16000"/);
 assert.match(html,/Save Audited Correction/);
});
test('pagination includes a Next link and shows accurate total',()=>{
 const html=renderAdminRecordCollection('approved',{items:[{name:'A'}],total:61,offset:0});
 assert.match(html,/data-kind="approved"/);
 assert.match(html,/Showing 1–1 of 61/);
 assert.match(html,/data-offset="50"/);
});
test('an emptied record page reports an empty page and retains a Previous route',()=>{
 const html=renderAdminRecordCollection('pending',{items:[],total:49,offset:50});
 assert.match(html,/No records on this page · 49 total/);
 assert.doesNotMatch(html,/Showing 51–49/);
 assert.match(html,/data-offset="0" >Previous/);
 assert.match(html,/data-offset="100" disabled>Next/);
});
test('account-list failure exposes the overview fallback without a looping Next action',()=>{
 const html=renderAdminAccessPanel({members:[{id:'member',email:'member@fixture.invalid',enabled:true}],
  members_total:51},null,{items:[],total:0,offset:50,error:'Temporary failure'});
 assert.match(html,/member@fixture.invalid/);
 assert.match(html,/Complete account listing is temporarily unavailable/);
 assert.doesNotMatch(html,/data-kind="accounts"/);
 assert.match(html,/id="admin-invite-form"/);
});
test('successful account pages preserve exact totals and handle a concurrently emptied page',()=>{
 const access={members:[{id:'old',email:'old@fixture.invalid'}],members_total:51};
 const finalPage=renderAdminAccessPanel(access,null,{items:[{id:'last',email:'last@fixture.invalid'}],total:51,offset:50});
 assert.match(finalPage,/Showing 51–51 of 51/);
 assert.match(finalPage,/data-offset="100" disabled>Next/);
 assert.doesNotMatch(finalPage,/old@fixture.invalid/);
 const empty=renderAdminAccessPanel(access,null,{items:[],total:49,offset:50});
 assert.match(empty,/No accounts on this page · 49 total/);
 assert.doesNotMatch(empty,/Showing 51–50/);
 const noAccounts=renderAdminAccessPanel(access,null,{items:[],total:0,offset:0});
 assert.match(noAccounts,/Member Access <span class="helper">0<\/span>/);
 assert.doesNotMatch(noAccounts,/data-kind="accounts"|old@fixture.invalid/);
});
test('every pending and conflict entry is actionable even on page two',()=>{
 const pending='00000000-0000-4000-8000-000000000061',conflict='00000000-0000-4000-8000-000000000062';
 const html=renderAdminDashboard({queue:[{id:'first-page',name:'Obsolete first-page',status:'pending'}]},
  null,null,{},{
   pending:{items:[{id:pending,revision:8,name:'Page 2 coffee',status:'pending',creator_email:'test@example.invalid'}],total:51,offset:50},
   conflicts:{items:[{id:conflict,revision:9,name:'Page 2 conflict',status:'conflict'}],total:51,offset:50}
  });
 for(const id of [pending,conflict]){
  for(const action of ['review-approve','review-merge-prepare','review-hold'])
   assert.match(html,new RegExp('data-action="'+action+'" data-id="'+id+'"'));
 }
 assert.equal((html.match(/data-action="review-approve"/g)||[]).length,2);
 assert.doesNotMatch(html,/Obsolete first-page|admin-review-details/);
 assert.match(html,/data-revision="8"/);assert.match(html,/data-revision="9"/);
});
test('complete lists show one set of current-revision actions and no duplicate queue cards',()=>{
 const id='00000000-0000-4000-8000-000000000063';
 const html=renderAdminDashboard({queue:[{id,revision:1,name:'Stale queue record',status:'pending'}]},
  null,null,{},{
   pending:{items:[{id,revision:2,name:'Current record',status:'pending'}],total:1,offset:0},
   conflicts:{items:[],total:0,offset:0}
  });
 assert.equal((html.match(/data-action="review-approve"/g)||[]).length,1);
 assert.equal((html.match(/class="admin-queue-item admin-record"/g)||[]).length,1);
 assert.doesNotMatch(html,/Stale queue record|admin-review-details/);
 assert.match(html,/data-action="review-approve" data-id="00000000-0000-4000-8000-000000000063" data-revision="2"/);
});
test('empty complete review pages have one titled section and one empty message',()=>{
 const html=renderAdminDashboard({queue:[]},null,null,{},
  {pending:{items:[],total:0,offset:0},conflicts:{items:[],total:0,offset:0}});
 for(const [kind,title,message] of [['pending','Pending Coffee Review','No pending coffee submissions.'],
  ['conflicts','Conflicts','No coffee conflicts.']]){
  const section=html.match(new RegExp('<section[^>]*id="admin-'+kind+'"[^>]*>([\\s\\S]*?)</section>'))?.[1];
  assert.ok(section);
  assert.equal((section.match(/<h2>/g)||[]).length,1);
  assert.ok(section.includes('<h2>'+title+'</h2>'));
  assert.equal(section.split(message).length-1,1);
  assert.doesNotMatch(section,/<section|<details|No records to show/);
 }
 assert.doesNotMatch(html,/<h2>(pending|conflicts)<\/h2>/);
});
test('unavailable detail pages preserve independent review actions without false empty lists',()=>{
 const html=renderAdminDashboard({queue:[{id:'pending',name:'Coffee needing review',status:'pending'}]},null,null,{},
  {pending:{items:[],error:'Detailed listing unavailable'},conflicts:{items:[],error:'Detailed listing unavailable'}});
 assert.match(html,/Coffee needing review/);
 assert.match(html,/data-action="review-approve"/);
 assert.match(html,/data-action="review-merge-prepare"/);
 assert.match(html,/data-action="review-hold"/);
 assert.equal((html.match(/Detailed listing unavailable/g)||[]).length,2);
 assert.doesNotMatch(html,/<details|No pending coffee submissions|No coffee conflicts/);
 assert.match(html,/Detailed listing unavailable/);
 const standalone=renderAdminRecordCollection('pending',{items:[],total:0});
 assert.match(standalone,/<h2>Pending Coffees<\/h2>/);
});

test('invitation metadata paginates independently, without exposing secrets',()=>{
 const row={id:'00000000-0000-4000-8000-000000000071',label:'Older invite',uses:1,max_uses:1,status:'used',created_at:'2026-10-18'};
 const html=renderAdminAccessPanel({invites_total:90,invites:[],members:[]},null,
  {items:[],total:0,offset:0},{items:[row],total:90,offset:50});
 assert.match(html,/Older invite|Showing 51–51 of 90/);
 assert.match(html,/data-action="record-page" data-kind="invites" data-offset="0"/);
 assert.match(html,/data-action="record-page" data-kind="invites" data-offset="100"/);
 assert.doesNotMatch(html,/token_hash|dic-[a-f0-9]{64}/);
});
test('invite listing failure retains safe original 50-row overview without looping Next',()=>{
 const html=renderAdminAccessPanel({invites:[{id:'00000000-0000-4000-8000-000000000072',label:'Original invite',uses:0,max_uses:1,status:'active'}],invites_total:60},null,
  null,{items:[],total:60,offset:50,error:'Unavailable'});
 assert.match(html,/Original invite|Complete invitation history is temporarily unavailable/);
 assert.doesNotMatch(html,/data-kind="invites"/);
});
