import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// Synthetic archived observations; no member, Auth or provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const make=()=>{const s=hydrate(rawFixture());activeVersion(s).advanced.temperature=true;return s;};
const prior=(id,extra={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
 doseG:18,yieldG:45,timeS:16,grindSetting:2.5,tempC:91,
 tasteScales:{...green},dialedIn:true,notes:'Original private note remains',
 timestamp:'2026-11-05T12:00:00Z',...extra
});
const guide=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true});

test('R091 out-of-entry-bounds historic dose/yield/time never determines personal temperature',()=>{
 for(const extra of [
  {doseG:4},{doseG:41},{yieldG:4},{yieldG:201},{timeS:0},{timeS:181},
  {doseG:null},{yieldG:'45'},{timeS:Infinity},{doseG:NaN}
 ]){
  const s=make();s.shots.push(prior('bad',extra));const original=structuredClone(s);
  assert.equal(guide(s).tempC,95,JSON.stringify(extra));
  assert.deepEqual(s,original,'recommendation does not rewrite original history/notes');
 }
});
test('R091 valid inclusive physical measurement endpoints retain legitimate personal temperature',()=>{
 const s=make();
 s.shots.push(prior('lo',{doseG:5,yieldG:5,timeS:1,tempC:70}),
  prior('hi',{doseG:40,yieldG:200,timeS:180,tempC:100}));
 assert.equal(guide(s).tempC,85);
});
test('R091 invalid imported measurement cannot bias a valid personal temperature mean',()=>{
 const s=make();
 s.shots.push(prior('good',{tempC:93}),prior('corrupt',{yieldG:230,tempC:71}));
 const original=structuredClone(s);
 assert.equal(guide(s).tempC,93);
 assert.deepEqual(s,original);
});
test('R091 valid two-shot same-coffee temperature history still averages normally',()=>{
 const s=make();
 s.shots.push(prior('one',{tempC:92}),prior('two',{tempC:96}));
 assert.equal(guide(s).tempC,94);
});
test('R091 chosen successful recipe family ignores physically impossible family member',()=>{
 const s=make();s.families.push({id:'chosen',coffeeId:'coffee',style:'Turbo',seedRatio:2.5});
 s.shots.push(prior('good',{familyId:'chosen',tempC:94}),
  prior('bad',{familyId:'chosen',doseG:42,tempC:72}));
 const original=structuredClone(s),r=guide(s);
 assert.equal(r.familyId,'chosen');
 assert.equal(r.tempC,94);
 assert.deepEqual(s,original);
});
test('R091 incomplete five tastes, hidden, other coffee and other style never become temperature proof',()=>{
 for(const extra of [
  {hidden:true},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,extraction:2}},{dialedIn:false},
  {coffeeId:'different'},{style:'Traditional'}
 ]){
  const s=make();s.shots.push(prior('not-eligible',{tempC:87,...extra}));
  assert.equal(guide(s).tempC,95,JSON.stringify(extra));
 }
});
test('R091 invalid historic temperature still fails separately from physical validity',()=>{
 const s=make();s.shots.push(prior('bad',{tempC:101}));
 assert.equal(guide(s).tempC,95);
 s.shots.push(prior('good',{tempC:91}));
 assert.equal(guide(s).tempC,91);
});
