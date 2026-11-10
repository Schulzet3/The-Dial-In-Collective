import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';
import {hasLocalSuccess} from '../site/lib/model.js';

// R455-158: synthetic imported history; no member/production data.
const ideal={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const needsAdjustment={extraction:2,body:2,clarity:3,sweetness:2,astringency:1};
const shot=(id,patch={})=>({
 id,coffeeId:'coffee',setupId:'setup',setupVersionId:'version',style:'Turbo',
 basketId:'basketv',calibrationId:'cal',feedMode:'standard',
 doseG:18,yieldG:39,timeS:10,grindSetting:1.2,tempC:92,
 timestamp:'2026-11-10T11:00:00Z',hidden:false,dialedIn:false,
 tasteScales:{...needsAdjustment},familyId:null,suggestion:null,...patch
});
const oldGreen=(patch={})=>shot('preserved-green',{
 timestamp:'2026-11-09T11:00:00Z',dialedIn:true,
 tasteScales:{...ideal},notes:'Keep original private notes',...patch
});
const current=()=>shot('recent-valid');
const state=shots=>{const s=hydrate(rawFixture());s.shots=shots;return s;};
const rec=s=>recommendation(s,'coffee');
const actionable='Adjustment from your latest taste rating';

test('R158 invalid archived grinder readings cannot veto the latest valid non-green feedback',()=>{
 for(const grindSetting of [null,undefined,'1.2',NaN,Infinity,-Infinity,-.1,5.1]){
  const s=state([oldGreen({grindSetting}),current()]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee','Turbo'),false,String(grindSetting));
  const next=rec(s);
  assert.equal(next.source,actionable,String(grindSetting));
  assert.equal(next.diagnosticOnly,false);
  assert.deepEqual(s,before,'Keep original archived shot, greens and notes');
 }
});
test('R158 invalid optional archived temperatures cannot veto valid feedback',()=>{
 for(const tempC of [69.9,100.1,'92',NaN,Infinity,-Infinity]){
  const s=state([oldGreen({tempC}),current()]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee','Turbo'),false,String(tempC));
  assert.equal(rec(s).source,actionable,String(tempC));
  assert.deepEqual(s,before);
 }
});
test('R158 genuine five-green measured success still suppresses a redundant next change',()=>{
 for(const patch of [{grindSetting:0,tempC:70},{grindSetting:5,tempC:100},
  {grindSetting:2.2,tempC:null},{grindSetting:2.2,tempC:undefined}]){
  const s=state([oldGreen(patch),current()]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee','Turbo'),true);
  assert.notEqual(rec(s).source,actionable,'A legitimate local success is preserved');
  assert.deepEqual(s,before);
 }
});
test('R158 success remains isolated by style, feed, basket and calibration',()=>{
 for(const patch of [
  {style:'Traditional'},{feedMode:'slow'},{basketId:'different-basket'},
  {calibrationId:'old-calibration'},{setupVersionId:'older-version'}
 ]){
  const s=state([oldGreen(patch),current()]),before=structuredClone(s);
  assert.equal(rec(s).source,actionable,JSON.stringify(patch));
  assert.deepEqual(s,before);
 }
});
test('R158 newest valid all-green shot remains a preserved success',()=>{
 const s=state([current(),oldGreen({
  id:'newer-green',timestamp:'2026-11-10T12:00:00Z',
  grindSetting:5,tempC:100
 })]),before=structuredClone(s);
 assert.equal(hasLocalSuccess(s,'coffee','Turbo'),true);
 assert.notEqual(rec(s).source,actionable);
 assert.deepEqual(s,before);
});
