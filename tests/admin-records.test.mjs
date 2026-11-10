import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAdminRecord,renderAdminRecordCollection,groupAdminShots} from '../site/admin/records.js';
import {renderAdminDashboard,renderAdminAccessPanel,renderPendingSignups} from '../site/admin/view.js';

test('admin six metric cards navigate in exact owner order',()=>{
 const html=renderAdminDashboard({counts:{}},null,null,{},{});
 const targets=[...html.matchAll(/class="admin-stat" href="#admin-([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(targets,['pending','conflicts','approved','shots','new-members','accounts']);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'section navigation targets must be unique');
 for(const target of targets)assert.equal(ids.filter(id=>id==='admin-'+target).length,1,
  'the '+target+' metric must reach exactly one section');
});
test('metric counts match complete listings including hidden shots, removed accounts, unmerged coffees and zero',()=>{
 const html=renderAdminDashboard({counts:{pending_coffees:9,conflicts:8,verified_coffees:4,shot_records:2,active_accounts:1,pending_accounts:7}},
  null,null,{}, {
   pending:{items:[],total:0},conflicts:{items:[],total:0},
   approved:{items:[{name:'Unmerged coffee'}],total:3},
   shots:{items:[{hidden_at:'2026-10-21T00:00:00Z'}],total:3},
   accounts:{items:[{enabled:false}],total:2}
  });
 const cards=[...html.matchAll(/class="admin-stat" href="#admin-([^"]+)"><span>([^<]+)<\/span><strong>([^<]+)<\/strong>/g)]
  .map(([,kind,label,count])=>[kind,label,count]);
 assert.deepEqual(cards,[['pending','Pending Coffees','0'],['conflicts','Conflicts','0'],
  ['approved','Approved Coffees','3'],['shots','Logged Shots','3'],['new-members','New Accounts','7'],['accounts','Admitted Accounts','2']]);
});
test('metric cards retain legacy counts only when complete page totals are unavailable or invalid',()=>{
 const counts={pending_coffees:5,conflicts:4,verified_coffees:3,shot_records:2,active_accounts:1,pending_accounts:0};
 for(const total of [undefined,null,-1,1.5,'0',NaN,Infinity]){
  const html=renderAdminDashboard({counts},null,null,{}, {
   conflicts:{items:[],total:0,error:'Unavailable'},approved:{items:[],total},
   shots:{total:0},accounts:{items:[],total:9,error:'Unavailable'}
  });
  const displayed=[...html.matchAll(/class="admin-stat"[^>]*><span>[^<]*<\/span><strong>([^<]+)<\/strong>/g)].map(x=>x[1]);
  assert.deepEqual(displayed,['5','4','3','2','0','1']);
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
 assert.match(html,/Save Changes/);
 assert.doesNotMatch(html,/name="reason"|Reason for correction/);
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
  members_total:51},{items:[],total:0,offset:50,error:'Temporary failure'});
 assert.match(html,/member@fixture.invalid/);
 assert.match(html,/Complete account listing is temporarily unavailable/);
 assert.doesNotMatch(html,/data-kind="accounts"/);
 assert.doesNotMatch(html,/id="admin-invite-form"/);
});
test('successful account pages preserve exact totals and handle a concurrently emptied page',()=>{
 const access={members:[{id:'old',email:'old@fixture.invalid'}],members_total:51};
 const finalPage=renderAdminAccessPanel(access,{items:[{id:'last',email:'last@fixture.invalid'}],total:51,offset:50});
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
  for(const action of ['review-approve','review-merge-prepare'])
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
  assert.match(section,/<details class="admin-disclosure" data-admin-section=/);
  assert.doesNotMatch(section,/<section|No records to show/);
 }
 assert.doesNotMatch(html,/<h2>(pending|conflicts)<\/h2>/);
});
test('unavailable detail pages preserve independent review actions without false empty lists',()=>{
 const html=renderAdminDashboard({queue:[{id:'pending',name:'Coffee needing review',status:'pending'}]},null,null,{},
  {pending:{items:[],error:'Detailed listing unavailable'},conflicts:{items:[],error:'Detailed listing unavailable'}});
 assert.match(html,/Coffee needing review/);
 assert.match(html,/data-action="review-approve"/);
 assert.match(html,/data-action="review-merge-prepare"/);
 assert.doesNotMatch(html,/data-action="review-hold"/);
 assert.equal((html.match(/Detailed listing unavailable/g)||[]).length,2);
 assert.match(html,/<details class="admin-disclosure" data-admin-section="pending"/);
 assert.doesNotMatch(html,/No pending coffee submissions|No coffee conflicts/);
 assert.match(html,/Detailed listing unavailable/);
 const standalone=renderAdminRecordCollection('pending',{items:[],total:0});
 assert.match(standalone,/<h2>Pending Coffees<\/h2>/);
});

test('pending signup requests paginate separately without exposing old codes',()=>{
 const row={id:'00000000-0000-4000-8000-000000000071',email:'review@fixture.invalid',
  email_verified:true,review_state:'pending',created_at:'2026-11-09T18:00:00Z'};
 const html=renderPendingSignups({items:[row],total:90,offset:50});
 assert.match(html,/review@fixture.invalid/);
 assert.match(html,/data-action="signup-page" data-offset="0"/);
 assert.match(html,/data-action="signup-page" data-offset="100"/);
 assert.match(html,/data-action="approve-signup"/);
 assert.doesNotMatch(html,/invitation code|token_hash|dic-[a-f0-9]{64}/i);
});
test('unavailable signup requests fail visibly rather than fabricate an empty queue',()=>{
 const html=renderPendingSignups({error:'Unavailable'},10);
 assert.match(html,/Signup requests could not be loaded/);
 assert.match(html,/New Account Requests/);
 assert.doesNotMatch(html,/No pending account requests|data-action="signup-page"/);
});

test('admin summaries expose counts and remain collapsed on initial render',()=>{
 const html=renderAdminDashboard({counts:{shot_records:4}},null,null,{},{
  pending:{items:[],total:0},conflicts:{items:[],total:0},
  approved:{items:[],total:0},shots:{items:[],total:4}
 });
 for(const kind of ['pending','conflicts','approved','shots','accounts','infrastructure']){
  const tag=html.match(new RegExp('<details class="admin-disclosure" data-admin-section="'+kind+'"[^>]*>'))?.[0];
  assert.ok(tag,'missing '+kind);
  assert.doesNotMatch(tag,/\sopen(?:\s|>)/);
 }
 assert.match(html,/data-admin-section="shots"[^>]*><summary[^>]*><h2>Logged Shots<\/h2><span class="admin-count">4<\/span>/);
 const opened=renderAdminDashboard({},null,null,{}, {},{openSections:new Set(['shots','pending'])});
 assert.match(opened,/data-admin-section="shots" open>/);
 assert.doesNotMatch(opened,/data-admin-section="approved" open>/);
});

test('shots are nested by actual owner coffee entry, not the same coffee name',()=>{
 const a='00000000-0000-4000-8000-0000000000a1',b='00000000-0000-4000-8000-0000000000b2';
 const shot=(i,key)=>({id:'00000000-0000-4000-8000-00000000010'+i,revision:2,library_entry_id:key,
  coffee_name:'Same Name',creator_email:'owner@example.invalid',notes:'<img onerror=bad>'});
 const items=[shot(1,a),shot(2,a),shot(3,b),shot(4,null),shot(5,null)];
 const groups=groupAdminShots(items);
 assert.deepEqual(groups.map(g=>g.shots.length),[2,1,1,1]);
 const html=renderAdminRecordCollection('shots',{items,total:55,offset:0});
 assert.equal((html.match(/class="admin-coffee-group"/g)||[]).length,4);
 assert.equal((html.match(/class="admin-queue-item admin-record"/g)||[]).length,5);
 assert.match(html,/2 shots on this page/);
 assert.match(html,/Showing 1–5 of 55/);
 assert.match(html,/&lt;img onerror=bad&gt;/);
 assert.doesNotMatch(html,/<img/);
 const opened=renderAdminRecordCollection('shots',{items,total:5},{openCoffeeGroups:new Set(['library:'+a])});
 assert.match(opened,/data-admin-coffee="library:00000000-0000-4000-8000-0000000000a1" open>/);
});

test('pending cards show every field without a secondary per-coffee disclosure',()=>{
 const id='00000000-0000-4000-8000-000000000911';
 const html=renderAdminDashboard({},null,null,{},{
  pending:{items:[{id,revision:3,name:'<danger>',roaster:'Fixture Roaster',tasting_notes:'Berry & Floral',origin:'Ethiopia',espressoNotes:'18 g in'}],total:1,offset:0}
 });
 assert.match(html,/class="admin-compare-facts"/);
 for(const field of ['Coffee Name','Roaster','Release / Harvest','Origin','Process','Roast Level',
  'Variety','Producer','Elevation','Tasting Notes','Summary','Espresso Notes','Source URL'])
  assert.ok(html.includes(field),'missing '+field);
 assert.match(html,/&lt;danger&gt;/);
 assert.match(html,/Berry &amp; Floral/);
 assert.doesNotMatch(html,/<danger>/);
 assert.match(html,/data-action="review-approve"/);
});
test('approved identity editor fields are writable by the server-guarded operator',()=>{
 const html=renderAdminRecord({id:'00000000-0000-4000-8000-000000000912',revision:3,
   name:'New name',roaster:'New roaster',release_label:'Harvest 2026'},'approved');
 for(const field of ['name','roaster','release_label']){
  assert.match(html,new RegExp('<input name="'+field+'"[^>]*'));
  assert.doesNotMatch(html,new RegExp('<input name="'+field+'"[^>]*readonly'));
 }
});

test('Admin search is escaped, accessible, and clearable without changing fixed metric order',()=>{
 const html=renderAdminDashboard({counts:{active_accounts:2}},null,null,{}, {},{searchText:'<img onerror=attack>'});
 assert.match(html,/id="admin-search-form"/);
 assert.match(html,/aria-label="Search all Admin records"/);
 assert.match(html,/data-action="admin-search-clear"/);
 assert.match(html,/&lt;img onerror=attack&gt;/);
 assert.doesNotMatch(html,/<img onerror/);
 assert.equal((html.match(/class="admin-stat" href=/g)||[]).length,6);
 const empty=renderAdminRecordCollection('approved',{search:true,items:[],total:0,offset:0});
 assert.match(empty,/No matching records\./);
});

test('pending comparison identifies genuine origin conflicts, treats blanks as unknown and escapes untrusted text',()=>{
 const id='00000000-0000-4000-8000-000000000911';
 const html=renderAdminDashboard({},null,null,{}, {pending:{items:[{id,revision:1,status:'pending',name:'Arbey Cordoba',roaster:'Sweet Bloom',origin:'Antigua, Guatemala',process:'Washed',producer:'Arbey Cordoba'}],total:1,offset:0}}, {comparisons:{[id]:[{name:'Arbey Cordoba',roaster:'Sweet Bloom',origin:'Huila, Colombia',process:null,producer:null}]}});
 assert.match(html,/Submitted Coffee/);assert.match(html,/Possible Existing Match/);
 assert.match(html,/Antigua, Guatemala/);assert.match(html,/Huila, Colombia/);
 assert.match(html,/Origin:|Origin<\/dt>/);assert.match(html,/Blank fields are not treated as contradictions/);
 assert.doesNotMatch(html,/review-hold|<img/);
});
test('delete controls render on real editable records with a revision',()=>{
 const id='00000000-0000-4000-8000-000000000912';
 for(const kind of ['shots','approved','pending']){
  const html=renderAdminRecord({id,revision:2,name:'Coffee'},kind);
  assert.match(html,/data-action="admin-delete-record"/);
  assert.match(html,/data-revision="2"/);
 }
 const disabled=renderAdminRecord({name:'No identifier'},'approved');
 assert.doesNotMatch(disabled,/data-action="admin-delete-record"/);
});

test('admin dashboard retains an accessible inline action status region after a successful correction',()=>{
 const html=renderAdminDashboard({counts:{approved_coffees:55}},null,null,{}, {});
 const matches=html.match(/<p id="admin-action-notice"[^>]*><\/p>/g)||[];
 assert.equal(matches.length,1,'the dashboard has exactly one durable feedback region');
 assert.match(matches[0],/role="status"/);
 assert.match(matches[0],/aria-live="polite"/);
 assert.match(html,/id="admin-refresh"/,'the dashboard remains navigable after feedback');
});

test('expanded Admin Accounts retain a single action status target',()=>{
 const html=renderAdminDashboard({counts:{active_accounts:1}},
  {members:[{id:'fixture-member',email:'member@example.invalid',enabled:true}]},
  null,{}, {accounts:{items:[{id:'fixture-member',email:'member@example.invalid'}],total:1,offset:0}},
  {openSections:new Set(['accounts'])});
 assert.equal((html.match(/id="admin-action-notice"/g)||[]).length,1);
 assert.match(html,/<p id="admin-action-notice"[^>]*role="status"[^>]*><\/p>/);
 assert.match(html,/New Account Requests/);
 assert.doesNotMatch(html,/id="admin-invite-form"/);
 assert.match(html,/id="admin-refresh"/);
});
