import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket,coffeeState} from '../site/lib/model.js';
import {familyStats,familiesFor,recommendation} from '../site/lib/engine.js';

// R173 is synthetic read-only owner-state evidence, NOT physical tasting or production data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),c=s.coffees.find(x=>x.id==='coffee');
 const basket=selectedBasket(s,c.id);
 s.preferences='';s.shots=[];s.families=[];s.communityEvidence={};
 const make=(patch={})=>({
  id:'success',coffeeId:c.id,setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Traditional',feedMode:'standard',
  familyId:'family',dialedIn:true,hidden:false,tasteScales:{...green},
  doseG:18,yieldG:36,timeS:27,grindSetting:(v.grinderMin+v.grinderMax)/2,tempC:92,
  timestamp:'2026-11-10T12:00:00Z',
  notes:'Original private note must remain untouched',
  snapshot:{grinderMin:v.grinderMin,grinderMax:v.grinderMax},
  ...patch
 });
 const family={id:'family',coffeeId:c.id,style:'Traditional',createdAt:'2026-11-10T12:00:00Z'};
 s.families.push(family);
 const rec=()=>recommendation(s,c.id,{
  style:'Traditional',basketId:basket.id,feedMode:'standard',ignoreAdvice:true
 });
 return {s,v,c,basket,make,family,rec};
}
test('R173 impossible explicit grinder/temperature cannot anchor a successful ratio family',()=>{
 for(const patch of [
  {grindSetting:-1},{grindSetting:Infinity},{grindSetting:'2'},
  {grindSetting:6},{tempC:69},{tempC:101},{tempC:NaN},{tempC:'92'}
 ]){
  const f=fixture(),baseline=f.rec();
  f.s.shots.push(f.make(patch));const before=structuredClone(f.s);
  assert.equal(familyStats(f.s,'family')?.count,0,JSON.stringify(patch));
  assert.equal(familiesFor(f.s,f.c.id,'Traditional').length,0);
  const result=f.rec();
  assert.equal(result.familyId,null,JSON.stringify(patch));
  assert.equal(result.ratio.center,baseline.ratio.center);
  assert.deepEqual(f.s,before,'History, notes and all five taste scores unchanged');
 }
});
test('R173 inclusive original calibration/temperature endpoints remain successful evidence',()=>{
 const tmp=fixture();
 for(const patch of [
  {grindSetting:tmp.v.grinderMin,tempC:70},
  {grindSetting:tmp.v.grinderMax,tempC:100},
  {grindSetting:null,tempC:null}
 ]){
  const f=fixture();f.s.shots.push(f.make(patch));
  assert.equal(familyStats(f.s,'family')?.count,1);
  assert.equal(familiesFor(f.s,f.c.id,'Traditional').length,1);
  const before=structuredClone(f.s),r=f.rec();
  assert.equal(r.familyId,'family');
  assert.equal(r.source,'Your dialed in window');
  assert.deepEqual(f.s,before);
 }
});
test('R173 historic espresso snapshot governs former dial range, not present live range',()=>{
 for(const [grind,eligible] of [[15,true],[9,false],[21,false]]){
  const f=fixture();
  f.s.shots.push(f.make({
   calibrationId:'old-calibration',grindSetting:grind,
   snapshot:{grinderMin:10,grinderMax:20}
  }));
  assert.equal(familyStats(f.s,'family')?.count,Number(eligible));
  assert.equal(f.rec().familyId,eligible?'family':null);
 }
});
test('R173 archived calibration registry is fallback when the historic shot lacks a range snapshot',()=>{
 for(const [grind,eligible] of [[10,true],[20,true],[9,false],[21,false]]){
  const f=fixture();
  f.v.calibrations.push({id:'old-calibration',min:10,max:20});
  f.s.shots.push(f.make({calibrationId:'old-calibration',grindSetting:grind,snapshot:null}));
  assert.equal(familyStats(f.s,'family')?.count,Number(eligible));
 }
});
test('R173 an invalid chosen family cannot suppress a valid alternative successful family',()=>{
 const f=fixture();f.s.families.push({id:'alternative',coffeeId:f.c.id,style:'Traditional'});
 f.s.shots.push(f.make({id:'bad',grindSetting:f.v.grinderMax+1}),
  f.make({id:'good',familyId:'alternative',yieldG:39}));
 const p=coffeeState(f.s,f.c.id);p.currentFamilies.Traditional='family';p.favoriteShots.family='bad';
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.familyId,'alternative');
 assert.equal(familyStats(f.s,'family')?.count,0);
 assert.equal(familyStats(f.s,'alternative')?.count,1);
 assert.deepEqual(f.s,before);
});
test('R173 physical bounds and complete five-green taste remain mandatory for family evidence',()=>{
 for(const patch of [{doseG:4},{yieldG:201},{timeS:181},
  {dialedIn:false},{tasteScales:{...green,sweetness:null}}, {hidden:true}]){
  const f=fixture();f.s.shots.push(f.make(patch));
  assert.equal(familiesFor(f.s,f.c.id,'Traditional').length,0);
  assert.equal(f.rec().familyId,null);
 }
});
