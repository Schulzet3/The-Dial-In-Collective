import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,translateGrind} from '../site/lib/engine.js';
import {activeVersion,selectedBasket} from '../site/lib/model.js';

const fixture=()=>{
 const s=hydrate(rawFixture()),v=activeVersion(s),coffee=s.coffees[0];
 const basket=selectedBasket(s,coffee.id);
 return {s,v,coffee,basket};
};
const prior=(coffee,extra={})=>({
 id:'old-shot',coffeeId:coffee.id,setupVersionId:'previous-version',
 calibrationId:'previous-cal',basketId:'previous-basket',
 style:'Turbo',feedMode:'standard',grindSetting:3,
 dialedIn:true,hidden:false,
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 snapshot:{grinder:'Test grinder',burrs:'Test burrs',grinderMin:0,grinderMax:5},...extra
});
test('matching grinder with different calibration ranges translates an unproven old dial',()=>{
 const {s,v,coffee,basket}=fixture();
 v.grinderMin=10;v.grinderMax=60;
 const sh=prior(coffee);s.shots.push(sh);
 const advice=grindGuidance(s,coffee,'Turbo',basket,'standard');
 assert.equal(advice.value,40); // 3/5 through 0–5 maps to 40 in 10–60.
 assert.equal(advice.proven,false);
 assert.match(advice.source,/relative range estimate/);
 assert.equal(sh.grindSetting,3); // Historical measurement is immutable.
});
test('unchanged espresso ranges retain the same number as an unproven reference',()=>{
 const {s,coffee,basket}=fixture();s.shots.push(prior(coffee));
 const advice=grindGuidance(s,coffee,'Turbo',basket,'standard');
 assert.equal(advice.value,3);
 assert.equal(advice.proven,false);
});
test('missing or malformed old calibration bounds never masquerade as measured reference',()=>{
 for(const bounds of [{grinderMin:null,grinderMax:5},{grinderMin:0,grinderMax:null},{grinderMin:5,grinderMax:5}]){
  const {s,v,coffee,basket}=fixture();v.grinderMin=10;v.grinderMax=60;
  const sh=prior(coffee,{snapshot:{grinder:'Test grinder',burrs:'Test burrs',...bounds}});
  s.shots.push(sh);
  assert.equal(translateGrind(sh,v),null);
  const advice=grindGuidance(s,coffee,'Turbo',basket,'standard');
  assert.equal(advice.value,47.5); // Normal unproven Turbo fallback.
  assert.match(advice.source,/Espresso range starting estimate/);
  assert.equal(advice.proven,false);
 }
});
test('current-calibration exact successful grind outranks translated old version',()=>{
 const {s,v,coffee,basket}=fixture();v.grinderMin=10;v.grinderMax=60;
 s.shots.push(prior(coffee),prior(coffee,{
  id:'current-shot',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,grindSetting:22,snapshot:{grinder:'Test grinder',burrs:'Test burrs',grinderMin:10,grinderMax:60}
 }));
 const advice=grindGuidance(s,coffee,'Turbo',basket,'standard');
 assert.equal(advice.value,22);
 assert.equal(advice.proven,true);
});
test('unrelated grinder/burr snapshot cannot become a translated old reference',()=>{
 const {s,v,coffee,basket}=fixture();v.grinderMin=10;v.grinderMax=60;
 s.shots.push(prior(coffee,{snapshot:{grinder:'Other grinder',burrs:'Other burrs',grinderMin:0,grinderMax:5}}));
 const advice=grindGuidance(s,coffee,'Turbo',basket,'standard');
 assert.equal(advice.value,47.5);
 assert.equal(advice.proven,false);
});

test('out-of-range historical dial readings do not become invented range endpoints',()=>{
 for(const grinderSetting of [-0.1,5.1]){
  const {s,v,coffee,basket}=fixture();
  v.grinderMin=10;v.grinderMax=60;
  const sh=prior(coffee,{grindSetting:grinderSetting});
  const before=structuredClone(sh);
  assert.equal(translateGrind(sh,v),null);
  s.shots.push(sh);
  const guidance=grindGuidance(s,coffee,'Turbo',basket,'standard');
  assert.equal(guidance.value,47.5);
  assert.equal(guidance.proven,false);
  assert.match(guidance.source,/Espresso range starting estimate/);
  assert.deepEqual(sh,before,'an existing measured shot must not be rewritten');
 }
});

test('old same-version calibration also ignores recorded out-of-range grind',()=>{
 const {s,v,coffee,basket}=fixture();
 v.grinderMin=10;v.grinderMax=60;
 s.shots.push(prior(coffee,{
  setupVersionId:v.id,calibrationId:'previous-cal',timestamp:'2026-10-20T12:00:00Z',
  grindSetting:5.1
 }));
 const guidance=grindGuidance(s,coffee,'Turbo',basket,'standard');
 assert.equal(guidance.value,47.5);
 assert.equal(guidance.proven,false);
 assert.match(guidance.source,/Espresso range starting estimate/);
});

test('old espresso-scale endpoints remain valid translation evidence',()=>{
 for(const [grindSetting,expected] of [[0,10],[5,60]]){
  const {s,v,coffee,basket}=fixture();
  v.grinderMin=10;v.grinderMax=60;
  const sh=prior(coffee,{grindSetting});
  assert.equal(translateGrind(sh,v),expected);
  s.shots.push(sh);
  const guidance=grindGuidance(s,coffee,'Turbo',basket,'standard');
  assert.equal(guidance.value,expected);
  assert.equal(guidance.proven,false);
  assert.match(guidance.source,/relative range estimate/);
 }
});
