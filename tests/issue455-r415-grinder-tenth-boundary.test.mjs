import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createSetup,activeVersion} from '../site/lib/model.js';
import {nextAdvice} from '../site/lib/engine.js';

const rec={time:{low:20,high:30,center:25}};
function check({min=.15,max=2.55,grind=.2,timeS=10,extraction=2,missing=false}={}){
 const s=blankState();
 createSetup(s,{name:'Synthetic setup',basketDoseG:18,grinderMin:min,grinderMax:max});
 const v=activeVersion(s);
 const tasteScales={extraction,body:3,clarity:5,sweetness:5,astringency:1};
 if(missing)delete tasteScales.sweetness;
 const shot={id:'test-shot',coffeeId:'test-coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,feedMode:'standard',style:'Traditional',
  basketId:v.defaultBasketId,doseG:18,yieldG:36,timeS,grindSetting:grind,
  tasteScales,notes:'Original private note'};
 const original=structuredClone({s,shot}),advice=nextAdvice(s,shot,rec);
 assert.deepEqual({s,shot},original,'original shot, five tastes and private history unchanged');
 if(advice.next){
  const g=advice.next.grindSetting,y=advice.next.yieldCenter;
  const changedG=Math.abs(g-grind)>1e-8,changedY=Math.abs(y-36)>1e-8;
  assert.equal(Number(changedG)+Number(changedY),1,'exactly one real changed control');
  if(changedG){
   assert.ok(g>=min&&g<=max,'new grind inside user espresso range');
   assert.ok(Math.abs(g*10-Math.round(g*10))<1e-8,'new grind is on the tenths grid');
  }else assert.equal(g,grind,'unchanged original grind retains measured precision');
 }
 return {advice,shot};
}
test('R415 fractional floor: no false finer move, existing longer-yield fallback',()=>{
 const {advice,shot}=check({grind:.2,timeS:10,extraction:2});
 assert.match(advice.title,/longer yield/i);
 assert.deepEqual(advice.next,{grindSetting:shot.grindSetting,yieldCenter:41});
 assert.doesNotMatch(advice.text,/try grind/i);
});
test('R415 fractional ceiling: no invalid half-step, existing shorter-yield fallback',()=>{
 const {advice,shot}=check({grind:2.5,timeS:40,extraction:4});
 assert.match(advice.title,/shorter yield/i);
 assert.deepEqual(advice.next,{grindSetting:shot.grindSetting,yieldCenter:31});
 assert.doesNotMatch(advice.text,/try grind/i);
});
test('R415 narrow fractional range: no available finer tenth',()=>{
 const {advice,shot}=check({min:.15,max:.25,grind:.2});
 assert.match(advice.title,/longer yield/i);
 assert.deepEqual(advice.next,{grindSetting:shot.grindSetting,yieldCenter:41});
});
test('R415 valid finer tenth stays valid and changes only grind',()=>{
 const {advice,shot}=check({grind:.3});
 assert.match(advice.title,/little finer/i);
 assert.deepEqual(advice.next,{grindSetting:.2,yieldCenter:shot.yieldG});
});
test('R415 all five green ratings preserve Dialed In without adjustment',()=>{
 const {advice}=check({grind:.2,timeS:25,extraction:3});
 assert.match(advice.title,/dialed in/i);
 assert.equal(advice.next,null);
});
test('R415 missing fifth rating never produces adjustment',()=>{
 const {advice}=check({grind:.2,missing:true});
 assert.match(advice.title,/finish your taste ratings/i);
 assert.equal(advice.next,null);
});

test('R415 existing out-of-range historical grind retains exact review guidance',()=>{
 const {advice,shot}=check({min:2.5,max:3.5,grind:8,timeS:10,extraction:2});
 assert.match(advice.title,/review your grinder espresso range/i);
 assert.match(advice.text,/outside the current setup espresso range/i);
 assert.equal(advice.next,null);
 assert.equal(shot.grindSetting,8);
});
