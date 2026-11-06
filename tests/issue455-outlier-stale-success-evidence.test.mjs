import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';

// Synthetic local/offline historical records only. No provider or member access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const init=()=>{const state=hydrate(rawFixture());return {state,coffee:state.coffees[0]};};
const target=coffeeId=>({id:'new',coffeeId,style:'Turbo',setupVersionId:'version',doseG:18,yieldG:36,timeS:20});
const archived=(id,coffeeId,extra={})=>({
 id,coffeeId,style:'Turbo',setupVersionId:'version',hidden:false,
 dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:60,
 notes:'Original private historical note must not change',...extra
});
const add=(state,coffeeId,n,extra={})=>{
 for(let i=0;i<n;i++)state.shots.push(archived('old-'+state.shots.length,coffeeId,extra));
};

test('#455 historical truthy success marker alone cannot trigger a false outlier-review prompt',()=>{
 for(const override of [
  {tasteScales:null},{tasteScales:{...green,clarity:null}},
  {tasteScales:{...green,astringency:2}},
  {tasteScales:{...green,body:'3'}},{dialedIn:'true'}
 ]){
  const {state,coffee}=init();
  add(state,coffee.id,4,override);
  const before=structuredClone(state),fresh=target(coffee.id);
  assert.equal(isExtreme(state,fresh),false,JSON.stringify(override));
  assert.deepEqual(state,before,'original archived records remain unchanged');
 }
});

test('#455 minimum four qualifying all-five-green histories and legitimate outlier detection',()=>{
 const {state,coffee}=init(),fresh=target(coffee.id);
 add(state,coffee.id,3);
 state.shots.push(archived('stale-fourth',coffee.id,{tasteScales:{...green,sweetness:4}}));
 assert.equal(isExtreme(state,fresh),false,'three proven successes cannot become four via a stale marker');
 state.shots.push(archived('valid-fourth',coffee.id));
 const before=structuredClone(state);
 assert.equal(isExtreme(state,fresh),true,'four genuine successes retain existing time outlier threshold');
 assert.deepEqual(state,before);
});

test('#455 unchanged ratio threshold, style and selected setup boundaries',()=>{
 const {state,coffee}=init();
 add(state,coffee.id,4,{timeS:20});
 const before=structuredClone(state);
 assert.equal(isExtreme(state,{...target(coffee.id),yieldG:58.5}),false,'exact ratio boundary is not an outlier');
 assert.equal(isExtreme(state,{...target(coffee.id),yieldG:63}),true,'ratio above existing boundary remains an outlier');
 assert.equal(isExtreme(state,{...target(coffee.id),style:'Traditional',yieldG:63}),false);
 assert.equal(isExtreme(state,{...target(coffee.id),setupVersionId:'other-version',yieldG:63}),false);
 assert.equal(isExtreme(state,{...target('other-coffee'),yieldG:63}),false);
 assert.deepEqual(state,before);
});

test('#455 hidden and same-id archival records remain excluded without mutating history',()=>{
 const {state,coffee}=init();
 add(state,coffee.id,2);
 state.shots.push(archived('new',coffee.id),archived('hidden',coffee.id,{hidden:true}));
 const before=structuredClone(state);
 assert.equal(isExtreme(state,target(coffee.id)),false);
 assert.deepEqual(state,before);
});

test('#455 actual local saveShot outlier flag ignores stale archival markers while retaining a measured shot',()=>{
 const {state,coffee}=init();
 add(state,coffee.id,4,{tasteScales:{...green,body:4}});
 const originals=structuredClone(state.shots);
 const shot=saveShot(state,coffee.id,{
  basketId:'basketv',style:'Turbo',doseG:18,yieldG:36,timeS:20,
  grindSetting:1,feedMode:'standard',notes:'Private new shot note',
  tasteScales:{...green,body:4}
 });
 assert.equal(shot.outlierReview,'not_needed');
 assert.equal(shot.dialedIn,false);
 assert.equal(shot.notes,'Private new shot note');
 assert.deepEqual(state.shots.slice(0,4),originals,'original records must not be rewritten');
});
