import test from 'node:test';
import assert from 'node:assert/strict';
import {prefill} from '../site/lib/engine.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

// Synthetic local-only shots, never hosted member or provider records.
const fixture=()=>{
 const s=hydrate(rawFixture()),coffee=s.coffees[0],v=s.setups[0].versions[0];
 v.advanced.temperature=true;
 const basket=v.baskets[0];
 const prior=(updates={})=>({id:'old-private-shot',coffeeId:coffee.id,
  setupVersionId:v.id,calibrationId:v.calibrationId,basketId:basket.id,
  style:'Traditional',feedMode:'standard',timestamp:'2026-11-10T12:00:00Z',
  doseG:18,yieldG:36,timeS:26,grindSetting:2,tempC:94,
  notes:'Private historical note',hidden:false,dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:2},
  snapshot:{grinderMin:0,grinderMax:5},...updates});
 return {s,coffee,v,basket,prior};
};
const draft=(f,options={})=>prefill(f.s,f.coffee.id,
 {style:'Traditional',basketId:f.basket.id,feedMode:'standard',...options});

test('R270 matching style, basket and feed has no false context hint',()=>{
 const f=fixture();f.s.shots=[f.prior()];
 const before=structuredClone(f.s.shots),out=draft(f);
 assert.equal(out.tempC,94);assert.equal(out.tempSource,'');
 assert.deepEqual(f.s.shots,before);
});
test('R270 identical style from retired basket names different basket',()=>{
 const f=fixture();f.s.shots=[f.prior({basketId:'retired-basket'})];
 const out=draft(f);
 assert.equal(out.tempC,94);
 assert.equal(out.tempSource,'Last used with a different basket');
 assert.equal(out.basketId,f.basket.id);
});
test('R270 identical style from Slow Feed names original feed mode',()=>{
 const f=fixture();f.s.shots=[f.prior({feedMode:'slow'})];
 const out=draft(f);
 assert.equal(out.tempC,94);assert.equal(out.tempSource,'Last used with Slow Feed');
 assert.equal(out.feedMode,'standard');
});
test('R270 cross-style different basket and feed all remain visible',()=>{
 const f=fixture();f.s.shots=[f.prior({style:'Turbo',basketId:'old-basket'})];
 const out=draft(f,{style:'Lungo',feedMode:'slow'});
 assert.equal(out.tempC,94);
 assert.equal(out.tempSource,'Last used on Turbo (a different basket, Standard Feed)');
});
test('R270 legacy unknown feed does not invent difference',()=>{
 const f=fixture();f.s.shots=[f.prior({feedMode:undefined})];
 assert.equal(draft(f).tempSource,'');
});
test('R270 temperature tracking OFF has no value or hidden stale origin',()=>{
 const f=fixture();f.s.shots=[f.prior({style:'Turbo',feedMode:'slow'})];
 f.v.advanced.temperature=false;
 const out=draft(f);
 assert.equal(out.tempC,null);assert.equal(out.tempSource,'');
 assert.deepEqual(out.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
});
