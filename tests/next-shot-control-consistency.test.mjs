import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {nextShotAdjustment,recipeGrid} from '../site/lib/ui.js';
function fixture(extra={}){
 const state=hydrate(rawFixture());state.setups[0].versions[0].advanced.temperature=true;
 const shot={id:'latest',coffeeId:'coffee',setupVersionId:'version',style:'Turbo',basketId:'basketv',calibrationId:'cal',feedMode:'standard',
  doseG:20,yieldG:50,timeS:10,grindSetting:1.2,tempC:91,timestamp:'2026-10-21T01:00:00Z',dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},...extra};
 state.shots.push(shot);return {state,shot};
}
test('latest-shot grind adjustment retains actual dose, yield and temperature in the recipe grid',()=>{
 const {state,shot}=fixture();
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 const arrow=nextShotAdjustment(advice,shot,true,'C'),rec=recommendation(state,'coffee');
 assert.equal(arrow.label,'Grind');assert.equal(arrow.before,'1.2');assert.equal(arrow.after,'1.0');
 assert.equal(arrow.keep,'dose, yield, and temperature');
 assert.equal(rec.source,'Adjustment from your latest taste rating');assert.equal(rec.grind.value,1);
 assert.equal(rec.doseG,20);assert.equal(rec.yield.center,50);assert.equal(rec.tempC,91);assert.equal(rec.ratio.center,2.5);
 assert.match(recipeGrid(rec,true,'C'),/Basket-based/,'owner-Locked caption retained pending a separate wording decision');
});
test('yield and temperature adjustments preserve the other actual controls',()=>{
 const yieldCase=fixture({timeS:22}),r1=recommendation(yieldCase.state,'coffee');
 assert.equal(r1.yield.center,55);assert.equal(r1.doseG,20);assert.equal(r1.grind.value,1.2);assert.equal(r1.tempC,91);assert.equal(r1.ratio.center,2.75);
 const tempCase=fixture({timeS:22,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:2}}),r2=recommendation(tempCase.state,'coffee');
 assert.equal(r2.tempC,90);assert.equal(r2.doseG,20);assert.equal(r2.yield.center,50);assert.equal(r2.grind.value,1.2);
});
test('distribution advice and unknown actual temperature do not introduce another setting change',()=>{
 const {state}=fixture({tempC:null,tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}}),rec=recommendation(state,'coffee');
 assert.equal(rec.doseG,20);assert.equal(rec.yield.center,50);assert.equal(rec.grind.value,1.2);assert.equal(rec.tempC,null);
});
test('fresh starting recipes and ignoreAdvice references retain their basket-based baseline',()=>{
 const {state}=fixture();
 const reference=recommendation(state,'coffee',{ignoreAdvice:true});assert.equal(reference.doseG,18);assert.equal(reference.tempC,95);
 state.shots=[];const fresh=recommendation(state,'coffee');assert.equal(fresh.doseG,18);assert.equal(fresh.tempC,95);
});

test('research: check-evenness feedback has no proposed numeric change',()=>{
 const {state,shot}=fixture({tempC:null,tasteScales:{extraction:2,body:3,clarity:2,sweetness:4,astringency:3}});
 const before=structuredClone(shot);
 const advice=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.equal(advice.kind,'diagnostic');
 assert.equal(advice.next,null);
 assert.equal(nextShotAdjustment(advice,shot,true,'C'),null);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Your last measured shot (preparation check)');
 assert.equal(rec.diagnosticOnly,true);
 assert.deepEqual([rec.doseG,rec.yield.center,rec.grind.value,rec.tempC],[20,50,1.2,null]);
 assert.equal(rec.grind.range,undefined);
 assert.deepEqual(shot,before);
});
test('research: older cached unchanged controls remain read-only diagnostic feedback',()=>{
 const {state,shot}=fixture({tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}});
 shot.suggestion={title:'Check evenness first',text:'Legacy advice',next:{grindSetting:shot.grindSetting,yieldCenter:shot.yieldG}};
 const before=structuredClone(shot),rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Your last measured shot (preparation check)');
 assert.equal(rec.diagnosticOnly,true);
 assert.deepEqual([rec.doseG,rec.yield.center,rec.grind.value],[20,50,1.2]);
 assert.equal(rec.grind.range,undefined);
 assert.deepEqual(shot,before);
});
