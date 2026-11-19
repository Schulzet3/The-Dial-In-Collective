import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {CONFIG} from '../site/lib/constants.js';

// Pure synthetic fixtures only: no member records, provider traffic or new production accounts.
function fixture({roasterRatio,dose=18,preferences=''}={}){
 const state=hydrate(rawFixture());
 const coffee=state.coffees.find(c=>c.id==='coffee');
 if(roasterRatio===undefined)delete coffee.roasterRecipe;
 else coffee.roasterRecipe={ratio:roasterRatio};
 activeVersion(state).baskets.find(b=>b.id==='basketv').doseG=dose;
 state.preferences=preferences;
 return state;
}
const starting=s=>recommendation(s,'coffee',{
 style:'Traditional',basketId:'basketv',feedMode:'standard',ignoreAdvice:true
});

test('R357 negative: wildly erroneous roaster ratio cannot advertise a non-loggable shot',()=>{
 const reference=starting(fixture());
 for(const roasterRatio of [100,100000]){
  const state=fixture({roasterRatio}),before=structuredClone(state);
  const candidate=starting(state);
  assert.equal(candidate.yield.center,reference.yield.center);
  assert.equal(candidate.ratio.center,reference.ratio.center);
  assert.ok(candidate.yield.center>=CONFIG.bounds.yieldG[0]&&
   candidate.yield.center<=CONFIG.bounds.yieldG[1]);
  assert.match(candidate.reasons.join(' '),/roaster ratio not usable/i);
  assert.deepEqual(state,before,'original source recipe, shots, notes and ratings must remain untouched');
 }
});

test('R357 positive: usable roaster recipe still informs the approved starting ratio',()=>{
 const ordinary=starting(fixture());
 const state=fixture({roasterRatio:3}),before=structuredClone(state);
 const candidate=starting(state);
 assert.ok(candidate.yield.center>ordinary.yield.center);
 assert.ok(candidate.yield.center<=CONFIG.bounds.yieldG[1]);
 assert.match(candidate.reasons.join(' '),/informed by the roaster recipe/i);
 assert.deepEqual(state,before);
});

test('R357 negative: existing clarity preference cannot push a roaster starting recipe beyond 200 g',()=>{
 const state=fixture({roasterRatio:6.6,dose:40,preferences:'clarity'});
 const before=structuredClone(state);
 const candidate=starting(state),ordinary=starting(fixture({dose:40,preferences:'clarity'}));
 assert.equal(candidate.yield.center,ordinary.yield.center);
 assert.ok(candidate.yield.center<=CONFIG.bounds.yieldG[1]);
 assert.match(candidate.reasons.join(' '),/roaster ratio not usable/i);
 assert.deepEqual(state,before);
});

test('R357 control: non-Traditional shot styles are not blended with roaster ratio',()=>{
 const state=fixture({roasterRatio:100}),ordinary=fixture();
 const options={style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true};
 assert.deepEqual(recommendation(state,'coffee',options).ratio,
  recommendation(ordinary,'coffee',options).ratio);
});
