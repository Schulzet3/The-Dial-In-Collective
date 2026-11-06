import test from 'node:test';
import assert from 'node:assert/strict';
import {hasLocalSuccess} from '../site/lib/model.js';

// Only isolated legacy backup fixtures; no member, hosted Auth or SQL writes.
const allGreen={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function shot(overrides={}){
 return {id:'original-shot',coffeeId:'coffee-one',setupVersionId:'version-one',
  style:'Turbo',hidden:false,dialedIn:true,tasteScales:{...allGreen},
  doseG:18,yieldG:36,timeS:23,grindSetting:3.6,
  notes:'Private original shot note',...overrides};
}
function state(shots){
 return {activeSetupId:'setup-one',
  setups:[{id:'setup-one',activeVersionId:'version-one',
   versions:[{id:'version-one'}]}],shots};
}
test('#455 offline/backup stale success must not suppress unrated shot recommendations',()=>{
 for(const tasteScales of [
  null,{}, {...allGreen,sweetness:null},{...allGreen,clarity:'5'},
  {...allGreen,astringency:0},{...allGreen,body:4}
 ]){
  const s=state([shot({tasteScales})]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee-one','Turbo'),false);
  assert.deepEqual(s,before,'keep original measurements, notes and all five recorded values unchanged');
 }
});
test('#455 historical truthy success flags cannot manufacture personal evidence',()=>{
 for(const flag of [false,null,undefined,'true',1,0]){
  const s=state([shot({dialedIn:flag})]);
  assert.equal(hasLocalSuccess(s,'coffee-one','Turbo'),false);
 }
});
test('#455 genuinely complete five-green historical successes remain valid in every independent style',()=>{
 for(const style of ['Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom']){
  const s=state([shot({style})]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee-one',style),true);
  assert.deepEqual(s,before);
 }
});
test('#455 a valid success stays scoped to visible same-coffee same-version same-style history',()=>{
 const valid=shot();
 const s=state([
  shot({id:'hidden',hidden:true}),
  shot({id:'foreign',coffeeId:'other-coffee'}),
  shot({id:'old-version',setupVersionId:'version-prior'}),
  shot({id:'other-style',style:'Traditional'}),
  shot({id:'stale',tasteScales:{...allGreen,extraction:null}})
 ]);
 assert.equal(hasLocalSuccess(s,'coffee-one','Turbo'),false);
 s.shots.push(valid);
 assert.equal(hasLocalSuccess(s,'coffee-one','Turbo'),true);
 assert.equal(hasLocalSuccess(s,'other-coffee','Turbo'),true,'foreign coffee keeps its own successful history');
 assert.equal(hasLocalSuccess(s,'coffee-one','Ristretto'),false);
 const before=structuredClone(s);
 assert.equal(hasLocalSuccess(s,'coffee-one','Turbo'),true);
 assert.deepEqual(s,before);
});
