import test from 'node:test';
import assert from 'node:assert/strict';
import {prefill} from '../site/lib/engine.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';

// Synthetic local-only records; never touch hosted members or providers.
const fixture=()=>{
 const s=hydrate(rawFixture()),c=s.coffees[0],v=activeVersion(s);
 v.advanced.temperature=true;
 const basket=v.baskets[0];
 return {s,c,v,basket};
};
const shot=(c,v,basket,id,time,tempC,rest={})=>({
 id,coffeeId:c.id,setupVersionId:v.id,basketId:basket.id,style:'Turbo',
 feedMode:'standard',calibrationId:v.calibrationId,timestamp:time,
 doseG:18,yieldG:36,timeS:22,grindSetting:2,tempC,
 hidden:false,dialedIn:false,tasteScales:{
 extraction:2,body:3,clarity:3,sweetness:3,astringency:3
 },notes:'Preserve the original historical note',...rest
});

test('#455 R098 newer unloggable historical row cannot override actual measured temperature',()=>{
 const {s,c,v,basket}=fixture();
 s.shots=[
  shot(c,v,basket,'valid','2026-11-05T12:00:00Z',93),
  shot(c,v,basket,'bad','2026-11-06T12:00:00Z',70,{yieldG:230})
 ];
 const original=structuredClone(s.shots);
 const p=prefill(s,c.id,{style:'Turbo',basketId:basket.id});
 assert.equal(p.tempC,93);
 assert.equal(p.tempSource,'');
 assert.equal(p.yieldG,'');
 assert.equal(p.timeS,'');
 assert.deepEqual(s.shots,original,'private histories, notes and ratings unchanged');
});

test('#455 R098 invalid archived dose, yield, or time never provides temperature',()=>{
 for(const [key,value] of [
  ['doseG',41],['doseG',null],['yieldG',201],['yieldG',null],
  ['timeS',181],['timeS',null]
 ]){
  const {s,c,v,basket}=fixture();
  s.shots=[shot(c,v,basket,'invalid','2026-11-06T12:00:00Z',94,{[key]:value})];
  const p=prefill(s,c.id,{style:'Turbo',basketId:basket.id});
  assert.equal(p.tempC,null,`${key}=${value} cannot provide actual measured temperature`);
  assert.equal(p.tempSource,'');
 }
});

test('#455 R098 exact actual measured same-style temperature wins over other style',()=>{
 const {s,c,v,basket}=fixture();
 s.shots=[
  shot(c,v,basket,'older-turbo','2026-11-04T12:00:00Z',91),
  shot(c,v,basket,'recent-traditional','2026-11-06T12:00:00Z',96,{style:'Traditional'})
 ];
 assert.equal(prefill(s,c.id,{style:'Turbo',basketId:basket.id}).tempC,91);
});

test('#455 R098 measured other-style fallback remains labeled when exact style absent',()=>{
 const {s,c,v,basket}=fixture();
 s.shots=[
  shot(c,v,basket,'old','2026-11-04T12:00:00Z',92,{style:'Traditional'}),
  shot(c,v,basket,'bad','2026-11-06T12:00:00Z',90,{style:'Turbo',timeS:200})
 ];
 const p=prefill(s,c.id,{style:'Turbo',basketId:basket.id});
 assert.equal(p.tempC,92);
 assert.equal(p.tempSource,'Last used on Traditional');
});

test('#455 R098 existing inclusive physical endpoints and temperatures remain usable',()=>{
 for(const [doseG,yieldG,timeS,tempC] of [[5,5,1,70],[40,200,180,100]]){
  const {s,c,v,basket}=fixture();
  s.shots=[shot(c,v,basket,'edge','2026-11-06T12:00:00Z',tempC,{doseG,yieldG,timeS})];
  assert.equal(prefill(s,c.id,{style:'Turbo',basketId:basket.id}).tempC,tempC);
 }
});

test('#455 R098 optional tracking-off and invalid temperature keep prior empty behavior',()=>{
 const {s,c,v,basket}=fixture();
 s.shots=[shot(c,v,basket,'shot','2026-11-06T12:00:00Z',105)];
 assert.equal(prefill(s,c.id,{style:'Turbo',basketId:basket.id}).tempC,null);
 s.shots=[shot(c,v,basket,'shot','2026-11-06T12:00:00Z',94)];
 v.advanced.temperature=false;
 assert.equal(prefill(s,c.id,{style:'Turbo',basketId:basket.id}).tempC,null);
});
