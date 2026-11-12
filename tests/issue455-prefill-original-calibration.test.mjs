import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {prefill} from '../site/lib/engine.js';

// R186: synthetic restored History only, no member/SQL/Auth/provider writes.
const previous='2026-11-10T09:00:00Z',latest='2026-11-11T09:00:00Z';
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),basket=v.baskets[0];
 v.advanced.temperature=true;
 v.calibrations.push({id:'historical-range',min:3,max:5,at:previous});
 const row=(id,timestamp,patch={})=>({
  id,coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Turbo',feedMode:'standard',timestamp,
  doseG:18,yieldG:36,timeS:16,grindSetting:2,tempC:93,
  hidden:false,dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:3},
  notes:'Preserve private historical note',snapshot:null,...patch
 });
 const read=()=>prefill(s,'coffee',{style:'Turbo',basketId:basket.id,feedMode:'standard'});
 return {s,v,basket,row,read};
}
test('R186 impossible archived original calibration cannot override measured dose/temperature',()=>{
 const {s,row,read}=fixture();
 s.shots=[row('valid',previous),row('bad',latest,{
  calibrationId:'historical-range',grindSetting:2.5,doseG:25,tempC:99
 })];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,18);assert.equal(p.tempC,93);assert.equal(p.grindSetting,2);
 assert.deepEqual(s,before);
});
test('R186 invalid-only old calibration falls back without fabricating controls',()=>{
 const {s,basket,row,read}=fixture();
 s.shots=[row('bad',latest,{calibrationId:'historical-range',
  grindSetting:2.5,doseG:25,tempC:99})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,basket.doseG);assert.equal(p.tempC,null);
 assert.equal(p.grindSetting,'');assert.deepEqual(s,before);
});
test('R186 reversed original calibration cannot seed dose or temperature',()=>{
 const {s,v,row,read}=fixture();
 v.calibrations.push({id:'reversed',min:5,max:3,at:previous});
 s.shots=[row('valid',previous),row('bad',latest,{
  calibrationId:'reversed',grindSetting:4,doseG:26,tempC:98
 })];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,18);assert.equal(p.tempC,93);assert.deepEqual(s,before);
});
test('R186 valid historical endpoints seed dose and temperature, never old-scale grind',()=>{
 for(const grindSetting of [3,5]){
  const {s,row,read}=fixture();
  s.shots=[row('current',previous),row('old',latest,{
   calibrationId:'historical-range',grindSetting,doseG:24,tempC:96
  })];
  const before=structuredClone(s),p=read();
  assert.equal(p.doseG,24);assert.equal(p.tempC,96);
  assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
 }
});
test('R186 missing legacy snapshot/unknown calibration remains backward compatible',()=>{
 const {s,row,read}=fixture();
 s.shots=[row('legacy',latest,{
  calibrationId:'unknown-legacy',grindSetting:2.5,doseG:19.5,tempC:null
 })];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,19.5);assert.equal(p.tempC,null);
 assert.equal(p.grindSetting,'');assert.deepEqual(s,before);
});
test('R186 valid current measurement remains eligible without green ratings',()=>{
 const {s,row,read}=fixture();
 s.shots=[row('non-green',latest,{grindSetting:0,doseG:20,tempC:70})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,20);assert.equal(p.tempC,70);assert.equal(p.grindSetting,0);
 assert.deepEqual(p.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.deepEqual(s,before);
});
test('R186 newer invalid other-feed row does not contaminate Standard Feed prefill',()=>{
 const {s,row,read}=fixture();
 s.shots=[row('valid',previous),row('bad',latest,{
  feedMode:'slow',calibrationId:'historical-range',grindSetting:2.5,doseG:29,tempC:98
 })];
 const p=read();assert.equal(p.doseG,18);assert.equal(p.tempC,93);assert.equal(p.feedMode,'standard');
});
