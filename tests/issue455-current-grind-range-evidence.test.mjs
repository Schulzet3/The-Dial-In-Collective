import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance} from '../site/lib/engine.js';

// Only synthetic archived rows; never real users, cloud or production.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const setup=()=>{const s=hydrate(rawFixture()),v=s.setups[0].versions[0];return{s,v,c:s.coffees[0],basket:v.baskets[0]};};
const shot=(id,extra={})=>({id,coffeeId:'coffee',setupVersionId:'version',
 calibrationId:'cal',basketId:'basketv',style:'Turbo',feedMode:'standard',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,
 timeS:15,grindSetting:2.5,notes:'Original history note',
 timestamp:'2026-10-20T12:00:00Z',...extra});
const guide=(x,feed='standard')=>grindGuidance(x.s,x.c,'Turbo',x.basket,feed);

test('R079 archived out-of-range current grinder is not proven',()=>{
 for(const n of [-.1,5.1,Infinity,NaN]){
  const x=setup();x.s.shots.push(shot('bad',{grindSetting:n}));
  const original=structuredClone(x.s),g=guide(x);
  assert.equal(g.value,3.8);assert.equal(g.proven,false);
  assert.equal(g.source,'Espresso range starting estimate');
  assert.deepEqual(x.s,original);
 }
});
test('R079 corrupted archival dial cannot skew a valid proven median',()=>{
 const x=setup();x.s.shots.push(shot('valid'),shot('bad',{grindSetting:900}));
 const before=structuredClone(x.s),g=guide(x);
 assert.deepEqual([g.value,g.proven,g.source],[2.5,true,'Your successful setting']);
 assert.deepEqual(x.s,before);
});
test('R079 inclusive espresso endpoints remain proven',()=>{
 for(const n of [0,5]){
  const x=setup();x.s.shots.push(shot('endpoint',{grindSetting:n}));
  const g=guide(x);assert.equal(g.value,n);assert.equal(g.proven,true);
 }
});
test('R079 invalid same-roast donor grind cannot seed similar-coffee',()=>{
 const x=setup();x.s.coffees.push({...x.c,id:'other-coffee'});
 x.s.shots.push(shot('bad-other',{coffeeId:'other-coffee',grindSetting:9}));
 assert.equal(guide(x).source,'Espresso range starting estimate');
 x.s.shots.push(shot('good-other',{coffeeId:'other-coffee',grindSetting:1.2}));
 const g=guide(x);assert.equal(g.value,1.2);assert.equal(g.proven,false);
 assert.match(g.source,/similar coffees/);
});
test('R079 invalid archived Slow Feed pair cannot create measured feed offset',()=>{
 const x=setup();x.s.shots.push(
  shot('target-standard',{grindSetting:3}),
  shot('other-standard',{coffeeId:'other',grindSetting:4}),
  shot('other-bad-slow',{coffeeId:'other',feedMode:'slow',grindSetting:9}));
 const before=structuredClone(x.s),g=guide(x,'slow');
 assert.equal(g.value,1);assert.equal(g.proven,false);
 assert.match(g.source,/adjusted from your Standard Feed result/);
 assert.doesNotMatch(g.source,/paired feed-mode/);
 assert.deepEqual(x.s,before);
});
test('R079 valid old snapshot translates relative bounds even when new range differs',()=>{
 const x=setup();x.v.grinderMin=10;x.v.grinderMax=60;
 x.s.shots.push(shot('old',{setupVersionId:'older-version',calibrationId:'older-cal',
  grindSetting:3,snapshot:{grinder:'Test grinder',burrs:'Test burrs',grinderMin:0,grinderMax:5}}));
 const before=structuredClone(x.s),g=guide(x);
 assert.equal(g.value,40);assert.equal(g.proven,false);
 assert.match(g.source,/relative range estimate/);
 assert.deepEqual(x.s,before);
});
