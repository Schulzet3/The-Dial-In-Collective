import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket} from '../site/lib/model.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';

// R455-087: synthetic imported personal history only, never real member data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),target=s.coffees.find(c=>c.id==='coffee');
 target.roastLevel='Light';
 s.coffees.push({...structuredClone(target),id:'other-coffee',name:'Another light coffee'});
 const basket=selectedBasket(s,'coffee');
 const shot=(id,patch={})=>({
  id,coffeeId:'other-coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Turbo',feedMode:'standard',
  doseG:18,yieldG:36,timeS:16,grindSetting:1.2,tempC:93,
  timestamp:'2026-11-06T10:00:00Z',notes:'Preserve imported private note',
  hidden:false,dialedIn:true,tasteScales:{...green},...patch
 });
 const reference=()=>personalSimilarCoffeeReference(s,target,v,'Turbo','standard',basket.id);
 const rec=()=>recommendation(s,'coffee',{style:'Turbo',basketId:basket.id,feedMode:'standard',ignoreAdvice:true});
 return {s,shot,reference,rec};
}
test('R087 valid measured five-green other-coffee shot remains weak same-style prior',()=>{
 const {s,shot,reference,rec}=fixture();s.shots.push(shot('valid'));
 const before=structuredClone(s);
 assert.equal(reference()?.ratio,2);
 assert.equal(reference()?.time,16);
 assert.equal(reference()?.count,1);
 assert.equal(rec().source,'Your successful similar coffees on this setup');
 assert.deepEqual(s,before);
});
test('R087 out-of-entry-bounds archived dose is not a comparable measured prior',()=>{
 for(const doseG of [0,4.9,40.1,Infinity,NaN,'18',null]){
  const {s,shot,reference,rec}=fixture();s.shots.push(shot('invalid',{doseG}));
  assert.equal(reference(),null,String(doseG));
  assert.equal(rec().source,'Starting recommendation',String(doseG));
 }
});
test('R087 out-of-entry-bounds archived yield is not a comparable measured prior',()=>{
 for(const yieldG of [0,4.9,200.1,Infinity,NaN,'36',null]){
  const {s,shot,reference}=fixture();s.shots.push(shot('invalid',{yieldG}));
  assert.equal(reference(),null,String(yieldG));
 }
});
test('R087 missing and impossible archived timing is excluded from time prior',()=>{
 for(const timeS of [0,.9,180.1,Infinity,NaN,'16',null]){
  const {s,shot,reference}=fixture();s.shots.push(shot('invalid',{timeS}));
  assert.equal(reference(),null,String(timeS));
 }
});
test('R087 malformed competing import does not skew a valid similar coffee',()=>{
 const {s,shot,reference,rec}=fixture();
 s.shots.push(shot('valid'),shot('invalid',{doseG:2,yieldG:6,timeS:181}));
 const original=structuredClone(s);
 assert.equal(reference()?.count,1);
 assert.equal(reference()?.ratio,2);
 assert.equal(reference()?.time,16);
 assert.equal(rec().observations,1);
 assert.deepEqual(s,original,'private readings, original notes and five taste ratings retained');
});
test('R087 existing inclusive Log Shot boundaries stay eligible without new numeric science',()=>{
 const {s,shot,reference}=fixture();
 s.shots.push(shot('min',{doseG:5,yieldG:5,timeS:1}),shot('max',{doseG:40,yieldG:200,timeS:180}));
 assert.equal(reference()?.count,2);
 assert.equal(reference()?.ratio,3);
 assert.equal(reference()?.time,90.5);
});
test('R087 unrated, hidden, mismatched style and feed never enter prior',()=>{
 for(const patch of [{hidden:true},{dialedIn:false},
  {tasteScales:{...green,sweetness:4}},{style:'Traditional'},{feedMode:'slow'}]){
  const {s,shot,reference}=fixture();s.shots.push(shot('not-comparable',patch));
  assert.equal(reference(),null,JSON.stringify(patch));
 }
});
