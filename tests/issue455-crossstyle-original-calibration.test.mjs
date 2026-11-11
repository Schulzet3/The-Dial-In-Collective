import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {goodTaste} from '../site/lib/constants.js';

// #455 R189: synthetic local state only, no real user or provider mutation.
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),basket=v.baskets[0];
 v.grinderMin=0;v.grinderMax=5;
 v.calibrations.push({id:'old-range-8-10',min:8,max:10,at:'2026-10-01T00:00:00Z'});
 v.calibrations.push({id:'old-reversed',min:10,max:8,at:'2026-10-01T00:00:00Z'});
 const shot=(overrides={})=>({
  id:'archived-turbo',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:'old-range-8-10',basketId:basket.id,
  style:'Turbo',feedMode:'standard',timestamp:'2026-11-10T10:00:00Z',
  doseG:18,yieldG:50,timeS:14,grindSetting:9,tempC:93,
  hidden:false,dialedIn:true,tasteScales:goodTaste(),
  snapshot:null,notes:'Private historical note, unchanged',...overrides
 });
 const fast=()=>recommendation(s,'coffee',{style:'Fast-Flow',basketId:basket.id,feedMode:'standard'});
 const traditional=()=>recommendation(s,'coffee',{style:'Traditional',basketId:basket.id,feedMode:'standard'});
 return {s,v,basket,shot,fast,traditional};
}
test('R189 valid old calibration beyond current range contributes ratio only to Fast-Flow',()=>{
 const {s,shot,fast}=fixture();s.shots=[shot()];
 const before=structuredClone(s),r=fast();
 assert.equal(r.turboFallback?.ratioOnly,true);
 assert.equal(r.turboFallback?.compatibleShots,1);
 assert.match(r.reasons.join(' '),/ratio-only/i);
 assert.ok(r.grind.value>=0&&r.grind.value<=5);
 assert.deepEqual(s,before);
});
test('R189 valid old calibration qualifies same-coffee generic cross-style ratio hint',()=>{
 const {s,shot,traditional}=fixture();s.shots=[shot()];
 const before=structuredClone(s),r=traditional();
 assert.match(r.reasons.join(' '),/other styles/i);
 assert.equal(r.familyId,null);
 assert.deepEqual(s,before);
});
test('R189 valid current-range Turbo succeeds as before',()=>{
 const {s,v,shot,fast}=fixture();
 s.shots=[shot({calibrationId:v.calibrationId,grindSetting:2})];
 assert.equal(fast().turboFallback?.ratioOnly,true);
});
test('R189 invalid original dial above or below old bounds never seeds ratio',()=>{
 for(const grindSetting of [7.9,10.1]){
  const {s,shot,fast}=fixture();s.shots=[shot({grindSetting})];
  const before=structuredClone(s);
  assert.equal(fast().turboFallback,undefined);
  assert.deepEqual(s,before);
 }
});
test('R189 reversed old range and invalid recorded temperature do not seed ratio',()=>{
 for(const patch of [{calibrationId:'old-reversed'},{tempC:105}]){
  const {s,shot,fast}=fixture();s.shots=[shot(patch)];
  assert.equal(fast().turboFallback,undefined);
 }
});
test('R189 unknown old scale outside current conservatively stays excluded',()=>{
 const {s,shot,fast}=fixture();
 s.shots=[shot({calibrationId:'unrecorded-range',grindSetting:9})];
 assert.equal(fast().turboFallback,undefined);
});
test('R189 explicit complete original snapshot is valid; missing optional grind stays eligible',()=>{
 for(const patch of [
  {calibrationId:'unrecorded-range',snapshot:{grinderMin:8,grinderMax:10}},
  {calibrationId:'unrecorded-range',grindSetting:null,snapshot:null}
 ]){
  const {s,shot,fast}=fixture();s.shots=[shot(patch)];
  const before=structuredClone(s),r=fast();
  assert.equal(r.turboFallback?.ratioOnly,true);
  assert.deepEqual(s,before);
 }
});
test('R189 malformed measured recipe or non-green ratings cannot seed ratio',()=>{
 for(const patch of [{doseG:0},{tasteScales:{...goodTaste(),sweetness:4}}]){
  const {s,shot,fast}=fixture();s.shots=[shot(patch)];
  assert.equal(fast().turboFallback,undefined);
 }
});
