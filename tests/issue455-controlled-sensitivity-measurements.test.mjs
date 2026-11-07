import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {learnSensitivity,nextAdvice,recommendation} from '../site/lib/engine.js';

// Synthetic archived observations only. No real member or provider records.
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const shot={id:'current',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:v.baskets[0].id,style:'Turbo',
  feedMode:'standard',doseG:18,yieldG:36,timeS:10,grindSetting:1.2,tempC:93,
  timestamp:'2026-11-06T23:00:00Z',hidden:false,dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1}};
 return {s,v,shot};
}
function observations(shot,grinds=[.8,.9,1.0],times=[60,45,30],overrides={}){
 return grinds.map((grindSetting,i)=>({
  ...shot,id:'historic-'+i,grindSetting,timeS:times[i],
  timestamp:`2026-11-05T12:0${i}:00Z`,notes:'Keep original private history',
  snapshot:{grinderMin:0,grinderMax:5},...overrides
 }));
}
function advice(s,shot){
 return nextAdvice(s,shot,recommendation(s,shot.coffeeId,{style:shot.style,ignoreAdvice:true}));
}
test('R084 invalid historical grinder range cannot calibrate next-step timing',()=>{
 const {s,v,shot}=fixture(),rows=observations(shot,[8,8.1,8.2]);
 s.shots.push(...rows);
 const before=structuredClone(s.shots);
 assert.equal(learnSensitivity(rows,v),null);
 const suggestion=advice(s,shot);
 assert.equal(suggestion.next.grindSetting,1.0,'retain existing bounded step');
 assert.doesNotMatch(suggestion.text,/Sized from your own comparable adjustments/);
 assert.deepEqual(s.shots,before);
});
test('R084 valid same-coffee controlled pairs still size observed movement',()=>{
 const {s,v,shot}=fixture(),rows=observations(shot);
 s.shots.push(...rows);
 const before=structuredClone(s.shots),observed=learnSensitivity(rows,v);
 assert.equal(observed.samples,2);
 assert.equal(advice(s,shot).next.grindSetting,1.1);
 assert.match(advice(s,shot).text,/Sized from your own comparable adjustments/);
 assert.deepEqual(s.shots,before);
});
test('R084 inclusive current espresso grinder bounds retain legitimate timing evidence',()=>{
 const {v,shot}=fixture(),rows=observations(shot,[4.7,4.85,5]);
 assert.equal(learnSensitivity(rows,v)?.samples,2);
});
test('R084 malformed dose, yield and time are not fitted as empirical timing',()=>{
 const {v,shot}=fixture();
 for(const changes of [{timeS:181},{doseG:41},{yieldG:201},{doseG:0},{yieldG:0}]){
  const rows=observations(shot,[.8,.9,1.0],[60,45,30],changes);
  const before=structuredClone(rows);
  assert.equal(learnSensitivity(rows,v),null,JSON.stringify(changes));
  assert.deepEqual(rows,before);
 }
});
test('R084 invalid archived temperatures cannot impersonate controlled pairs',()=>{
 const {v,shot}=fixture(),rows=observations(shot,[.8,.9,1.0],[60,45,30],{tempC:180});
 assert.equal(learnSensitivity(rows,v),null);
 assert.equal(learnSensitivity(observations(shot),v)?.samples,2);
});
test('R084 historical snapshot bounds reject out-of-range sensitivity without version',()=>{
 const {shot}=fixture(),rows=observations(shot,[8,8.1,8.2]);
 assert.equal(learnSensitivity(rows),null);
 assert.equal(learnSensitivity(observations(shot))?.samples,2);
});
test('R084 eligible legacy readings without an old range snapshot remain intact',()=>{
 const {v,shot}=fixture(),rows=observations(shot);
 rows.forEach(sh=>delete sh.snapshot);
 const before=structuredClone(rows);
 assert.equal(learnSensitivity(rows,v)?.samples,2);
 assert.deepEqual(rows,before);
});
