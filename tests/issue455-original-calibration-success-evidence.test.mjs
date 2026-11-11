import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {saveShot,recommendation} from '../site/lib/engine.js';
import {hasLocalSuccess} from '../site/lib/model.js';
// R178 synthetic history only; no live member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function scenario(){
 const s=hydrate(rawFixture());s.shots=[];s.families=[];s.communityEvidence={};
 const latest=saveShot(s,'coffee',{id:'latest-rated',basketId:'basketv',
  style:'Turbo',feedMode:'standard',doseG:18,yieldG:44,timeS:16,
  grindSetting:2,tempC:null,tasteScales:{...green,extraction:2},
  notes:'Original private latest note'});
 const past=new Date(Date.parse(latest.timestamp)-60000).toISOString();
 const archive=(extra={})=>{const sh={...structuredClone(latest),
  id:'archived-green',timestamp:past,grindSetting:3,tasteScales:{...green},
  dialedIn:true,suggestion:null,notes:'Original private archived note',...extra};
  s.shots.push(sh);return sh;};
 return {s,latest,archive,
  success:()=>hasLocalSuccess(s,'coffee','Turbo'),
  advice:()=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'})};
}
test('R178 impossible original snapshot cannot mark overview success or veto latest rated advice',()=>{
 const f=scenario();const sh=f.archive({snapshot:{...f.latest.snapshot,grinderMin:4,grinderMax:5}});
 const before=structuredClone(f.s);
 assert.equal(f.success(),false);
 const r=f.advice();assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,49);assert.equal(r.grind.value,2);
 assert.equal(sh.notes,'Original private archived note');
 assert.deepEqual(f.s,before);
});
test('R178 valid snapshot still marks established green and suppresses unnecessary adjustment',()=>{
 const f=scenario();f.archive({snapshot:{...f.latest.snapshot,grinderMin:0,grinderMax:5}});
 const before=structuredClone(f.s);
 assert.equal(f.success(),true);
 assert.notEqual(f.advice().source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
test('R178 original snapshot inclusive calibration endpoints remain eligible',()=>{
 for(const grindSetting of [0,5]){
  const f=scenario();f.archive({grindSetting,snapshot:{...f.latest.snapshot,grinderMin:0,grinderMax:5}});
  const before=structuredClone(f.s);
  assert.equal(f.success(),true);assert.notEqual(f.advice().source,'Adjustment from your latest taste rating');
  assert.deepEqual(f.s,before);
 }
});
test('R178 reversed original snapshot bounds do not certify green history',()=>{
 const f=scenario();f.archive({snapshot:{...f.latest.snapshot,grinderMin:5,grinderMax:4}});
 const before=structuredClone(f.s);
 assert.equal(f.success(),false);
 assert.equal(f.advice().source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
test('R178 absent optional legacy snapshot preserves eligible green behavior',()=>{
 const f=scenario();f.archive({snapshot:null});
 const before=structuredClone(f.s);
 assert.equal(f.success(),true);
 assert.notEqual(f.advice().source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
test('R178 original calibration without snapshot prevents false overview green',()=>{
 const f=scenario(),v=f.s.setups[0].versions[0];
 v.calibrations.push({id:'archived-cal',min:4,max:5,at:'2026-11-01T00:00:00Z'});
 f.archive({snapshot:null,calibrationId:'archived-cal'});
 const before=structuredClone(f.s);
 assert.equal(f.success(),false);
 assert.deepEqual(f.s,before);
});
test('R178 incomplete five tastes cannot certify green despite valid snapshot',()=>{
 const f=scenario();f.archive({tasteScales:{...green,astringency:null},
  snapshot:{...f.latest.snapshot,grinderMin:0,grinderMax:5}});
 const before=structuredClone(f.s);
 assert.equal(f.success(),false);
 assert.equal(f.advice().source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
