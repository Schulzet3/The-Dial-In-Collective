import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {recipeGrid,nextShotAdjustment} from '../site/lib/ui.js';

// R318: synthetic only; original measured history, notes and five ratings are immutable.
const fixture=(overrides={})=>{
 const state=hydrate(rawFixture());
 state.setups[0].versions[0].advanced.temperature=true;
 const shot={id:'synthetic-r318',coffeeId:'coffee',setupVersionId:'version',
  style:'Turbo',basketId:'basketv',calibrationId:'cal',feedMode:'standard',
  doseG:20,yieldG:50,timeS:22,grindSetting:2.45,tempC:91,
  timestamp:'2026-10-21T01:00:00Z',dialedIn:false,
  notes:'Keep original private notes unchanged',
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},...overrides};
 state.shots.push(shot);
 return {state,shot,original:structuredClone(shot)};
};
test('R318 yield-only Next Recipe preserves the precise original grind on engine and screen',()=>{
 const {state,shot,original}=fixture();
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.equal(advice.next.grindSetting,2.45);
 assert.equal(advice.next.yieldCenter,55);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.grind.value,2.45,'recipe card cannot introduce a hidden second grind change');
 assert.match(recipeGrid(rec,true,'C'),/Grind<\/div><div class="metric-value">2\.45<\/div>/);
 assert.equal(nextShotAdjustment(advice,shot,true,'C')?.label,'Yield');
 assert.deepEqual(shot,original);
});
test('R318 diagnostic-only card also retains measured 2.45 without a proposed control',()=>{
 const {state,shot,original}=fixture({tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}});
 const rec=recommendation(state,'coffee');
 assert.equal(rec.diagnosticOnly,true);
 assert.equal(rec.grind.value,2.45);
 assert.match(recipeGrid(rec,true,'C'),/Grind<\/div><div class="metric-value">2\.45<\/div>/);
 assert.equal(rec.grind.range,undefined);
 assert.deepEqual(shot,original);
});
test('R318 genuine grind-only advice still uses a tenth, while the before-arrow shows the real 2.45',()=>{
 const {state,shot,original}=fixture({timeS:10});
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 const arrow=nextShotAdjustment(advice,shot,true,'C');
 assert.equal(arrow?.label,'Grind');
 assert.equal(arrow.before,'2.45');
 assert.ok(Number.isFinite(advice.next.grindSetting));
 assert.ok(Math.abs(advice.next.grindSetting*10-Math.round(advice.next.grindSetting*10))<1e-8);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.grind.value,advice.next.grindSetting);
 assert.notEqual(rec.grind.value,shot.grindSetting);
 assert.deepEqual(shot,original);
});
test('R318 starting recipe and already-tenth measurements preserve existing display conventions',()=>{
 const {state}=fixture({grindSetting:2.5});
 const measured=recommendation(state,'coffee');
 assert.match(recipeGrid(measured),/Grind<\/div><div class="metric-value">2\.5<\/div>/);
 const start=recommendation(state,'coffee',{ignoreAdvice:true});
 assert.notEqual(start.source,'Adjustment from your latest taste rating');
 assert.equal(typeof start.grind.value,'number');
 assert.match(recipeGrid(start),/Grind<\/div><div class="metric-value">/);
});

test('R318 legacy cached NEW grind target still rounds to selectable tenth',()=>{
 const {state,shot}=fixture({timeS:10});
 shot.suggestion={title:'Legacy smaller grind',text:'Try a finer grind',
  next:{grindSetting:2.35,yieldCenter:50}};
 const before=structuredClone(shot);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.grind.value,2.4,'new target is rounded; only an unchanged actual retains precision');
 assert.ok(recipeGrid(rec).includes('<div class="metric-value">2.4</div>'),'new rounded dial is visible');
 assert.deepEqual(shot,before);
});
