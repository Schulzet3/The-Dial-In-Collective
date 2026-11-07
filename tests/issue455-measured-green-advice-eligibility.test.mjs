import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// R455-095: only synthetic local archived records; no hosted Auth/member writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const nonGreen={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
const make=()=>{const s=hydrate(rawFixture());activeVersion(s).advanced.temperature=true;return s;};
const shot=(id,patch={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
 doseG:20,yieldG:50,timeS:22,grindSetting:1.2,tempC:91,
 timestamp:'2026-11-05T12:00:00Z',dialedIn:false,tasteScales:{...nonGreen},
 notes:'Keep the original private notes',suggestion:{
  title:'Next shot',text:'Explore yield while holding other controls',
  next:{grindSetting:1.2,yieldCenter:55}},...patch
});
const guide=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
const setup=(successPatch={})=>{
 const s=make();s.shots.push(shot('feedback'));
 s.shots.push(shot('archive-green',{
  timestamp:'2026-11-06T12:00:00Z',dialedIn:true,tasteScales:{...green},
  ...successPatch}));
 return s;
};

test('R095 physically invalid all-green archived measurements do not suppress measured advice',()=>{
 for(const invalid of [{doseG:4},{doseG:40.1},{doseG:null},{doseG:'20'},
  {yieldG:4},{yieldG:200.1},{yieldG:Infinity},{yieldG:'50'},
  {timeS:0},{timeS:180.1},{timeS:NaN},{timeS:'22'}]){
  const s=setup(invalid),original=structuredClone(s),r=guide(s);
  assert.equal(r.source,'Adjustment from your latest taste rating',JSON.stringify(invalid));
  assert.equal(r.doseG,20);assert.equal(r.yield.center,55);
  assert.equal(r.grind.value,1.2);assert.equal(r.tempC,91);
  assert.deepEqual(s,original,'Never rewrite original five ratings, notes or cached advice');
 }
});

test('R095 physically valid all-green success still suppresses a conflicting next adjustment',()=>{
 for(const physical of [{doseG:5,yieldG:5,timeS:1},
  {doseG:40,yieldG:200,timeS:180},{doseG:20,yieldG:50,timeS:22}]){
  const s=setup(physical),before=structuredClone(s),r=guide(s);
  assert.notEqual(r.source,'Adjustment from your latest taste rating');
  assert.deepEqual(s,before);
 }
});

test('R095 style-time guidelines never veto physically valid all-green rating',()=>{
 const s=setup({timeS:110});
 const r=guide(s);
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.equal(s.shots[1].dialedIn,true);
 assert.deepEqual(s.shots[1].tasteScales,green);
});

test('R095 incomplete or nonideal ratings never become success evidence',()=>{
 for(const invalid of [
  {tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,extraction:2}},
  {dialedIn:false,tasteScales:{...green}},
  {hidden:true}
 ]){
  const s=setup(invalid),before=structuredClone(s);
  assert.equal(guide(s).source,'Adjustment from your latest taste rating');
  assert.deepEqual(s,before);
 }
});

test('R095 success on a different coffee, version or style does not veto this measured advice',()=>{
 for(const patch of [{coffeeId:'other'},{setupVersionId:'old-version'},{style:'Traditional'}]){
  const s=setup(patch);
  assert.equal(guide(s).source,'Adjustment from your latest taste rating',JSON.stringify(patch));
 }
});

test('R095 an older valid success retains priority over newer non-green feedback',()=>{
 const s=make();
 s.shots.push(shot('old-green',{timestamp:'2026-11-04T12:00:00Z',
  dialedIn:true,tasteScales:{...green}}));
 s.shots.push(shot('new-feedback',{timestamp:'2026-11-06T12:00:00Z'}));
 const before=structuredClone(s);
 assert.notEqual(guide(s).source,'Adjustment from your latest taste rating');
 assert.deepEqual(s,before);
});

test('R095 invalid green only, without measured feedback, still gives a starting recommendation',()=>{
 const s=make();s.shots.push(shot('unmeasured-green',{
  dialedIn:true,tasteScales:{...green},timeS:181}));
 const before=structuredClone(s);
 assert.equal(guide(s).source,'Starting recommendation');
 assert.deepEqual(s,before);
});
