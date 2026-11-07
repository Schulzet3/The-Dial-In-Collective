import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// R455-096: synthetic local archival cache, never a real member or hosted write.
const tastes={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
const make=(cachedNext,extra={})=>{
 const state=hydrate(rawFixture());
 activeVersion(state).advanced.temperature=true;
 state.shots.push({
  id:'rated-shot',coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
  basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
  doseG:20,yieldG:50,timeS:22,grindSetting:1.2,tempC:91,
  timestamp:'2026-11-06T12:00:00Z',dialedIn:false,tasteScales:{...tastes},
  notes:'Preserve original private note and cached advice',
  suggestion:{title:'Original cached next',text:'Original text',next:cachedNext},...extra
 });
 return state;
};
const guide=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
test('R096 invalid cached next yield re-evaluates rather than publishing unloggable output',()=>{
 for(const yieldCenter of [0,4.9,200.1,201,Infinity,NaN,'55']){
  const s=make({grindSetting:1.2,yieldCenter}),before=structuredClone(s);
  const r=guide(s);
  assert.equal(r.source,'Adjustment from your latest taste rating',String(yieldCenter));
  assert.equal(r.yield.center,55);
  assert.equal(r.doseG,20);assert.equal(r.grind.value,1.2);assert.equal(r.tempC,91);
  assert.deepEqual(s,before,'Historical suggestion, notes, measurements and five ratings immutable');
 }
});
test('R096 invalid cached grinder setting re-evaluates instead of silently clipping an old plan',()=>{
 for(const grindSetting of [-.1,5.1,Infinity,NaN,'1.2']){
  const s=make({grindSetting,yieldCenter:60}),before=structuredClone(s),r=guide(s);
  assert.equal(r.yield.center,55,String(grindSetting));
  assert.equal(r.grind.value,1.2);
  assert.deepEqual(s,before);
 }
});
test('R096 invalid cached temperature re-evaluates without erasing the measured temperature',()=>{
 for(const tempC of [0,69.9,100.1,Infinity,NaN,'90']){
  const s=make({grindSetting:1.2,yieldCenter:60,tempC}),before=structuredClone(s),r=guide(s);
  assert.equal(r.yield.center,55,String(tempC));assert.equal(r.tempC,91);
  assert.deepEqual(s,before);
 }
});
test('R096 invalid cached dose is not imported into a next shot',()=>{
 for(const doseG of [0,4.9,40.1,Infinity,NaN,'20']){
  const s=make({grindSetting:1.2,yieldCenter:60,doseG}),before=structuredClone(s),r=guide(s);
  assert.equal(r.doseG,20,String(doseG));assert.equal(r.yield.center,55);
  assert.deepEqual(s,before);
 }
});
test('R096 inclusive existing espresso/temperature/physical endpoints remain valid cached targets',()=>{
 for(const [grindSetting,tempC] of [[0,70],[5,100]]){
  const s=make({grindSetting,yieldCenter:60,tempC}),before=structuredClone(s),r=guide(s);
  assert.equal(r.grind.value,grindSetting);
  assert.equal(r.tempC,tempC);assert.equal(r.yield.center,60);
  assert.deepEqual(s,before);
 }
});
test('R096 valid cached single-variable yield and a missing cache retain prior semantics',()=>{
 const valid=make({grindSetting:1.2,yieldCenter:60}),before=structuredClone(valid);
 assert.equal(guide(valid).yield.center,60);
 assert.deepEqual(valid,before);
 const missing=make(null,{suggestion:null}),missingBefore=structuredClone(missing);
 const r=guide(missing);assert.equal(r.yield.center,55);assert.equal(r.grind.value,1.2);
 assert.deepEqual(missing,missingBefore);
});
test('R096 missing/incomplete taste ratings never invent a next adjustment',()=>{
 const s=make({grindSetting:1.2,yieldCenter:999},{
  tasteScales:{...tastes,sweetness:null},suggestion:null
 });
 const before=structuredClone(s),r=guide(s);
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.deepEqual(s,before);
});
