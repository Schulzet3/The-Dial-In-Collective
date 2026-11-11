import test from 'node:test';
import assert from 'node:assert/strict';
import {hasLocalSuccess} from '../site/lib/model.js';

// R455-192 synthetic-only original/current grinder range fixtures.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(change={})=>({
 id:'old-green',coffeeId:'coffee',setupVersionId:'version',style:'Turbo',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,
 timeS:17,grindSetting:9,tempC:94,calibrationId:'older',
 snapshot:{grinderMin:8,grinderMax:10},notes:'Keep this private original',
 ...change
});
const state=(shots,change={})=>({
 activeSetupId:'setup',setups:[{id:'setup',activeVersionId:'version',versions:[{
  id:'version',calibrationId:'current',grinderMin:0,grinderMax:5,
  calibrations:[{id:'older',min:8,max:10},{id:'current',min:0,max:5}],
  ...change
 }]}],shots
});
const badge=(s,coffee='coffee',style='Turbo')=>hasLocalSuccess(s,coffee,style);

test('R192 original-valid green history remains a Coffee overview success after recalibration',()=>{
 const s=state([shot()]),before=structuredClone(s);
 assert.equal(badge(s),true,'Historic dial 9 on original [8,10], current [0,5]');
 assert.deepEqual(s,before,'No original measurements, ratings or notes modified');
});
test('R192 preserved inclusive original calibration endpoints do not become current grind settings',()=>{
 for(const grindSetting of [8,10]){
  const s=state([shot({grindSetting})]);
  assert.equal(badge(s),true,String(grindSetting));
  assert.equal(s.shots[0].grindSetting,grindSetting);
 }
});
test('R192 a current-valid but original-invalid dial cannot establish a green recipe',()=>{
 for(const grindSetting of [0,4,5,10.1,NaN]){
  const s=state([shot({grindSetting})]),before=structuredClone(s);
  assert.equal(badge(s),false,String(grindSetting));
  assert.deepEqual(s,before);
 }
});
test('R192 original snapshot takes precedence over a stale calibration-list entry',()=>{
 const s=state([shot()],{calibrations:[{id:'older',min:0,max:5},{id:'current',min:0,max:5}]});
 assert.equal(badge(s),true);
 assert.equal(badge(state([shot({snapshot:{grinderMin:10,grinderMax:8}})])),false);
});
test('R192 current-calibration shots stay constrained to active actual espresso limits',()=>{
 for(const grindSetting of [0,2.5,5]){
  const s=state([shot({calibrationId:'current',snapshot:null,grindSetting})]);
  assert.equal(badge(s),true);
 }
 for(const grindSetting of [-.1,5.1,9]){
  assert.equal(badge(state([shot({calibrationId:'current',snapshot:null,grindSetting})])),false);
 }
});
test('R192 unknown legacy original scale conservatively falls back to current range',()=>{
 const withoutOriginal={calibrationId:'unrecorded',snapshot:null};
 assert.equal(badge(state([shot({...withoutOriginal,grindSetting:9})])),false);
 assert.equal(badge(state([shot({...withoutOriginal,grindSetting:4})])),true);
});
test('R192 temperature, five ratings, style, coffee and version gates remain unchanged',()=>{
 const base=state([shot({tempC:101})]);
 assert.equal(badge(base),false);
 assert.equal(badge(state([shot({tasteScales:{...green,sweetness:null}})])),false);
 assert.equal(badge(state([shot()]),'coffee','Fast-Flow'),false);
 assert.equal(badge(state([shot()]),'other','Turbo'),false);
 assert.equal(badge(state([shot({setupVersionId:'obsolete'})])),false);
 assert.equal(badge(state([shot({doseG:0})])),false);
 assert.equal(badge(state([shot({hidden:true})])),false);
});
