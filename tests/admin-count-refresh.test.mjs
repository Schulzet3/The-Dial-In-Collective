import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderAdminDashboard} from '../site/admin/view.js';

const stats={pending_coffees:0,conflicts:0,verified_coffees:7,shot_records:22,active_accounts:5};
const dom=()=>renderAdminDashboard({counts:stats,queue:[]},null,null,{}, {},{openSections:new Set(),openCoffeeGroups:new Set(),searchText:''});

test('collapsed Admin sections display server dashboard counts without fetching their rows',()=>{
 const html=dom();
 for(const [kind,value] of [['approved',7],['shots',22],['accounts',5],['pending',0],['conflicts',0]]){
  assert.match(html,new RegExp('data-admin-section="'+kind+'"[^]*?<span class="admin-count">'+value+'</span>'),'section '+kind);
 }
 assert.match(html,/href="#admin-approved"[^]*?<strong>7<\/strong>/);
 assert.match(html,/href="#admin-shots"[^]*?<strong>22<\/strong>/);
 assert.doesNotMatch(html,/No records to show\.<\/p><div class="admin-pagination"/);
});

test('all collapsed/Admin summary counts update from bounded backend summary on timer and foreground',()=>{
 const js=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8');
 assert.match(js,/adminRpc\('dic_admin_dashboard'\)/);
 assert.match(js,/setInterval\?\.\(refreshVisibleCounts,45000\)/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/if\(invalidated\|\|busy\|\|countRefreshRunning\|\|document.hidden\)return/);
 assert.match(js,/if\(searchText&&openSections.has\(kind\)\)continue/);
 assert.match(js,/node.textContent=String\(Number\(count\)\)/);
 assert.doesNotMatch(js,/setInterval\?\.\(\(\)=>refresh\(\)/);
});
