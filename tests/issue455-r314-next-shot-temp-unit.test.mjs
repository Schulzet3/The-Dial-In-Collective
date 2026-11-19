import test from 'node:test';
import assert from 'node:assert/strict';
import {nextShotAdjustment,nextShotGuidance} from '../site/lib/ui.js';

// Entirely synthetic archived/imported context, no member/provider data.
const shot=()=>({id:'synthetic',doseG:18,yieldG:36,timeS:27,grindSetting:3.2,tempC:93,notes:'Private original note',tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}});
const advice=()=>({next:{tempC:94},text:'Try changing only the temperature.',evidenceNote:'Exploratory heuristic, not proven taste improvement.'});
test('R314 valid C/F temperature arrows use original measured Celsius',()=>{
 const sh=shot(),a=advice(),before=structuredClone(sh);
 assert.deepEqual(nextShotAdjustment(a,sh,true,'C'),{label:'Temperature',before:'93',after:'94',unit:'°C',keep:'dose, grind, and yield'});
 assert.deepEqual(nextShotAdjustment(a,sh,true,'F'),{label:'Temperature',before:'199',after:'201',unit:'°F',keep:'dose, grind, and yield'});
 assert.deepEqual(sh,before);
});
test('R314 invalid historical unit is consistent Fahrenheit, never a fictional scale or markup',()=>{
 for(const invalid of ['K','Kelvin','',null,undefined,'<img src=x onerror=alert(1)>']){
  const sh=shot(),unchanged=structuredClone(sh),a=advice();
  const delta=nextShotAdjustment(a,sh,true,invalid);
  assert.equal(delta.unit,'°F');
  assert.equal(delta.before,'199');
  assert.equal(delta.after,'201');
  const html=nextShotGuidance(a,sh,true,invalid);
  assert.match(html,/199/);assert.match(html,/201/);assert.match(html,/°F/);
  assert.doesNotMatch(html,/<img|onerror=|°Kelvin|°K/);
  assert.match(html,/Exploratory heuristic, not proven taste improvement/);
  assert.deepEqual(sh,unchanged);
 }
});
test('R314 optional temperature OFF preserves text guidance; grind-only arrow unaffected',()=>{
 const sh=shot(),before=structuredClone(sh);
 assert.equal(nextShotAdjustment(advice(),sh,false,'K'),null);
 assert.match(nextShotGuidance(advice(),sh,false,'K'),/Try changing only the temperature/);
 const grind=nextShotAdjustment({next:{grindSetting:3.1}},sh,false,'<bad>');
 assert.equal(grind.label,'Grind');assert.equal(grind.before,'3.2');
 assert.equal(grind.after,'3.1');assert.equal(grind.unit,'');
 assert.deepEqual(sh,before);
});
