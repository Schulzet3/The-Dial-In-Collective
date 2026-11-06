import test from 'node:test';
import assert from 'node:assert/strict';
import {familyShots,familyStats,familiesFor,chooseRecipeFamily} from '../site/lib/engine.js';

// Isolated synthetic archived personal recipe rows; no provider/member access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,overrides={})=>({
 id,coffeeId:'coffee',style:'Turbo',familyId:'family-a',
 setupVersionId:'version',calibrationId:'cal',basketId:'basket',
 feedMode:'standard',hidden:false,dialedIn:true,
 tasteScales:{...green},doseG:18,yieldG:36,timeS:15,
 notes:'Original private history',...overrides
});
const family=id=>({id,coffeeId:'coffee',style:'Turbo'});
const state=(shots,families=[family('family-a')])=>({shots,families,preferences:''});
const version={id:'version',calibrationId:'cal',grinder:'test grinder',burrs:'test burrs'};
const basket={id:'basket',doseG:18};
const pref={currentFamilies:{},favoriteShots:{}};
const choose=s=>chooseRecipeFamily(s,'coffee','Turbo',version,basket,'standard',pref);

test('#455 R078 corrupted all-green imported rows cannot establish personal recipe evidence',()=>{
 for(const overrides of [
  {doseG:0},{doseG:null},{doseG:-1},{doseG:'18'},
  {yieldG:0},{yieldG:null},{yieldG:-5},{yieldG:'36'},
  {timeS:0},{timeS:-1},{timeS:NaN},{timeS:Infinity},
  {doseG:Number.MIN_VALUE,yieldG:36},
  {doseG:Infinity},{yieldG:Infinity}
 ]){
  const s=state([shot('invalid',overrides)]),before=structuredClone(s);
  const stats=familyStats(s,'family-a');
  assert.equal(stats.ratio,null,JSON.stringify(overrides));
  assert.equal(stats.time,null);
  assert.equal(stats.count,0);
  assert.equal(stats.confirmed,false);
  assert.equal(familiesFor(s,'coffee','Turbo').length,0);
  assert.equal(choose(s),null);
  assert.equal(familyShots(s,'family-a').length,1,'historical five-green record remains visible');
  assert.deepEqual(s,before);
 }
});

test('#455 R078 malformed rows cannot inflate valid family ratio or sample size',()=>{
 const s=state([
  shot('good-1'),shot('good-2',{yieldG:45}),
  shot('bad-zero',{yieldG:0}),shot('bad-negative',{yieldG:-18}),
  shot('bad-overflow',{doseG:Number.MIN_VALUE,yieldG:36}),
  shot('bad-time',{timeS:0})
 ]),before=structuredClone(s);
 const stats=familyStats(s,'family-a'),chosen=choose(s);
 assert.equal(stats.count,2);
 assert.equal(stats.confirmed,true);
 assert.equal(stats.ratio.center,2.25);
 assert.equal(chosen.shots.length,2);
 assert.equal(chosen.matched.length,2);
 assert.equal(chosen.ratio,2.25);
 assert.equal(familiesFor(s,'coffee','Turbo').length,1);
 assert.deepEqual(s,before,'original measurements, notes and ratings remain intact');
});

test('#455 R078 valid single five-green shot remains one-shot family',()=>{
 const s=state([shot('good')]),before=structuredClone(s),stats=familyStats(s,'family-a');
 assert.equal(stats.count,1);
 assert.equal(stats.confirmed,false);
 assert.equal(stats.ratio.center,2);
 assert.equal(choose(s).family.id,'family-a');
 assert.deepEqual(s,before);
});

test('#455 R078 incomplete, nonideal or typed green flags never seed family evidence',()=>{
 const s=state([
  shot('missing',{tasteScales:{...green,clarity:null}}),
  shot('nonideal',{tasteScales:{...green,sweetness:4}}),
  shot('typed',{dialedIn:'true'}),
  shot('good')
 ]),before=structuredClone(s);
 assert.equal(familyStats(s,'family-a').count,1);
 assert.equal(choose(s).shots.length,1);
 assert.deepEqual(s,before);
});

test('#455 R078 separate successful recipe families and manual favorite are retained',()=>{
 const s=state([
  shot('a-success'),shot('b-success',{familyId:'family-b',yieldG:54}),
  shot('b-corrupt',{familyId:'family-b',yieldG:0})
 ],[family('family-a'),family('family-b')]),before=structuredClone(s);
 const p={currentFamilies:{Turbo:'family-b'},favoriteShots:{'family-b':'b-success'}};
 const chosen=chooseRecipeFamily(s,'coffee','Turbo',version,basket,'standard',p);
 assert.equal(chosen.family.id,'family-b');
 assert.equal(chosen.basis,'manual');
 assert.equal(chosen.shots.length,1);
 assert.equal(familyStats(s,'family-a').ratio.center,2);
 assert.equal(familyStats(s,'family-b').ratio.center,3);
 assert.equal(familiesFor(s,'coffee','Turbo').length,2);
 assert.deepEqual(s,before);
});
