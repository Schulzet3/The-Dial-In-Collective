import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';

// R180 synthetic source-level archived-shot tests; no live user, provider or SQL.
const taste={extraction:2,body:3,clarity:5,sweetness:5,astringency:1};
function state(){
 const s=hydrate(rawFixture());s.shots=[];s.families=[];s.communityEvidence={};
 return s;
}
function shot(id,timestamp,extra={}){
 return {
  id,coffeeId:'coffee',setupId:'setup',setupVersionId:'version',
  calibrationId:'cal',style:'Turbo',basketId:'basketv',feedMode:'standard',
  timestamp,doseG:18,yieldG:44,timeS:16,grindSetting:2,tempC:null,
  tasteScales:{...taste},dialedIn:false,hidden:false,notes:'Preserved private shot note',
  suggestion:null,snapshot:{grinderMin:0,grinderMax:5},...extra
 };
}
const guide=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
function pair(badPatch={}){
 const s=state();
 const earlier=shot('older-valid','2026-11-09T12:00:00Z');
 const newer=shot('newer-archived','2026-11-10T12:00:00Z',{
  tasteScales:{...taste,extraction:4},yieldG:50,
  suggestion:{title:'Cached historical next',text:'Archived only',next:{grindSetting:2,yieldCenter:67}},
  snapshot:{grinderMin:4,grinderMax:5},...badPatch
 });
 s.shots.push(earlier,newer);return {s,earlier,newer};
}
test('R180 invalid original grinder snapshot cannot replace older measured non-green advice',()=>{
 const f=pair();const before=structuredClone(f.s);
 const only=state();only.shots.push(structuredClone(f.earlier));
 const reference=guide(only),actual=guide(f.s);
 assert.equal(reference.source,'Adjustment from your latest taste rating');
 assert.equal(actual.source,reference.source);
 assert.equal(actual.yield.center,reference.yield.center);
 assert.notEqual(actual.yield.center,67);
 assert.deepEqual(f.s,before);
});
test('R180 inverted original archived grinder range is not valid newest advice',()=>{
 const f=pair({snapshot:{grinderMin:5,grinderMax:4}});
 const only=state();only.shots.push(structuredClone(f.earlier));
 const before=structuredClone(f.s);
 assert.equal(guide(f.s).yield.center,guide(only).yield.center);
 assert.deepEqual(f.s,before);
});
test('R180 valid original range still admits newest measured and cached advice',()=>{
 const f=pair({snapshot:{grinderMin:0,grinderMax:5}}),before=structuredClone(f.s);
 assert.equal(guide(f.s).yield.center,67);
 assert.deepEqual(f.s,before);
});
test('R180 valid original inclusive endpoint remains eligible',()=>{
 const f=pair({grindSetting:5,snapshot:{grinderMin:4,grinderMax:5},
  suggestion:{title:'Cached historical next',text:'Archived only',next:{grindSetting:5,yieldCenter:67}}});
 const before=structuredClone(f.s);
 assert.equal(guide(f.s).yield.center,67);
 assert.deepEqual(f.s,before);
});
test('R180 absent optional legacy snapshot preserves current-calibration fallback',()=>{
 const f=pair({snapshot:null}),before=structuredClone(f.s);
 assert.equal(guide(f.s).yield.center,67);
 assert.deepEqual(f.s,before);
});
test('R180 only corrupt imported non-green shot cannot masquerade as rated feedback',()=>{
 const f=pair(),s=state();s.shots=[structuredClone(f.newer)];
 const before=structuredClone(s);
 assert.notEqual(guide(s).source,'Adjustment from your latest taste rating');
 assert.deepEqual(s,before);
});
