import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';
// Synthetic archival data only; no real member or provider I/O.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function setup(){
 const s=hydrate(rawFixture()),v=activeVersion(s),coffee=s.coffees[0];s.shots=[];
 const old=(i,patch={})=>({id:'past-'+i,coffeeId:coffee.id,
  setupVersionId:v.id,basketId:'basketv',feedMode:'standard',
  calibrationId:v.calibrationId,style:'Turbo',hidden:false,dialedIn:true,
  tasteScales:{...green},doseG:18,yieldG:36,timeS:20,grindSetting:2,tempC:92,
  snapshot:{grinderMin:v.grinderMin,grinderMax:v.grinderMax},
  notes:'Preserve original private note',...patch});
 const history=Array.from({length:4},(_,i)=>old(i));s.shots.push(...history);
 const current={id:'fresh',coffeeId:coffee.id,setupVersionId:v.id,
  basketId:'basketv',feedMode:'standard',calibrationId:v.calibrationId,
  style:'Turbo',doseG:18,yieldG:36,timeS:50};
 return {s,v,coffee,history,current};
}
test('R182 impossible original snapshot cannot fill fourth green outlier reference',()=>{
 const f=setup();f.history[3].snapshot={grinderMin:4,grinderMax:5};
 const before=structuredClone(f.s);assert.equal(isExtreme(f.s,f.current),false);
 assert.deepEqual(f.s,before);
});
test('R182 old calibration without snapshot cannot fill fourth reference',()=>{
 const f=setup();f.v.calibrations??=[];f.v.calibrations.push({id:'older',min:4,max:5});
 f.history[3].snapshot=null;f.history[3].calibrationId='older';
 const before=structuredClone(f.s);assert.equal(isExtreme(f.s,f.current),false);
 assert.deepEqual(f.s,before);
});
test('R182 reversed original snapshot bounds reject a spurious outlier',()=>{
 const f=setup();f.history[3].snapshot={grinderMin:5,grinderMax:4};
 const before=structuredClone(f.s);assert.equal(isExtreme(f.s,f.current),false);
 assert.deepEqual(f.s,before);
});
test('R182 inclusive original calibration endpoints keep four valid references',()=>{
 for(const edge of ['grinderMin','grinderMax']){
  const f=setup();for(const sh of f.history){sh.grindSetting=f.v[edge];}
  const before=structuredClone(f.s);assert.equal(isExtreme(f.s,f.current),true);
  assert.deepEqual(f.s,before);
 }
});
test('R182 unspecified legacy controls remain compatible without inventing values',()=>{
 const f=setup();f.history[3].snapshot=null;f.history[3].grindSetting=null;
 const before=structuredClone(f.s);assert.equal(isExtreme(f.s,f.current),true);
 assert.deepEqual(f.s,before);
});
test('R182 existing exact 25s and 1.25-ratio thresholds are unchanged',()=>{
 const f=setup(),before=structuredClone(f.s);
 assert.equal(isExtreme(f.s,{...f.current,timeS:45,yieldG:58.5}),false);
 assert.equal(isExtreme(f.s,{...f.current,timeS:46,yieldG:36}),true);
 assert.equal(isExtreme(f.s,{...f.current,timeS:20,yieldG:63}),true);
 assert.deepEqual(f.s,before);
});
test('R182 saveShot does not issue false mandatory outlier review; old notes unchanged',()=>{
 const f=setup();f.history[3].snapshot={grinderMin:4,grinderMax:5};
 const before=structuredClone(f.s.shots);
 const shot=saveShot(f.s,f.coffee.id,{id:'fresh-save',basketId:'basketv',
  style:'Turbo',feedMode:'standard',doseG:18,yieldG:36,timeS:50,
  grindSetting:2,notes:'New private shot note',tasteScales:{...green,sweetness:4}});
 assert.equal(shot.outlierReview,'not_needed');
 assert.equal(shot.notes,'New private shot note');
 assert.deepEqual(f.s.shots.slice(0,4),before);
});
