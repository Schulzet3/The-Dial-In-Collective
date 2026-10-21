import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAdminRecord,renderAdminRecordCollection} from '../site/admin/records.js';
import {renderAdminDashboard} from '../site/admin/view.js';

test('admin five metric cards navigate in exact owner order',()=>{
 const html=renderAdminDashboard({counts:{}},null,null,{},{});
 const targets=[...html.matchAll(/class="admin-stat" href="#admin-([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(targets,['pending','conflicts','approved','shots','accounts']);
});
test('records are escaped, creator displayed and fields editable only through a form',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const html=renderAdminRecord({id,revision:2,name:'<script>alert(1)</script>',creator_email:'owner@example.com',notes:'<img onerror=bad>',dose_g:18},'shots');
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/owner@example.com/);
 assert.match(html,/data-record-form/);
 assert.match(html,/name="notes"/);
 assert.match(html,/Save Audited Correction/);
});
test('pagination includes a Next link and shows accurate total',()=>{
 const html=renderAdminRecordCollection('approved',{items:[{name:'A'}],total:61,offset:0});
 assert.match(html,/data-kind="approved"/);
 assert.match(html,/Showing 1–1 of 61/);
 assert.match(html,/data-offset="50"/);
});
