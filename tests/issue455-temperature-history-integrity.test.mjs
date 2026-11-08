import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {prefill,recommendation} from '../site/lib/engine.js';

// Synthetic restored-history fixtures only. Never read or mutate a real member.
const green=()=>({extraction:3,body:3,clarity:5,sweetness:5,astringency:1});
const state=()=>{const s=hydrate(rawFixture());activeVersion(s).advanced.temperature=true;return s;};
const shot=(id,timestamp,overrides={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',basketId:'basketv',
 calibrationId:'cal',style:'Turbo',feedMode:'standard',
 doseG:18,grindSetting:2.5,timeS:16,yieldG:45,
 notes:'Keep the original private archive intact',timestamp,hidden:false,
 tempC:94,tasteScales:green(),dialedIn:true,...overrides
});
const older='2026-11-05T12:00:00Z',newer='2026-11-06T12:00:00Z';
const next=s=>prefill(s,'coffee',{basketId:'basketv',style:'Turbo',feedMode:'standard'});
const rec=s=>recommendation(s,'coffee',{basketId:'basketv',style:'Turbo',feedMode:'standard'});

test('R083 Log Shot temperature prefill ignores invalid later archived measurements',()=>{
 for(const tempC of [0,-20,101,180,NaN,Infinity,'96']){
  const s=state();s.shots.push(shot('valid',older,{tempC:94}),shot('bad',newer,{tempC}));
  const original=structuredClone(s);
  assert.equal(next(s).tempC,94,String(tempC));
  assert.deepEqual(s,original,'preserve original shot data and private notes');
 }
});

test('R083 Log Shot falls back to no recorded temperature when no eligible history exists',()=>{
 const s=state();s.shots.push(shot('bad',newer,{tempC:999}));
 assert.equal(next(s).tempC,null);
 assert.deepEqual(Object.values(next(s).tasteScales),[null,null,null,null,null]);
 assert.equal(next(s).notes,'');
});

test('R083 valid inclusive logged temperature endpoints and same-style priority survive',()=>{
 for(const tempC of [70,100]){
  const s=state();s.shots.push(shot('endpoint',older,{tempC}),shot('new-other',newer,{style:'Traditional',tempC:90}));
  const original=structuredClone(s);
  assert.equal(next(s).tempC,tempC);
  assert.deepEqual(s,original);
 }
});

test('R083 new-shot prefill does not invent temperature when tracking is disabled',()=>{
 const s=state();s.shots.push(shot('valid',newer,{tempC:93}));
 activeVersion(s).advanced.temperature=false;
 assert.equal(next(s).tempC,null);
});

test('R083 successful historical out-of-bounds temperature cannot contaminate recommendation',()=>{
 for(const tempC of [-10,101,500,NaN,Infinity,'94']){
  const s=state();s.shots.push(shot('bad',newer,{tempC}));
  const original=structuredClone(s);
  assert.equal(rec(s).tempC,95,String(tempC));
  assert.deepEqual(s,original,'recommendations never modify measured history');
 }
});

test('R083 valid measured temperatures continue informing same-style personal guidance',()=>{
 const s=state();
 s.shots.push(shot('valid-70',older,{tempC:70}),shot('valid-100',newer,{tempC:100}));
 assert.equal(rec(s).tempC,85);
});

test('R083 invalid or incomplete five-taste success evidence never becomes temperature proof',()=>{
 const s=state();s.shots.push(
  shot('stale',newer,{tempC:91,tasteScales:{...green(),sweetness:null}}),
  shot('not-green',older,{tempC:92,tasteScales:{...green(),body:2}})
 );
 assert.equal(rec(s).tempC,95);
});
