import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {prefill} from '../site/lib/engine.js';

// R455-187: synthetic archived local state only. Never member/provider writes.
const priorAt='2026-11-10T09:00:00Z',newAt='2026-11-11T09:00:00Z';
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),basket=v.baskets[0];
 v.advanced.temperature=true;
 v.grinderMin=0;v.grinderMax=5;
 v.calibrations.push({id:'historical-8-10',min:8,max:10,at:priorAt});
 const shot=(id,timestamp,patch={})=>({
  id,coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Turbo',feedMode:'standard',timestamp,
  doseG:18,yieldG:36,timeS:16,grindSetting:2,tempC:93,
  hidden:false,dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:3},
  snapshot:null,notes:'Keep original private notes',...patch
 });
 const read=()=>prefill(s,'coffee',{style:'Turbo',basketId:basket.id,feedMode:'standard'});
 return {s,v,basket,shot,read};
}
test('R187 newer original-range valid old grind outside current range seeds dose and temp, not grind',()=>{
 const {s,shot,read}=fixture();
 s.shots=[shot('current',priorAt),shot('original-valid',newAt,{
  calibrationId:'historical-8-10',grindSetting:9,doseG:24,tempC:96
 })];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,24);assert.equal(p.tempC,96);
 assert.equal(p.grindSetting,2);
 assert.deepEqual(p.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.equal(p.notes,'');assert.deepEqual(s,before);
});
test('R187 valid old-calibration only history keeps original measured dose/temp without old dial transfer',()=>{
 const {s,shot,read}=fixture();
 s.shots=[shot('original-valid',newAt,{calibrationId:'historical-8-10',
  grindSetting:9,doseG:24,tempC:96})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,24);assert.equal(p.tempC,96);
 assert.equal(p.grindSetting,'');assert.deepEqual(s,before);
});
test('R187 both inclusive old-calibration endpoints remain valid for measured dose/temp',()=>{
 for(const grindSetting of [8,10]){
  const {s,shot,read}=fixture();
  s.shots=[shot('current',priorAt),shot('original-endpoint',newAt,{
   calibrationId:'historical-8-10',grindSetting,doseG:24,tempC:96})];
  const before=structuredClone(s),p=read();
  assert.equal(p.doseG,24);assert.equal(p.tempC,96);
  assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
 }
});
test('R187 outside and reversed original range never displace valid current measurement',()=>{
 for(const bad of [
  {calibrationId:'historical-8-10',grindSetting:7.9},
  {calibrationId:'historical-8-10',grindSetting:10.1},
  {calibrationId:'reversed-10-8',grindSetting:9}
 ]){
  const {s,v,shot,read}=fixture();
  v.calibrations.push({id:'reversed-10-8',min:10,max:8,at:priorAt});
  s.shots=[shot('current',priorAt),shot('bad',newAt,{
   ...bad,doseG:25,tempC:99})];
  const before=structuredClone(s),p=read();
  assert.equal(p.doseG,18);assert.equal(p.tempC,93);
  assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
 }
});
test('R187 unknown no-snapshot historical calibration retains conservative active-range fallback',()=>{
 const {s,shot,read}=fixture();
 s.shots=[shot('current',priorAt),shot('unknown',newAt,{
  calibrationId:'unknown-legacy',grindSetting:9,doseG:25,tempC:99})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,18);assert.equal(p.tempC,93);
 assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
});
test('R187 explicit valid original snapshot qualifies even when calibration record missing',()=>{
 const {s,shot,read}=fixture();
 s.shots=[shot('current',priorAt),shot('snapshot-only',newAt,{
  calibrationId:'unknown-legacy',grindSetting:9,doseG:23,tempC:97,
  snapshot:{grinderMin:8,grinderMax:10}})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,23);assert.equal(p.tempC,97);
 assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
});
test('R187 malformed old numeric measurements do not qualify despite valid original dial',()=>{
 const {s,shot,read}=fixture();
 s.shots=[shot('current',priorAt),shot('invalid-time',newAt,{
  calibrationId:'historical-8-10',grindSetting:9,timeS:null,doseG:25,tempC:99})];
 const before=structuredClone(s),p=read();
 assert.equal(p.doseG,18);assert.equal(p.tempC,93);
 assert.equal(p.grindSetting,2);assert.deepEqual(s,before);
});
