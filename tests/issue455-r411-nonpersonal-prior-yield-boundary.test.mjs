import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation,baseline} from '../site/lib/engine.js';
import {recipeGrid} from '../site/lib/ui.js';
import {CONFIG} from '../site/lib/constants.js';
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function state({donorRatio=null,complete=true,communityRatio=null,basketDose=40}={}){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 v.baskets.push({id:'basket-b',name:'Other active basket',doseG:basketDose,archived:false});
 const coffee=s.coffees.find(c=>c.id==='coffee');
 coffee.process='Washed'; coffee.origin='Test origin'; coffee.variety='Bourbon';
 if(donorRatio!==null){
  s.coffees.push({...structuredClone(coffee),id:'donor-coffee',name:'Different coffee'});
  s.shots.push({id:'donor-shot',coffeeId:'donor-coffee',setupVersionId:v.id,
   calibrationId:v.calibrationId,basketId:'basketv',style:'Lungo',
   feedMode:'standard',familyId:null,doseG:18,yieldG:18*donorRatio,
   timeS:36,grindSetting:1.2,tempC:93,
   timestamp:'2026-11-19T12:01:00Z',hidden:false,dialedIn:true,
   notes:'Preserve private original donor and five ratings',
   tasteScales:{...green,sweetness:complete?5:null}});
 }
 if(communityRatio!==null)s.communityEvidence={coffee:{Lungo:{style:'Lungo',
  candidates:[{style:'Lungo',tier:'exact',source:'eligible_verified_community',
   calibrated_grind:false,contributor_count:4,shot_count:16,ratio:communityRatio,time_s:36}]} }};
 return s;
}
const rec=(s,basketId='basket-b')=>recommendation(s,'coffee',{
 style:'Lungo',basketId,feedMode:'standard',ignoreAdvice:true
});
test('R411 negative: other-coffee valid 18g/180g donor cannot project >200g current 40g recipe',()=>{
 const s=state({donorRatio:10}),before=structuredClone(s),r=rec(s);
 assert.equal(r.source,'Starting recommendation');
 assert.equal(r.yield.center,baseline(s.coffees[0],'Lungo',40,s.preferences).ratio.center*40);
 assert.ok(r.yield.center<=CONFIG.bounds.yieldG[1]);
 assert.match(r.startingCompatibilityNote,/tentative starting reference exceeds/i);
 assert.match(recipeGrid(r),/tentative starting reference exceeds/i);
 assert.equal(r.basketCompatibilityNote,undefined);
 assert.deepEqual(s,before);
});
test('R411 positive: physically loggable similar-coffee starting hint remains',()=>{
 const s=state({donorRatio:2}),before=structuredClone(s),r=rec(s);
 assert.equal(r.source,'Your successful similar coffees on this setup');
 assert.ok(r.yield.center>=5&&r.yield.center<=200);
 assert.equal(r.startingCompatibilityNote,undefined);
 assert.deepEqual(s,before);
});
test('R411 positive: original 18g basket keeps tentative valid projection and history',()=>{
 const s=state({donorRatio:10}),before=structuredClone(s),r=rec(s,'basketv');
 assert.equal(r.source,'Your successful similar coffees on this setup');
 assert.ok(r.yield.center<=200);
 assert.deepEqual(s,before);
});
test('R411 negative: incomplete five-taste donor cannot inform ratio or fallback',()=>{
 const s=state({donorRatio:10,complete:false}),before=structuredClone(s),r=rec(s);
 assert.equal(r.source,'Starting recommendation');
 assert.equal(r.startingCompatibilityNote,undefined);
 assert.deepEqual(s,before);
});
test('R411 negative: confirmed-eligible Community aggregate cannot produce >200g starting card',()=>{
 const s=state({communityRatio:7.95}),before=structuredClone(s),r=rec(s);
 assert.equal(r.source,'Starting recommendation');
 assert.equal(r.communityEvidence,undefined);
 assert.ok(r.yield.center<=200);
 assert.match(r.startingCompatibilityNote,/tentative starting reference/i);
 assert.match(recipeGrid(r),/tentative starting reference/i);
 assert.deepEqual(s,before);
});
test('R411 positive: in-range eligible Community prior preserves tentative source',()=>{
 const s=state({communityRatio:2.7}),before=structuredClone(s),r=rec(s);
 assert.match(r.source,/Unproven exact Community starting reference/);
 assert.equal(r.communityEvidence?.tier,'exact');
 assert.equal(r.startingCompatibilityNote,undefined);
 assert.ok(r.yield.center>=5&&r.yield.center<=200);
 assert.deepEqual(s,before);
});
test('R411 negative: original donor is not silently relabeled as same-coffee family',()=>{
 const s=state({donorRatio:10}),before=structuredClone(s),r=rec(s);
 assert.equal(r.familyId,null);
 assert.equal(r.basketCompatibilityNote,undefined);
 assert.equal(s.shots[0].yieldG,180);
 assert.deepEqual(s.shots[0].tasteScales,green);
 assert.deepEqual(s,before);
});

test('R411b current-basket rated next-shot advice clears obsolete tentative starting compatibility notice',()=>{
 const s=state({donorRatio:10}),v=activeVersion(s);
 s.shots.push({id:'current-actual',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:'basket-b',style:'Lungo',
  feedMode:'standard',familyId:null,doseG:40,yieldG:120,timeS:36,
  grindSetting:1.2,tempC:93,timestamp:'2026-11-20T12:01:00Z',
  hidden:false,dialedIn:false,
  notes:'Keep actual current shot and original donor notes private',
  tasteScales:{...green,sweetness:4}});
 const before=structuredClone(s),r=recommendation(s,'coffee',{
  style:'Lungo',basketId:'basket-b',feedMode:'standard'});
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,125,'use same existing one-control next-yield advice');
 assert.equal(r.doseG,40);
 assert.equal(r.startingCompatibilityNote,undefined,'do not claim next-shot advice is a starting estimate');
 assert.equal(r.inapplicableFamilyWithCurrentFeedback,true,'overview heading must reflect measured advice');
 assert.doesNotMatch(recipeGrid(r),/tentative starting reference exceeds/i);
 assert.deepEqual(s,before,'both shots, all five ratings and notes unchanged');
});
