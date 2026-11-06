import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';

// Synthetic historical/offline records only. Never access member records or providers.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const create=()=>{const state=hydrate(rawFixture());return {state,coffee:state.coffees[0]};};
const archived=(coffeeId,style,extra={})=>({
 id:'archived',coffeeId,style,setupId:'setup',setupVersionId:'version',
 calibrationId:'cal',basketId:'basketv',feedMode:'standard',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:13,
 grindSetting:1.5,tempC:93,timestamp:'2026-10-30T12:00:00Z',
 notes:'Preserve private historical note',familyId:null,...extra
});
const get=(s,c,style)=>recommendation(s,c.id,{style,ignoreAdvice:true});

test('#455 false archived cross-style success never suppresses valid similar-coffee evidence',()=>{
 for(const override of [
  {tasteScales:null},{tasteScales:{...green,clarity:null}},
  {tasteScales:{...green,body:4}},{tasteScales:{...green,sweetness:'5'}},
  {dialedIn:'true'}
 ]){
  const {state,coffee}=create();
  state.coffees.push({...coffee,id:'similar-coffee',name:'Comparable coffee'});
  state.shots.push(
   archived(coffee.id,'Traditional',{id:'bad-cross',...override}),
   archived('similar-coffee','Turbo',{id:'valid-similar',yieldG:39,timeS:27}));
  const before=structuredClone(state),rec=get(state,coffee,'Turbo');
  assert.equal(rec.source,'Your successful similar coffees on this setup',JSON.stringify(override));
  assert.equal(rec.observations,1);
  assert.deepEqual(state,before,'original imported shot is not rewritten');
 }
});

test('#455 original five-green cross-style evidence retains higher-priority style boundary',()=>{
 const {state,coffee}=create();
 state.coffees.push({...coffee,id:'similar-coffee',name:'Comparable coffee'});
 state.shots.push(
  archived(coffee.id,'Traditional',{id:'true-cross'}),
  archived('similar-coffee','Turbo',{id:'valid-similar',yieldG:39,timeS:27}));
 const before=structuredClone(state),rec=get(state,coffee,'Turbo');
 assert.notEqual(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.observations,0);
 assert.deepEqual(state,before);
});

test('#455 Turbo-to-Fast-Flow ratio-only fallback requires five original ideal ratings',()=>{
 for(const override of [
  {tasteScales:null},{tasteScales:{...green,astringency:2}},
  {tasteScales:{...green,body:'3'}},{dialedIn:1}
 ]){
  const {state,coffee}=create(),starting=get(state,coffee,'Fast-Flow');
  state.shots.push(archived(coffee.id,'Turbo',{yieldG:40,timeS:13,...override}));
  const before=structuredClone(state),rec=get(state,coffee,'Fast-Flow');
  assert.equal(rec.turboFallback,undefined,JSON.stringify(override));
  assert.deepEqual(rec.ratio,starting.ratio);
  assert.deepEqual(rec.time,starting.time);
  assert.deepEqual(state,before);
 }
 const {state,coffee}=create(),starting=get(state,coffee,'Fast-Flow');
 state.shots.push(archived(coffee.id,'Turbo',{yieldG:40,timeS:13}));
 const before=structuredClone(state),rec=get(state,coffee,'Fast-Flow');
 assert.equal(rec.turboFallback?.ratioOnly,true);
 assert.notEqual(rec.ratio.center,starting.ratio.center);
 assert.deepEqual(rec.time,starting.time,'Turbo time must not transfer');
 assert.deepEqual(state,before);
});

test('#455 legacy cross-style weak ratio adjustment excludes stale ratings while preserving genuine input',()=>{
 const {state,coffee}=create(),base=get(state,coffee,'Turbo');
 state.shots.push(archived(coffee.id,'Traditional',{tasteScales:{...green,clarity:3}}));
 const before=structuredClone(state),invalid=get(state,coffee,'Turbo');
 assert.deepEqual(invalid.ratio,base.ratio);
 assert.doesNotMatch(invalid.reasons.join(' '),/other styles/);
 assert.deepEqual(state,before);
 state.shots[0].tasteScales={...green};
 const valid=get(state,coffee,'Turbo');
 assert.notEqual(valid.ratio.center,base.ratio.center);
 assert.match(valid.reasons.join(' '),/other styles/);
});
