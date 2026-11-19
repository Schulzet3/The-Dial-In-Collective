import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {recipeGrid,nextShotAdjustment} from '../site/lib/ui.js';

// R322 uses synthetic shots only; original private rows, notes, and five taste ratings are immutable.
const fixture=(overrides={})=>{
 const state=hydrate(rawFixture());
 const shot={id:'synthetic-r322',coffeeId:'coffee',setupVersionId:'version',
  style:'Turbo',basketId:'basketv',calibrationId:'cal',feedMode:'standard',
  doseG:18.25,yieldG:36.35,timeS:10,grindSetting:2.45,tempC:91,
  timestamp:'2026-11-17T01:00:00Z',dialedIn:false,
  notes:'Original dose and notes never changed',
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},
  ...overrides};
 state.shots.push(shot);
 return {state,shot,before:structuredClone(shot)};
};
const doseText=html=>html.match(/Dose<\/div><div class="metric-value">([^<]+)</)?.[1];

test('R322 grind-only Next Recipe shows exact unchanged measured 18.25 g dose',()=>{
 const {state,shot,before}=fixture();
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.ok(advice.next&&advice.next.grindSetting!==shot.grindSetting);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.measuredDoseUnchanged,true);
 assert.equal(rec.doseG,18.25);
 assert.equal(doseText(recipeGrid(rec)),'18.25 ');
 assert.deepEqual(shot,before);
});
test('R322 yield-only feedback keeps original non-tenth dose without a second change',()=>{
 const {state,shot,before}=fixture({yieldG:50,timeS:22});
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.ok(advice.next&&advice.next.yieldCenter!==shot.yieldG);
 assert.equal(advice.next.grindSetting,shot.grindSetting);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.measuredDoseUnchanged,true);
 assert.equal(doseText(recipeGrid(rec)),'18.25 ');
 assert.deepEqual(shot,before);
});
test('R322 preparation-only guidance retains exact recorded dose and five original ratings',()=>{
 const {state,shot,before}=fixture({tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}});
 const rec=recommendation(state,'coffee');
 assert.equal(rec.diagnosticOnly,true);
 assert.equal(rec.measuredDoseUnchanged,true);
 assert.equal(doseText(recipeGrid(rec)),'18.25 ');
 assert.deepEqual(shot,before);
});
test('R322 basket-based starting recipe and ordinary tenth measurement keep existing convention',()=>{
 const {state}=fixture({doseG:20});
 const baseline=recommendation(state,'coffee',{ignoreAdvice:true});
 assert.equal(baseline.measuredDoseUnchanged,undefined);
 assert.equal(baseline.doseG,18,'basket-based starting dose remains the actual 18 g basket');
 assert.equal(doseText(recipeGrid(baseline)),'18.0 ');
 const adjusted=recommendation(state,'coffee');
 assert.equal(adjusted.measuredDoseUnchanged,true);
 assert.equal(doseText(recipeGrid(adjusted)),'20.0 ');
});
test('R322 new dose target stays rounded and its before-arrow preserves original precision',()=>{
 const {state,shot,before}=fixture();
 const rec=recommendation(state,'coffee',{ignoreAdvice:true});
 rec.doseG=18.35;
 rec.measuredDoseUnchanged=false;
 assert.equal(doseText(recipeGrid(rec)),'18.4 ');
 const arrow=nextShotAdjustment({next:{doseG:18.4}},shot);
 assert.equal(arrow?.label,'Dose');
 assert.equal(arrow?.before,'18.25');
 assert.equal(arrow?.after,'18.4');
 assert.deepEqual(shot,before);
});
