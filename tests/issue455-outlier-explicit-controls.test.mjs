import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';

// Synthetic historical samples only. No real user, database or provider I/O.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const old=(id,patch={})=>({
 id,coffeeId:'coffee',setupId:'setup',setupVersionId:'version',style:'Turbo',
 basketId:'basketv',feedMode:'standard',calibrationId:'cal',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,
 timeS:20,grindSetting:2,tempC:92,notes:'Original private archival note',...patch
});
const now=(patch={})=>({
 id:'new',coffeeId:'coffee',setupId:'setup',setupVersionId:'version',
 style:'Turbo',basketId:'basketv',feedMode:'standard',calibrationId:'cal',
 doseG:18,yieldG:36,timeS:50,grindSetting:2,tempC:92,...patch
});
const four=()=>Array.from({length:4},(_,i)=>old('prior-'+i));

test('#455 R164 invalid explicitly recorded grinder/temperature cannot fill fourth outlier reference',()=>{
 const bad=[
  {grindSetting:-.1},{grindSetting:NaN},{grindSetting:Infinity},
  {grindSetting:-Infinity},{grindSetting:'2'},
  {tempC:69.9},{tempC:100.1},{tempC:'92'},
  {tempC:NaN},{tempC:Infinity}
 ];
 for(const patch of bad){
  const shots=four();shots[3]=old('fourth-invalid',patch);
  const s={shots},original=structuredClone(s);
  assert.equal(isExtreme(s,now()),false,JSON.stringify(patch));
  assert.deepEqual(s,original,'all five tastes and private history remain unchanged');
  s.shots.push(old('fourth-valid'));
  assert.equal(isExtreme(s,now()),true,'a valid fourth reference still triggers the existing 25s rule');
 }
});

test('#455 R164 only explicitly invalid values are excluded; missing legacy fields remain compatible',()=>{
 const missing=four().map(sh=>({...sh,grindSetting:undefined,tempC:undefined}));
 const s={shots:missing},original=structuredClone(s);
 assert.equal(isExtreme(s,now()),true,'legacy unrecorded control fields keep prior compatibility');
 assert.deepEqual(s,original);
});

test('#455 R164 inclusive recorded temperature and grinder zero remain eligible; locked thresholds unchanged',()=>{
 const s={shots:four().map((sh,i)=>old(sh.id,{tempC:i%2?100:70,grindSetting:i%2?5:0}))};
 const before=structuredClone(s);
 assert.equal(isExtreme(s,now({timeS:45,yieldG:58.5})),false,'exact 25s and 1.25 ratio are not extreme');
 assert.equal(isExtreme(s,now({timeS:46})),true);
 assert.equal(isExtreme(s,now({timeS:20,yieldG:63})),true);
 assert.deepEqual(s,before);
});

test('#455 R164 same-version espresso range rejects an otherwise five-green archived grinder outlier',()=>{
 const s=hydrate(rawFixture()),v=activeVersion(s),coffee=s.coffees[0];
 s.shots=four().map(sh=>({...sh,coffeeId:coffee.id,setupVersionId:v.id,
  calibrationId:v.calibrationId,grindSetting:v.grinderMin}));
 s.shots[3].grindSetting=v.grinderMax+.1;
 const shot=now({coffeeId:coffee.id,setupVersionId:v.id,calibrationId:v.calibrationId});
 const before=structuredClone(s);
 assert.equal(isExtreme(s,shot),false,'the fourth historical grinder is outside this same version');
 assert.deepEqual(s,before);
 s.shots[3].grindSetting=v.grinderMax;
 assert.equal(isExtreme(s,shot),true,'the existing inclusive max remains eligible');
});

test('#455 R164 integrated saveShot avoids spurious mandatory outlier review and preserves archived notes',()=>{
 for(const fourth of [{tempC:145},{grindSetting:99},{tempC:92,grindSetting:5}]){
  const s=hydrate(rawFixture()),v=activeVersion(s),coffee=s.coffees[0];
  s.shots=four().map(sh=>({...sh,coffeeId:coffee.id,setupVersionId:v.id,
   calibrationId:v.calibrationId}));
  Object.assign(s.shots[3],fourth);
  const original=structuredClone(s.shots);
  const saved=saveShot(s,coffee.id,{
   basketId:'basketv',style:'Turbo',doseG:18,yieldG:36,timeS:50,
   grindSetting:1,feedMode:'standard',notes:'Keep new measured note',
   tasteScales:{...green,sweetness:4}
  });
  assert.equal(saved.outlierReview,fourth.tempC===92?'pending':'not_needed');
  assert.equal(saved.notes,'Keep new measured note');
  assert.deepEqual(s.shots.slice(0,4),original,'original records are never rewritten');
 }
});
