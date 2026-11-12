import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {makeCurrent,recommendation} from '../site/lib/engine.js';
import {shotCard} from '../site/cloud/shot_card.js';

// Synthetic archived records only; no hosted member, provider, or SQL writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const fixture=(patch={})=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],coffee=s.coffees[0];
 s.families.push({id:'valid-family',coffeeId:coffee.id,style:'Turbo',seedRatio:2,createdAt:'2026-11-10T12:00:00Z'});
 const sh={id:'archived-green',coffeeId:coffee.id,setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:v.baskets[0].id,style:'Turbo',
  feedMode:'standard',timestamp:'2026-11-10T12:00:00Z',
  doseG:18,yieldG:36,timeS:17,grindSetting:2.5,tempC:null,
  tasteScales:{...green},dialedIn:true,hidden:false,familyId:'valid-family',
  notes:'Unchanged private original note',snapshot:{grinderMin:0,grinderMax:5},
  ...patch};
 s.shots.push(sh);return {s,v,sh,coffee};
};
const render=f=>shotCard(f.sh,{expanded:true,activeVersionId:f.v.id,
 grinderMin:f.v.grinderMin,grinderMax:f.v.grinderMax,familyRecorded:true});
const current=/data-action="make-current"/;

test('R185 impossible original grinder dial retains green History but hides Make Current',()=>{
 const f=fixture({snapshot:{grinderMin:3,grinderMax:5}}),before=structuredClone(f.s);
 assert.doesNotMatch(render(f),current);
 assert.match(render(f),/Dialed In/);
 assert.match(render(f),/Unchanged private original note/);
 assert.throws(()=>makeCurrent(f.s,f.sh.id),/original grinder calibration/);
 assert.deepEqual(f.s,before);
});
test('R185 reversed saved original grinder range cannot be manually preferred',()=>{
 const f=fixture({snapshot:{grinderMin:5,grinderMax:2}}),before=structuredClone(f.s);
 assert.doesNotMatch(render(f),current);
 assert.throws(()=>makeCurrent(f.s,f.sh.id),/original grinder calibration/);
 assert.deepEqual(f.s,before);
});
test('R185 valid inclusive original grinder endpoints still permit explicit Current',()=>{
 for(const setting of [0,5]){
  const f=fixture({grindSetting:setting});
  assert.match(render(f),current);
  assert.doesNotThrow(()=>makeCurrent(f.s,f.sh.id));
  const p=f.s.setups[0].workspaces[f.v.id].coffees[f.coffee.id];
  assert.equal(p.currentFamilies.Turbo,'valid-family');
  assert.equal(p.favoriteShots['valid-family'],f.sh.id);
  assert.equal(recommendation(f.s,f.coffee.id,{style:'Turbo'}).familyId,'valid-family');
 }
});
test('R185 historical range cannot override present active grinder range',()=>{
 const f=fixture({grindSetting:6,snapshot:{grinderMin:0,grinderMax:8}}),before=structuredClone(f.s);
 assert.doesNotMatch(render(f),current);
 assert.throws(()=>makeCurrent(f.s,f.sh.id),/valid recorded grinder setting/);
 assert.deepEqual(f.s,before);
});
test('R185 absent optional legacy original snapshot keeps compatible valid history',()=>{
 const f=fixture({snapshot:null});
 assert.match(render(f),current);
 assert.doesNotThrow(()=>makeCurrent(f.s,f.sh.id));
});
test('R185 incomplete fifth taste cannot become Current despite valid grinder',()=>{
 const f=fixture({tasteScales:{...green,sweetness:null}}),before=structuredClone(f.s);
 assert.doesNotMatch(render(f),current);
 assert.throws(()=>makeCurrent(f.s,f.sh.id),/visible all-green/);
 assert.deepEqual(f.s,before);
});
test('R185 blank family remains ineligible even with calibrated grinder',()=>{
 const f=fixture({familyId:'  '}),before=structuredClone(f.s);
 assert.doesNotMatch(render(f),current);
 assert.throws(()=>makeCurrent(f.s,f.sh.id),/assigned recipe family/);
 assert.deepEqual(f.s,before);
});
