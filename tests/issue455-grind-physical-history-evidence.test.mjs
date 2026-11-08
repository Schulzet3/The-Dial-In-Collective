import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,recommendation} from '../site/lib/engine.js';

// Synthetic imported records only; never actual member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const setup=()=>{const s=hydrate(rawFixture()),v=s.setups[0].versions[0];return {s,v,c:s.coffees[0],basket:v.baskets[0]};};
const shot=(id,extra={})=>({id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:15,grindSetting:2.5,notes:'Preserve private note',timestamp:'2026-10-20T12:00:00Z',...extra});
const guide=(x,feed='standard')=>grindGuidance(x.s,x.c,'Turbo',x.basket,feed);
test('R090 invalid archived dose/yield/time cannot establish a proven grinder',()=>{
 for(const extra of [{doseG:2},{doseG:41},{yieldG:2},{yieldG:201},{timeS:0},{timeS:181},{doseG:null},{yieldG:'36'},{timeS:Infinity}]){
  const x=setup();x.s.shots.push(shot('bad',extra));const original=structuredClone(x.s);
  const g=guide(x);
  assert.deepEqual([g.value,g.proven,g.source],[3.8,false,'Espresso range starting estimate'],JSON.stringify(extra));
  assert.deepEqual(x.s,original);
 }
});
test('R090 valid inclusive dose/yield/time endpoints retain provenance and grind',()=>{
 for(const extra of [{doseG:5,yieldG:5,timeS:1},{doseG:40,yieldG:200,timeS:180}]){
  const x=setup();x.s.shots.push(shot('valid',extra));
  const g=guide(x);assert.deepEqual([g.value,g.proven,g.source],[2.5,true,'Your successful setting']);
 }
});
test('R090 corrupt historical measurements cannot skew a valid grind median',()=>{
 const x=setup();x.s.shots.push(shot('good'),shot('bad',{yieldG:230,grindSetting:0.1}));
 const original=structuredClone(x.s),g=guide(x);
 assert.deepEqual([g.value,g.proven,g.source],[2.5,true,'Your successful setting']);
 assert.deepEqual(x.s,original);
});
test('R090 invalid similar coffee cannot seed a personal grinder prior',()=>{
 const x=setup();x.s.coffees.push({...x.c,id:'other-coffee'});
 x.s.shots.push(shot('bad',{coffeeId:'other-coffee',grindSetting:1.1,timeS:181}));
 assert.equal(guide(x).source,'Espresso range starting estimate');
 x.s.shots.push(shot('good',{coffeeId:'other-coffee',grindSetting:1.9}));
 const g=guide(x);assert.equal(g.value,1.9);assert.equal(g.proven,false);assert.match(g.source,/similar coffees/);
});
test('R090 previous-calibration translation excludes invalid physical record',()=>{
 const x=setup(),old={setupVersionId:'older-version',calibrationId:'old-cal',grindSetting:3,
  snapshot:{grinder:'Test grinder',burrs:'Test burrs',grinderMin:0,grinderMax:5}};
 x.s.shots.push(shot('bad',{...old,doseG:41}));
 assert.equal(guide(x).source,'Espresso range starting estimate');
 x.s.shots.push(shot('good',old));
 const g=guide(x);assert.equal(g.value,3);assert.equal(g.proven,false);assert.match(g.source,/relative range estimate/);
});
test('R090 invalid Slow Feed paired history cannot establish measured offset',()=>{
 const x=setup();x.s.shots.push(shot('target-standard',{grindSetting:3}),
  shot('other-standard',{coffeeId:'other',grindSetting:4}),
  shot('other-slow-bad',{coffeeId:'other',feedMode:'slow',grindSetting:2,timeS:181}));
 const original=structuredClone(x.s),g=guide(x,'slow');
 assert.equal(g.value,1);
 assert.match(g.source,/adjusted from your Standard Feed result/);
 assert.doesNotMatch(g.source,/paired feed-mode/);
 assert.deepEqual(x.s,original);
 x.s.shots.push(shot('other-slow-good',{coffeeId:'other',feedMode:'slow',grindSetting:2}));
 assert.match(guide(x,'slow').source,/paired feed-mode/);
});
test('R090 invalid Standard Feed reading cannot anchor Slow Feed starter',()=>{
 const x=setup();x.s.shots.push(shot('bad',{grindSetting:3,doseG:2}));
 const provisional=guide(x,'slow');
 assert.equal(provisional.value,1.8);assert.match(provisional.source,/Cautious Slow Feed/);
 x.s.shots.push(shot('good',{grindSetting:3}));
 const measured=guide(x,'slow');assert.equal(measured.value,1);
 assert.match(measured.source,/adjusted from your Standard Feed result/);
});
test('R090 hidden, missing five ratings, other style, and feed are still excluded',()=>{
 for(const extra of [{hidden:true},{dialedIn:false},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,body:2}},{style:'Traditional'},{feedMode:'slow'}]){
  const x=setup(),prior=guide(x);x.s.shots.push(shot('bad',extra));
  assert.deepEqual(guide(x),prior,JSON.stringify(extra));
 }
});
test('R090 real recommendation path consumes guarded grind without changing original history',()=>{
 const x=setup();x.s.shots.push(shot('bad',{yieldG:230,grindSetting:1}));
 const original=structuredClone(x.s.shots[0]),opts={style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true};
 const a=recommendation(x.s,'coffee',opts);
 assert.equal(a.grind.source,'Espresso range starting estimate');assert.equal(a.grind.proven,false);
 x.s.shots.push(shot('good',{grindSetting:2.5}));
 const b=recommendation(x.s,'coffee',opts);
 assert.equal(b.grind.source,'Your successful setting');assert.equal(b.grind.value,2.5);assert.equal(b.grind.proven,true);
 assert.deepEqual(x.s.shots[0],original);
});
