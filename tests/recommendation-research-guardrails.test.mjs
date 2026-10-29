import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

function setup(overrides={}) {
 const state=hydrate(rawFixture()),v=activeVersion(state);
 v.advanced.temperature=true;
 const shot={id:'research-shot',coffeeId:'coffee',setupVersionId:v.id,style:'Turbo',
  basketId:'basketv',calibrationId:v.calibrationId,feedMode:'standard',
  doseG:18,yieldG:36,timeS:22,grindSetting:1.2,tempC:93,
  timestamp:'2026-10-29T12:00:00Z',dialedIn:false,hidden:false,
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},...overrides};
 return {state,shot,reference:recommendation(state,'coffee',{ignoreAdvice:true})};
}
test('research F012: incomplete and invalid ratings never create numeric next-shot advice',()=>{
 for(const tasteScales of [null,{extraction:2,body:3,clarity:4,sweetness:4,astringency:null},
  {extraction:0,body:3,clarity:5,sweetness:5,astringency:1}]) {
  const {state,shot,reference}=setup({tasteScales});
  const copy=structuredClone(shot);
  const advice=nextAdvice(state,shot,reference);
  assert.equal(advice.next,null);
  assert.match(advice.title,/ratings/i);
  assert.deepEqual(shot,copy);
 }
});
test('research F011: all green stays successful outside nominal time and ratio without changing measurements',()=>{
 const {state,shot,reference}=setup({yieldG:81,timeS:80,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}});
 const before=structuredClone(shot);
 assert.equal(nextAdvice(state,shot,reference).next,null);
 assert.deepEqual(shot,before);
});
test('research F023: yield limits do not masquerade as an adjustment',()=>{
 for(const [yieldG,extraction] of [[200,2],[5,4]]) {
  const {state,shot,reference}=setup({yieldG,tasteScales:{extraction,body:3,clarity:5,sweetness:5,astringency:1}});
  const advice=nextAdvice(state,shot,reference);
  assert.equal(advice.next,null);
  assert.match(advice.text,/limit/i);
 }
});
test('research F025: temperature at hard lower bound abstains instead of recommending no-op',()=>{
 const {state,shot,reference}=setup({yieldG:200,tempC:70,tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:2}});
 assert.equal(nextAdvice(state,shot,reference).next,null);
});
test('research F013: prior calibration family preserves ratio but does not claim current time',()=>{
 const {state,shot}=setup({tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},dialedIn:true,calibrationId:'old-cal',familyId:'family-research',timeS:75,yieldG:45});
 state.families.push({id:'family-research',coffeeId:'coffee',style:'Turbo'});
 state.shots.push(shot);
 const prior=structuredClone(state);
 const rec=recommendation(state,'coffee',{ignoreAdvice:true});
 assert.equal(rec.ratio.center,2.5);
 assert.deepEqual([rec.time.low,rec.time.high],[12,18]);
 assert.equal(rec.grind.proven,false);
 assert.deepEqual(state,prior);
});
