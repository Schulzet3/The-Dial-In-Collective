import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// R174 synthetic source-only history; no actual member or provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function context(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 v.advanced.temperature=true;s.shots=[];s.families=[];s.communityEvidence={};
 const make=(id,extra={})=>({
  id,coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
  doseG:18,yieldG:45,timeS:16,grindSetting:(v.grinderMin+v.grinderMax)/2,
  tempC:93,tasteScales:{...green},dialedIn:true,
  timestamp:'2026-11-10T12:00:00Z',notes:'Preserve original private notes',
  snapshot:{grinderMin:v.grinderMin,grinderMax:v.grinderMax},...extra
 });
 const rec=()=>recommendation(s,'coffee',{
  style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true
 });
 return {s,v,make,rec};
}
test('R174 invalid explicit archived grinder cannot seed personal temperature',()=>{
 for(const invalid of [-1,Infinity,'2',0,999]){
  const f=context();f.s.shots.push(f.make('invalid',{grindSetting:invalid}));
  const before=structuredClone(f.s),r=f.rec();
  assert.equal(r.tempC,95,String(invalid));
  assert.deepEqual(f.s,before,'original five ratings and private notes unchanged');
 }
});
test('R174 invalid grinder cannot bias legitimate personal temperature',()=>{
 const f=context();f.s.shots.push(f.make('good',{tempC:92}),
  f.make('invalid',{grindSetting:f.v.grinderMax+1,tempC:70}));
 const before=structuredClone(f.s);
 assert.equal(f.rec().tempC,92);
 assert.deepEqual(f.s,before);
});
test('R174 inclusive grinder and temperature measurement endpoints remain valid',()=>{
 const f=context();f.s.shots.push(
  f.make('finest',{grindSetting:f.v.grinderMin,tempC:70}),
  f.make('coarsest',{grindSetting:f.v.grinderMax,tempC:100}));
 assert.equal(f.rec().tempC,85);
});
test('R174 retired original calibration snapshot determines historical eligibility',()=>{
 for(const [grind,expected] of [[10,91],[15,91],[20,91],[9,95],[21,95]]){
  const f=context();f.s.shots.push(f.make('historic',{
   calibrationId:'retired-calibration',grindSetting:grind,tempC:91,
   snapshot:{grinderMin:10,grinderMax:20}}));
  assert.equal(f.rec().tempC,expected,String(grind));
 }
});
test('R174 missing optional legacy grinder preserves measured temperature evidence',()=>{
 const f=context();f.s.shots.push(f.make('legacy',{grindSetting:null,tempC:90}));
 assert.equal(f.rec().tempC,90);
});
test('R174 chosen valid family excludes invalid member from personal temperature',()=>{
 const f=context();f.s.families.push({id:'fam',coffeeId:'coffee',style:'Turbo'});
 f.s.shots.push(f.make('good',{familyId:'fam',tempC:94}),
  f.make('bad',{familyId:'fam',grindSetting:f.v.grinderMax+2,tempC:70}));
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.familyId,'fam');
 assert.equal(r.tempC,94);
 assert.deepEqual(f.s,before);
});
