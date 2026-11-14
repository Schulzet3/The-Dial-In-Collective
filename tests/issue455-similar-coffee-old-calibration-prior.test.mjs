import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';

// Synthetic state; no member, Auth, provider, SQL, network or production access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const setup=()=>{
 const s=hydrate(rawFixture()),target=s.coffees[0];
 s.coffees.push({...target,id:'other-coffee',name:'Second comparable Light roast'});
 return {s,target,v:activeVersion(s)};
};
const oldGood=(extra={})=>({
 id:'archived-green',coffeeId:'other-coffee',setupId:'setup',setupVersionId:'version',
 style:'Turbo',basketId:'basketv',feedMode:'standard',calibrationId:'old-cal',
 doseG:18,yieldG:39,timeS:27,grindSetting:9,tempC:null,
 snapshot:{grinderMin:8,grinderMax:10,grinder:'Test grinder',burrs:'Test burrs'},
 dialedIn:true,tasteScales:{...green},hidden:false,
 notes:'Keep this original private comparison intact',
 timestamp:'2026-10-08T12:00:00Z',...extra
});

test('R251 original-valid historical dial outside active 0-5 admits unproven comparable ratio/time only',()=>{
 const {s,target,v}=setup();
 assert.equal(v.grinderMin,0);assert.equal(v.grinderMax,5);
 const before=recommendation(s,target.id);
 s.shots.push(oldGood());const original=structuredClone(s.shots);
 const donor=personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv');
 assert.ok(donor);assert.equal(donor.count,1);
 assert.equal(donor.ratio,39/18);assert.equal(donor.time,27);
 const rec=recommendation(s,target.id);
 assert.equal(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.observations,1);assert.equal(rec.established,false);
 assert.ok(rec.ratio.center<before.ratio.center);
 assert.ok(rec.time.center>before.time.center);
 assert.ok(rec.grind.value>=0&&rec.grind.value<=5);
 assert.notEqual(rec.grind.value,9,'an old-scale grinder number is never transferred');
 assert.deepEqual(s.shots,original,'source shot, five ratings and private notes remain immutable');
});
test('R251 impossible original grinder dial is NOT usable as an other-coffee donor',()=>{
 const {s,target,v}=setup();s.shots.push(oldGood({grindSetting:11}));
 assert.equal(personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv'),null);
 assert.equal(recommendation(s,target.id).observations,0);
});
test('R251 reversed original calibration cannot certify an other-coffee donor',()=>{
 const {s,target,v}=setup();s.shots.push(oldGood({
  snapshot:{grinderMin:10,grinderMax:8,grinder:'Test grinder',burrs:'Test burrs'}
 }));
 assert.equal(personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv'),null);
 assert.equal(recommendation(s,target.id).observations,0);
});
test('R251 original-valid archived donor still requires all five ideal ratings and correct style/feed',()=>{
 for(const overrides of [
  {tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,sweetness:4}},
  {hidden:true},{style:'Traditional'},{feedMode:'slow'}
 ]){
  const {s,target,v}=setup();s.shots.push(oldGood(overrides));
  assert.equal(personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv'),null);
  assert.equal(recommendation(s,target.id).observations,0);
 }
});
test('R251 current-calibration comparable donor behavior is preserved',()=>{
 const {s,target,v}=setup();s.shots.push(oldGood({
  calibrationId:'cal',grindSetting:2,
  snapshot:{grinderMin:0,grinderMax:5,grinder:'Test grinder',burrs:'Test burrs'}
 }));
 const donor=personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv');
 assert.equal(donor.count,1);
 assert.equal(recommendation(s,target.id).observations,1);
});
