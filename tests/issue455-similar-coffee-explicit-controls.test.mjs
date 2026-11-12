import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket} from '../site/lib/model.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';

// R455-166: synthetic archived measurements only; no member/provider I/O.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),target=s.coffees.find(c=>c.id==='coffee');
 target.roastLevel='Light';
 s.coffees.push({...structuredClone(target),id:'other-coffee',name:'Other light coffee'});
 const basket=selectedBasket(s,target.id);
 const shot=(id,patch={})=>({
  id,coffeeId:'other-coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Turbo',feedMode:'standard',hidden:false,
  dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:16,
  grindSetting:(v.grinderMin+v.grinderMax)/2,tempC:93,
  timestamp:'2026-11-09T10:00:00Z',notes:'Private archival note unchanged',...patch
 });
 const reference=()=>personalSimilarCoffeeReference(s,target,v,'Turbo','standard',basket.id);
 const rec=()=>recommendation(s,target.id,{style:'Turbo',basketId:basket.id,feedMode:'standard',ignoreAdvice:true});
 return {s,v,shot,reference,rec};
}
test('R166 invalid explicit grinder never seeds other-coffee ratio or time',()=>{
 const {v}=fixture();
 for(const grindSetting of [-.1,v.grinderMax+.1,NaN,Infinity,-Infinity,'2',{},true]){
  const {s,shot,reference,rec}=fixture();s.shots.push(shot('bad',{grindSetting}));
  const before=structuredClone(s);
  assert.equal(reference(),null,String(grindSetting));
  assert.equal(rec().source,'Starting recommendation',String(grindSetting));
  assert.deepEqual(s,before);
 }
});
test('R166 invalid explicit temperature never seeds other-coffee prior',()=>{
 for(const tempC of [69.9,100.1,NaN,Infinity,-Infinity,'92',{},false]){
  const {s,shot,reference,rec}=fixture();s.shots.push(shot('bad',{tempC}));
  const before=structuredClone(s);
  assert.equal(reference(),null,String(tempC));
  assert.equal(rec().source,'Starting recommendation',String(tempC));
  assert.deepEqual(s,before);
 }
});
test('R166 a corrupted competing donor cannot skew one valid donor',()=>{
 const {s,v,shot,reference,rec}=fixture();
 s.shots.push(shot('good'),shot('bad-grind',{grindSetting:v.grinderMax+1,yieldG:180,timeS:179}),
  shot('bad-temp',{tempC:120,yieldG:120,timeS:130}));
 const before=structuredClone(s),r=reference();
 assert.equal(r.count,1);assert.equal(r.ratio,2);assert.equal(r.time,16);
 assert.equal(rec().source,'Your successful similar coffees on this setup');
 assert.equal(rec().observations,1);
 assert.deepEqual(s,before,'original measurements, notes and ratings unchanged');
});
test('R166 missing optional legacy controls remain compatible',()=>{
 for(const patch of [{grindSetting:null,tempC:null},{grindSetting:undefined,tempC:undefined}]){
  const {s,shot,reference,rec}=fixture();s.shots.push(shot('legacy',patch));
  const before=structuredClone(s);
  assert.equal(reference()?.count,1);
  assert.equal(reference()?.ratio,2);assert.equal(reference()?.time,16);
  assert.equal(rec().source,'Your successful similar coffees on this setup');
  assert.deepEqual(s,before);
 }
});
test('R166 inclusive setup grinder and recorded temperature bounds remain valid',()=>{
 const {s,v,shot,reference}=fixture();
 s.shots.push(shot('low',{grindSetting:v.grinderMin,tempC:70}),
  shot('high',{grindSetting:v.grinderMax,tempC:100}));
 const before=structuredClone(s);
 assert.equal(reference()?.count,2);assert.equal(reference()?.ratio,2);
 assert.equal(reference()?.time,16);assert.deepEqual(s,before);
});
test('R166 existing five-rating, style, feed, hidden and measured limits remain',()=>{
 for(const patch of [{style:'Traditional'},{feedMode:'slow'},{hidden:true},
  {tasteScales:{...green,sweetness:4}},{doseG:4},{yieldG:201},{timeS:181}]){
  const {s,shot,reference}=fixture();s.shots.push(shot('other',patch));
  assert.equal(reference(),null,JSON.stringify(patch));
 }
});
