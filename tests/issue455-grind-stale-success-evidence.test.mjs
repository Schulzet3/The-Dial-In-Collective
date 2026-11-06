import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance} from '../site/lib/engine.js';

// Synthetic local history only, never actual member/provider state.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const setup=()=>{const s=hydrate(rawFixture()),v=s.setups[0].versions[0];return {s,v,c:s.coffees[0],basket:v.baskets[0]};};
const shot=(overrides={})=>({id:'historic',coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,
 tasteScales:{...green},doseG:18,yieldG:45,timeS:18,grindSetting:1.2,
 notes:'Original private history note',timestamp:'2026-10-20T12:00:00Z',...overrides});

test('#455 archived incomplete/nonideal tastes and typed flags cannot supply proven grind',()=>{
 for(const override of [
  {tasteScales:null},{tasteScales:{}},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,clarity:'5'}},{tasteScales:{...green,body:4}},
  {dialedIn:'true'},{dialedIn:1}
 ]){
  const {s,c,basket}=setup();s.shots.push(shot(override));const before=structuredClone(s);
  const r=grindGuidance(s,c,'Turbo',basket,'standard');
  assert.equal(r.value,3.8);assert.equal(r.proven,false);
  assert.equal(r.source,'Espresso range starting estimate');assert.deepEqual(s,before);
 }
});

test('#455 true all-five-green exact coffee remains a proven precise unchanged setting',()=>{
 const {s,c,basket}=setup();s.shots.push(shot({grindSetting:1.4}));
 const before=structuredClone(s),r=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.deepEqual([r.value,r.proven,r.source],[1.4,true,'Your successful setting']);
 assert.deepEqual(s,before);
});

test('#455 a stale similar-coffee record never becomes a successful grind source',()=>{
 const {s,c,basket}=setup();s.coffees.push({...c,id:'other-coffee'});
 s.shots.push(shot({coffeeId:'other-coffee',grindSetting:2.1,tasteScales:{...green,body:4}}));
 assert.equal(grindGuidance(s,c,'Turbo',basket,'standard').source,'Espresso range starting estimate');
 s.shots[0].tasteScales={...green};
 const r=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.equal(r.value,2.1);assert.equal(r.proven,false);assert.match(r.source,/similar coffees/);
});

test('#455 unverified historic cross-calibration grind cannot produce a translated reference',()=>{
 const {s,c,basket}=setup();
 const old=shot({setupVersionId:'older-version',calibrationId:'older-cal',
  snapshot:{grinder:'Test grinder',burrs:'Test burrs',grinderMin:0,grinderMax:5},
  grindSetting:2.4,tasteScales:{...green,astringency:2}});s.shots.push(old);
 assert.equal(grindGuidance(s,c,'Turbo',basket,'standard').source,'Espresso range starting estimate');
 old.tasteScales={...green};
 const r=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.equal(r.value,2.4);assert.equal(r.proven,false);assert.match(r.source,/relative range estimate/);
});

test('#455 unverified slow-feed pair cannot affect standard-feed anchored slow estimate',()=>{
 const {s,c,basket}=setup();
 s.shots.push(shot({id:'standard',grindSetting:3}),
  shot({id:'unrated-slow',feedMode:'slow',grindSetting:.5,tasteScales:{...green,sweetness:null}}));
 const before=structuredClone(s),r=grindGuidance(s,c,'Turbo',basket,'slow');
 assert.equal(r.value,1);assert.match(r.source,/adjusted from your Standard Feed result/);
 assert.deepEqual(s,before);
 s.shots[1].tasteScales={...green};
 const genuine=grindGuidance(s,c,'Turbo',basket,'slow');
 assert.equal(genuine.value,.5);assert.equal(genuine.proven,true);
});

test('#455 unrated standard feed anchor cannot move unproven slow-feed starter',()=>{
 const {s,c,basket}=setup();s.shots.push(shot({grindSetting:3,tasteScales:{...green,clarity:null}}));
 const before=structuredClone(s),invalid=grindGuidance(s,c,'Turbo',basket,'slow');
 assert.equal(invalid.value,1.8);assert.match(invalid.source,/Cautious Slow Feed starting estimate/);
 assert.deepEqual(s,before);
 s.shots[0].tasteScales={...green};
 const valid=grindGuidance(s,c,'Turbo',basket,'slow');
 assert.equal(valid.value,1);assert.match(valid.source,/Standard Feed result/);
});
