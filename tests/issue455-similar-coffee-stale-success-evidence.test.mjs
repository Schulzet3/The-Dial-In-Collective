import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,personalSimilarCoffeeReference} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

// Synthetic historical data only; no private member data or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function make(){
 const state=hydrate(rawFixture()),target=state.coffees[0];
 state.coffees.push({...target,id:'comparable',name:'Comparable coffee'});
 return {state,target};
}
const archived=(overrides={})=>({
 id:'legacy',coffeeId:'comparable',setupId:'setup',setupVersionId:'version',
 calibrationId:'cal',basketId:'basketv',style:'Turbo',feedMode:'standard',
 hidden:false,dialedIn:true,tasteScales:{...green},familyId:null,
 doseG:18,yieldG:39,timeS:27,grindSetting:1.3,tempC:93,
 timestamp:'2026-10-08T12:00:00Z',notes:'Keep original private note',...overrides
});
const similar=(state,target)=>personalSimilarCoffeeReference(
 state,target,activeVersion(state),'Turbo','standard','basketv');

test('#455 incomplete, invalid or falsely tagged five-taste archive cannot seed similar-coffee advice',()=>{
 for(const override of [
  {tasteScales:null},{tasteScales:{}},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,body:4}},{tasteScales:{...green,clarity:'5'}},
  {dialedIn:false},{dialedIn:'true'},{dialedIn:1}
 ]){
  const {state,target}=make();state.shots.push(archived(override));
  const before=structuredClone(state);
  assert.equal(similar(state,target),null,JSON.stringify(override));
  const rec=recommendation(state,target.id,{style:'Turbo',ignoreAdvice:true});
  assert.notEqual(rec.source,'Your successful similar coffees on this setup',JSON.stringify(override));
  assert.equal(rec.observations,0);
  assert.deepEqual(state,before,'archive and ratings remain unmodified');
 }
});
test('#455 genuine all-five-green same-style, same-feed similar-coffee reference remains available',()=>{
 const {state,target}=make();state.shots.push(archived());
 const before=structuredClone(state),ref=similar(state,target);
 assert.equal(ref.count,1);assert.equal(ref.coffees,1);
 assert.ok(Math.abs(ref.ratio-39/18)<1e-10);
 assert.equal(ref.time,27);
 assert.equal(recommendation(state,target.id,{style:'Turbo',ignoreAdvice:true}).source,
  'Your successful similar coffees on this setup');
 assert.deepEqual(state,before);
});
test('#455 stale success cannot skew a genuine similar-coffee ratio or time',()=>{
 const {state,target}=make();state.shots.push(
  archived({id:'genuine'}),
  archived({id:'stale',yieldG:72,timeS:80,tasteScales:{...green,astringency:2}}));
 const before=structuredClone(state),ref=similar(state,target);
 assert.equal(ref.count,1);
 assert.ok(Math.abs(ref.ratio-39/18)<1e-10);
 assert.equal(ref.time,27);
 assert.deepEqual(state,before);
});
test('#455 similar-coffee evidence keeps equipment/style/feed and visible-history boundaries',()=>{
 const {state,target}=make();
 state.shots.push(
  archived({id:'wrong-style',style:'Traditional'}),
  archived({id:'wrong-feed',feedMode:'slow'}),
  archived({id:'wrong-version',setupVersionId:'older'}),
  archived({id:'hidden',hidden:true}));
 assert.equal(similar(state,target),null);
});
