import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {recipeGrid,nextShotAdjustment} from '../site/lib/ui.js';

// R319: synthetic archived measured values only; never touch private/member shots.
const fixture=(overrides={})=>{
 const state=hydrate(rawFixture());
 state.setups[0].versions[0].advanced.temperature=true;
 const shot={id:'synthetic-r319',coffeeId:'coffee',setupVersionId:'version',
  style:'Turbo',basketId:'basketv',calibrationId:'cal',feedMode:'standard',
  doseG:20,yieldG:36.35,timeS:10,grindSetting:2.45,tempC:91,
  timestamp:'2026-10-21T01:00:00Z',dialedIn:false,
  notes:'Preserve original private notes and measurements',
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},
  ...overrides};
 state.shots.push(shot);
 return {state,shot,before:structuredClone(shot)};
};
test('R319 grind-only Next Recipe keeps original non-tenth measured yield exactly',()=>{
 const {state,shot,before}=fixture();
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.ok(advice.next,'fixture must produce an actionable single change');
 assert.notEqual(advice.next.grindSetting,shot.grindSetting,'fixture must recommend grind, not yield');
 assert.equal(advice.next.yieldCenter,36.35);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.yield.center,36.35);
 assert.equal(rec.ratio.center,36.35/20);
 assert.ok(recipeGrid(rec).includes('Center 36.35 g'),'the unchanged measured yield must remain exact in Next Recipe');
 assert.equal(nextShotAdjustment(advice,shot)?.label,'Grind');
 assert.deepEqual(shot,before);
});
test('R319 genuine new yield target remains rounded while before-arrow shows actual 36.35',()=>{
 const {state,shot,before}=fixture({timeS:22});
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.ok(advice.next);
 assert.equal(advice.next.grindSetting,shot.grindSetting);
 assert.notEqual(advice.next.yieldCenter,shot.yieldG);
 const arrow=nextShotAdjustment(advice,shot);
 assert.equal(arrow?.label,'Yield');
 assert.equal(arrow.before,'36.35');
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.yield.center,advice.next.yieldCenter);
 assert.ok(Math.abs(rec.yield.center*10-Math.round(rec.yield.center*10))<1e-8);
 assert.deepEqual(shot,before);
});
test('R319 preparation-only guidance preserves the actual yield and all five ratings',()=>{
 const {state,shot,before}=fixture({tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}});
 const rec=recommendation(state,'coffee');
 assert.equal(rec.diagnosticOnly,true);
 assert.equal(rec.yield.center,36.35);
 assert.ok(recipeGrid(rec).includes('Center 36.35 g'));
 assert.deepEqual(shot,before);
});
test('R319 already-tenth measured yield retains ordinary one-decimal presentation',()=>{
 const {state,shot,before}=fixture({yieldG:36.4});
 const rec=recommendation(state,'coffee');
 assert.equal(rec.yield.center,36.4);
 assert.ok(recipeGrid(rec).includes('Center 36.4 g'));
 assert.deepEqual(shot,before);
});
test('R319 non-tenth recorded yield near existing input limits stays exact with bounded display band',()=>{
 for(const originalYield of [5.05,199.95]){
  const {state,shot,before}=fixture({yieldG:originalYield,
   tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}});
  const rec=recommendation(state,'coffee');
  assert.equal(rec.diagnosticOnly,true);
  assert.equal(rec.yield.center,originalYield);
  assert.ok(rec.yield.low>=5&&rec.yield.high<=200);
  assert.ok(recipeGrid(rec).includes('Center '+originalYield+' g'));
  assert.deepEqual(shot,before);
 }
});
