import test from 'node:test';
import assert from 'node:assert/strict';
import {nextAdvice} from '../site/lib/engine.js';
import {nextShotAdjustment} from '../site/lib/ui.js';

// R317 uses only synthetic local state; no member/provider data.
const state=()=>({activeSetupId:'setup',setups:[{
 id:'setup',activeVersionId:'version',versions:[{
  id:'version',calibrationId:'cal',grinderMin:1,grinderMax:10
 }]
}],shots:[]});
const time={time:{low:20,high:30,center:25}};
const tastes={extraction:3,body:2,clarity:5,sweetness:5,astringency:1};
const shot=(patch={})=>({
 id:'synthetic',coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 style:'Traditional',basketId:'basket',feedMode:'standard',
 doseG:18,yieldG:36,timeS:25,grindSetting:2.45,tempC:93,
 tasteScales:{...tastes},notes:'Private original note',...patch
});

test('R317 changing yield preserves exact non-tenth measured grind, not a second 0.05-unit move',()=>{
 const s=state(),sh=shot(),before=structuredClone(sh);
 const a=nextAdvice(s,sh,time);
 assert.equal(a.next?.yieldCenter,31);
 assert.equal(a.next?.grindSetting,2.45);
 const arrow=nextShotAdjustment(a,sh);
 assert.equal(arrow?.label,'Yield');
 assert.equal(arrow?.before,'36.0');
 assert.equal(arrow?.after,'31.0');
 assert.deepEqual(sh,before);
});

test('R317 previously accepted out-of-range measured grinder value does not create two-control or backwards advice',()=>{
 for(const actual of [0.9,10.1,11]){
  const sh=shot({grindSetting:actual});
  const before=structuredClone(sh);
  const advice=nextAdvice(state(),sh,time);
  assert.equal(advice.next,null);
  assert.match(advice.text,/outside the current setup espresso range/i);
  assert.deepEqual(sh,before);
 }
 const tooCoarse=shot({grindSetting:11,timeS:35,tasteScales:{...tastes,extraction:4,body:3}});
 const advice=nextAdvice(state(),tooCoarse,time);
 assert.equal(advice.next,null,'never recommend a finer clamp while describing a coarser move');
});

test('R317 inclusive espresso bounds, normal tenth setting and genuine finer control remain actionable',()=>{
 for(const grindSetting of [1,2.5,10]){
  const sh=shot({grindSetting});
  const advice=nextAdvice(state(),sh,time);
  assert.equal(advice.next?.grindSetting,grindSetting);
  assert.equal(advice.next?.yieldCenter,31);
 }
 const sh=shot({timeS:15,tasteScales:{...tastes,extraction:2,body:3}});
 const a=nextAdvice(state(),sh,time);
 assert.ok(a.next.grindSetting>=1&&a.next.grindSetting<=10);
 assert.ok(a.next.grindSetting<sh.grindSetting);
 assert.equal(a.next.yieldCenter,sh.yieldG);
 assert.equal(nextShotAdjustment(a,sh)?.label,'Grind');
});

test('R317 incomplete/malformed grinder evidence abstains; five-green success stays unchanged',()=>{
 for(const actual of [null,NaN,Infinity]){
  const sh=shot({grindSetting:actual});
  const a=nextAdvice(state(),sh,time);
  assert.equal(a.next,null);
 }
 const allGreen=shot({grindSetting:11,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}});
 const saved=structuredClone(allGreen);
 const a=nextAdvice(state(),allGreen,time);
 assert.equal(a.next,null);
 assert.match(a.title,/Dialed in/i);
 assert.deepEqual(allGreen,saved);
});
