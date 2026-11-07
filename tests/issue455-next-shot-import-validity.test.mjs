import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// All fixtures are synthetic local history. No provider/Auth/member writes.
const ratings={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
const make=()=>{const s=hydrate(rawFixture());activeVersion(s).advanced.temperature=true;return s;};
const archive=(id,extra={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
 doseG:20,yieldG:50,timeS:22,grindSetting:1.2,tempC:91,
 timestamp:'2026-11-06T12:00:00Z',dialedIn:false,
 tasteScales:{...ratings},notes:'Keep original private notes',
 suggestion:{title:'Next shot',text:'Original cached advice',
  next:{grindSetting:1.4,yieldCenter:52}},
 ...extra
});
const guide=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});

test('R093 physically impossible imported dose/yield/time never overrides a fresh recipe',()=>{
 for(const bad of [{doseG:4},{doseG:41},{doseG:null},{doseG:'20'},
  {yieldG:4},{yieldG:201},{yieldG:Infinity},{yieldG:'50'},
  {timeS:0},{timeS:181},{timeS:NaN},{timeS:'22'}]){
  const s=make();s.shots.push(archive('invalid',bad));const original=structuredClone(s),r=guide(s);
  assert.equal(r.source,'Starting recommendation',JSON.stringify(bad));
  assert.equal(r.doseG,18,'Never prefill invalid actual dose into recommended card');
  assert.notEqual(r.yield.center,52,'Ignore stale cached next-shot numbers');
  assert.deepEqual(s,original,'Preserve all original history, notes and cached suggestions');
 }
});

test('R093 out-of-current-espresso-range or malformed imported grind never drives adjustment',()=>{
 for(const grindSetting of [-1,.5-1,5.1,NaN,Infinity,'1.2',null]){
  const s=make();s.shots.push(archive('invalid',{grindSetting}));
  assert.equal(guide(s).source,'Starting recommendation',String(grindSetting));
 }
});

test('R093 invalid recorded temperature cannot silently transfer to next recipe',()=>{
 for(const tempC of [-10,0,101,Infinity,NaN,'91']){
  const s=make();s.shots.push(archive('invalid',{tempC}));
  const original=structuredClone(s),r=guide(s);
  assert.equal(r.source,'Starting recommendation',String(tempC));
  assert.equal(r.tempC,95);
  assert.deepEqual(s,original);
 }
});

test('R093 still accepts both inclusive grinder and temperature endpoints',()=>{
 for(const [grindSetting,tempC] of [[0,70],[5,100]]){
  const s=make();s.shots.push(archive('valid',{grindSetting,tempC,
   suggestion:{title:'Next shot',next:{grindSetting,yieldCenter:52}}}));
  const r=guide(s);
  assert.equal(r.source,'Adjustment from your latest taste rating');
  assert.equal(r.doseG,20);
  assert.equal(r.tempC,tempC);
  assert.equal(r.yield.center,52);
  assert.equal(r.grind.value,grindSetting);
 }
});

test('R093 legitimate latest partially rated shot still keeps one adjustment and actual controls',()=>{
 const s=make();s.shots.push(archive('valid'));
 const before=structuredClone(s),r=guide(s);
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.doseG,20);assert.equal(r.yield.center,52);
 assert.equal(r.grind.value,1.4);assert.equal(r.tempC,91);
 assert.deepEqual(s,before);
});

test('R093 corrupt most recent imported shot yields to an older valid measured shot',()=>{
 const s=make();
 s.shots.push(archive('older',{timestamp:'2026-11-05T12:00:00Z'}),
  archive('newer-corrupt',{timestamp:'2026-11-06T12:00:00Z',
   yieldG:230,notes:'Keep invalid original',suggestion:{title:'Corrupt cached advice',
    next:{grindSetting:0,yieldCenter:190}}}));
 const before=structuredClone(s),r=guide(s);
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.grind.value,1.4);assert.equal(r.yield.center,52);
 assert.equal(r.doseG,20);
 assert.deepEqual(s,before);
});

test('R093 valid older shot remains untouched when latest invalid carries no ratings',()=>{
 const s=make();s.shots.push(archive('valid',{timestamp:'2026-11-05T12:00:00Z'}),
  archive('unrated-corrupt',{timestamp:'2026-11-06T12:00:00Z',
   doseG:0,tasteScales:{...ratings,clarity:null},suggestion:null}));
 const before=structuredClone(s),r=guide(s);
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,52);
 assert.deepEqual(s,before);
});

test('R093 all-green success still supersedes next-shot adjustment display',()=>{
 const s=make();const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
 s.shots.push(archive('successful',{dialedIn:true,tasteScales:green}));
 assert.notEqual(guide(s).source,'Adjustment from your latest taste rating');
});
