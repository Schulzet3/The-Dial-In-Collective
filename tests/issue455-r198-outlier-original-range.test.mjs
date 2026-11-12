import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';

// Synthetic legacy recalibration fixtures: no hosted member, SQL or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),coffee=s.coffees[0];
 s.shots=[];
 const history=Array.from({length:4},(_,i)=>({
  id:'old-'+i,coffeeId:coffee.id,setupVersionId:v.id,
  basketId:'basketv',calibrationId:v.calibrationId,feedMode:'standard',
  style:'Turbo',timestamp:'2026-10-01T12:00:00Z',
  doseG:18,yieldG:36,timeS:20,grindSetting:2,
  snapshot:{grinderMin:v.grinderMin,grinderMax:v.grinderMax},
  tempC:92,hidden:false,dialedIn:true,tasteScales:{...green},
  notes:'Original private note '+i
 }));
 // Historical measurement was within its own stored espresso range but
 // not within today's active [0,5] range. It must not be silently clipped.
 history[3].grindSetting=9;
 history[3].snapshot={grinderMin:8,grinderMax:10};
 s.shots.push(...history);
 const current={id:'new',coffeeId:coffee.id,setupVersionId:v.id,
  basketId:'basketv',calibrationId:v.calibrationId,feedMode:'standard',
  style:'Turbo',doseG:18,yieldG:36,timeS:50};
 return {s,v,coffee,history,current};
}
test('R198 archived original-valid fourth reference counts despite later active dial bounds',()=>{
 const f=fixture(),before=structuredClone(f.s);
 assert.equal(f.v.grinderMax,5);
 assert.equal(isExtreme(f.s,f.current),true);
 assert.deepEqual(f.s,before);
});
test('R198 invalid original grinder snapshot cannot supply the fourth reference',()=>{
 const f=fixture();f.history[3].grindSetting=11;
 const before=structuredClone(f.s);
 assert.equal(isExtreme(f.s,f.current),false);
 assert.deepEqual(f.s,before);
});
test('R198 malformed original grinder range cannot supply fourth reference',()=>{
 const f=fixture();f.history[3].snapshot={grinderMin:10,grinderMax:8};
 assert.equal(isExtreme(f.s,f.current),false);
});
test('R198 same original-valid history with different explicit calibration stays excluded',()=>{
 const f=fixture();f.history[3].calibrationId='different-calibration';
 const before=structuredClone(f.s);
 assert.equal(isExtreme(f.s,f.current),false);
 assert.deepEqual(f.s,before);
});
test('R198 archived success without five original ideal tastes stays excluded',()=>{
 const f=fixture();f.history[3].tasteScales.sweetness=null;
 assert.equal(isExtreme(f.s,f.current),false);
});
test('R198 fresh save flags outlier without mutating archived readings or notes',()=>{
 const f=fixture(),before=structuredClone(f.s.shots);
 const result=saveShot(f.s,f.coffee.id,{id:'new-id',basketId:'basketv',
  style:'Turbo',feedMode:'standard',doseG:18,yieldG:36,timeS:50,
  grindSetting:2,notes:'New private note',
  tasteScales:{...green,sweetness:4}});
 assert.equal(result.outlierReview,'pending');
 assert.equal(result.notes,'New private note');
 assert.deepEqual(f.s.shots.slice(0,4),before);
});
