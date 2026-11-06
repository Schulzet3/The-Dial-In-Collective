import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {baseline,recommendation} from '../site/lib/engine.js';

// Synthetic archived records only; no live member, SQL/Auth, or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const make=()=>{const s=hydrate(rawFixture());return {s,c:s.coffees[0]};};
const saved=(overrides={})=>({
 id:'old-shot',coffeeId:'coffee',setupId:'setup',setupVersionId:'version',
 calibrationId:'cal',basketId:'basketv',style:'Turbo',feedMode:'standard',
 hidden:false,dialedIn:true,tasteScales:{...green},familyId:null,
 doseG:18,yieldG:45,timeS:18,grindSetting:1.3,tempC:86,
 timestamp:'legacy-undated',notes:'Unchanged private archive note',...overrides
});
const rec=s=>recommendation(s,'coffee',{style:'Turbo',ignoreAdvice:true});
const baselineTemp=c=>baseline(c,'Turbo',18,'clarity').tempC;

test('#455 historic missing, nonideal or typed success does not change suggested temperature',()=>{
 for(const overrides of [
  {tasteScales:null},{tasteScales:{}},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,astringency:2}},{tasteScales:{...green,clarity:'5'}},
  {dialedIn:false},{dialedIn:'true'},{dialedIn:1}
 ]){
  const {s,c}=make();s.shots.push(saved(overrides));const before=structuredClone(s);
  assert.equal(rec(s).tempC,baselineTemp(c),JSON.stringify(overrides));
  assert.deepEqual(s,before,'do not rewrite any archived shot or note');
 }
});
test('#455 genuine five-green same-coffee same-style historical temperature is preserved',()=>{
 const {s}=make();s.shots.push(saved({tempC:88}));
 const before=structuredClone(s);
 assert.equal(rec(s).tempC,88);
 assert.deepEqual(s,before);
});
test('#455 stale success cannot bias mean of genuine same-style temperature',()=>{
 const {s}=make();
 s.shots.push(saved({id:'genuine',tempC:91}),
  saved({id:'stale',tempC:78,tasteScales:{...green,body:4}}));
 const before=structuredClone(s);
 assert.equal(rec(s).tempC,91);
 assert.deepEqual(s,before);
});
test('#455 only visible same-coffee same-style current-setup valid history informs temperature',()=>{
 const {s,c}=make();
 s.shots.push(saved({id:'other-coffee',coffeeId:'different',tempC:71}),
  saved({id:'other-style',style:'Traditional',tempC:72}),
  saved({id:'hidden',hidden:true,tempC:73}),
  saved({id:'other-setup',setupVersionId:'old-version',snapshot:{machine:'Different machine'},tempC:74}));
 assert.equal(rec(s).tempC,baselineTemp(c));
});
test('#455 selected genuine recipe family temperature excludes stale family member',()=>{
 const {s}=make();s.families.push({id:'family',coffeeId:'coffee',style:'Turbo'});
 s.shots.push(saved({id:'genuine',familyId:'family',tempC:90}),
  saved({id:'stale',familyId:'family',tempC:77,tasteScales:{...green,sweetness:null}}));
 const before=structuredClone(s),r=rec(s);
 assert.equal(r.familyId,'family');assert.equal(r.tempC,90);
 assert.deepEqual(s,before,'original tastes, notes, shots and families are not altered');
});
