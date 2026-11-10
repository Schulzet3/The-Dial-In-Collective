import test from 'node:test';
import assert from 'node:assert/strict';
import {hasLocalSuccess} from '../site/lib/model.js';
import {shotCard} from '../site/cloud/shot_card.js';

// R455-157: synthetic imported rows only; never actual member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(patch={})=>({
 id:'archived-green',coffeeId:'coffee',setupVersionId:'version',style:'Turbo',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,
 timeS:17,grindSetting:5.5,tempC:92,notes:'Private original archived notes',
 timestamp:'2026-11-09T10:00:00Z',...patch
});
const state=shots=>({activeSetupId:'setup',setups:[{
 id:'setup',activeVersionId:'version',
 versions:[{id:'version',calibrationId:'calibration',grinderMin:0,grinderMax:10}]
}],shots});
const success=s=>hasLocalSuccess(s,'coffee','Turbo');

test('R157 impossible archived grind cannot certify overview but keeps original greens and notes',()=>{
 for(const grindSetting of [null,undefined,'5.5',NaN,Infinity,-Infinity,-.1,10.1]){
  const sh=shot({grindSetting}),s=state([sh]),before=structuredClone(s);
  assert.equal(success(s),false,String(grindSetting));
  const html=shotCard(sh,{expanded:true,activeVersionId:'version'});
  assert.match(html,/Dialed In/);
  assert.match(html,/Private original archived notes/);
  assert.deepEqual(s,before,'No historical record mutation');
 }
});
test('R157 invalid recorded temperature cannot certify measured success',()=>{
 for(const tempC of [69.9,100.1,'93',NaN,Infinity,-Infinity]){
  const sh=shot({tempC}),s=state([sh]),before=structuredClone(s);
  assert.equal(success(s),false,String(tempC));
  assert.match(shotCard(sh,{expanded:true,activeVersionId:'version'}),/Dialed In/);
  assert.deepEqual(s,before);
 }
});
test('R157 inclusive actual bounds, no temperature, valid own coffee and style still qualify',()=>{
 for(const patch of [
  {grindSetting:0,tempC:70},{grindSetting:10,tempC:100},
  {grindSetting:5.5,tempC:null},{grindSetting:5.5,tempC:undefined},
  {grindSetting:5.5,tempC:92}
 ]){
  const s=state([shot(patch)]),before=structuredClone(s);
  assert.equal(success(s),true,JSON.stringify(patch));
  assert.equal(hasLocalSuccess(s,'coffee','Fast-Flow'),false);
  assert.equal(hasLocalSuccess(s,'other','Turbo'),false);
  assert.deepEqual(s,before);
 }
});
test('R157 new bad record cannot suppress older valid success',()=>{
 const s=state([shot({id:'valid',grindSetting:2.5,tempC:90}),
  shot({id:'newer-bad',grindSetting:11.5})]),before=structuredClone(s);
 assert.equal(success(s),true);
 assert.deepEqual(s,before);
 assert.equal(success(state([shot({grindSetting:11.5})])),false);
});
test('R157 legacy snapshot without recorded grind range remains supported',()=>{
 const s=state([shot({grindSetting:1.5,tempC:null})]);
 delete s.setups[0].versions[0].grinderMin;
 delete s.setups[0].versions[0].grinderMax;
 assert.equal(success(s),true);
});
