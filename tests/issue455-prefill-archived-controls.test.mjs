import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {prefill} from '../site/lib/engine.js';

// #455 R167: entirely synthetic archived shots, no member/provider I/O.
function setup(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 v.advanced.temperature=true;
 const row=(id,patch={})=>({
  id,coffeeId:'coffee',setupVersionId:v.id,basketId:'basketv',
  calibrationId:v.calibrationId,style:'Turbo',feedMode:'standard',
  timestamp:'2026-11-08T10:00:00Z',hidden:false,
  doseG:18,yieldG:36,timeS:18,grindSetting:2,tempC:93,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  dialedIn:true,notes:'Private history is unchanged',...patch
 });
 const read=()=>prefill(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 return {s,v,row,read};
}

test('R167 newer archived invalid grinder cannot seed dose, grind or temperature prefills',()=>{
 for(const grinder of [-1,5.1,NaN,Infinity,'2',{},true]){
  const {s,row,read}=setup();
  s.shots=[row('prior'),row('bad',{timestamp:'2026-11-09T10:00:00Z',doseG:27,grindSetting:grinder,tempC:98})];
  const before=structuredClone(s.shots),p=read();
  assert.equal(p.doseG,18,String(grinder));assert.equal(p.grindSetting,2);
  assert.equal(p.tempC,93);assert.deepEqual(s.shots,before);
 }
});

test('R167 invalid recorded temperatures cannot provide a newer grind or dose',()=>{
 for(const tempC of [69.9,100.1,NaN,Infinity,'92',{},false]){
  const {s,row,read}=setup();
  s.shots=[row('prior'),row('bad',{timestamp:'2026-11-09T10:00:00Z',doseG:27,grindSetting:4,tempC})];
  const before=structuredClone(s.shots),p=read();
  assert.equal(p.doseG,18,String(tempC));assert.equal(p.grindSetting,2);
  assert.equal(p.tempC,93);assert.deepEqual(s.shots,before);
 }
});

test('R167 inclusive valid endpoints and original private history remain eligible',()=>{
 const {s,v,row,read}=setup();
 s.shots=[row('prior'),row('boundary',{timestamp:'2026-11-09T10:00:00Z',
  doseG:20,grindSetting:v.grinderMax,tempC:100})];
 const before=structuredClone(s.shots),p=read();
 assert.equal(p.doseG,20);assert.equal(p.grindSetting,v.grinderMax);
 assert.equal(p.tempC,100);assert.deepEqual(s.shots,before);
});

test('R167 missing legacy optional readings retain dose without inventing controls',()=>{
 const {s,row,read}=setup();
 s.shots=[row('legacy',{doseG:19,grindSetting:null,tempC:null})];
 const before=structuredClone(s.shots),p=read();
 assert.equal(p.doseG,19);assert.equal(p.grindSetting,'');assert.equal(p.tempC,null);
 assert.deepEqual(s.shots,before);
});

test('R167 snapshot historical range validates dose without translating current grind',()=>{
 const {s,row,read}=setup();
 s.shots=[row('prior'),row('old-range',{timestamp:'2026-11-09T10:00:00Z',
  doseG:21,grindSetting:6,tempC:94,snapshot:{grinderMin:0,grinderMax:10}})];
 const before=structuredClone(s.shots),p=read();
 assert.equal(p.doseG,21,'historical valid dose remains usable');
 assert.equal(p.grindSetting,2,'out-of-current-range grind cannot prefill');
 assert.equal(p.tempC,94);assert.deepEqual(s.shots,before);
});
