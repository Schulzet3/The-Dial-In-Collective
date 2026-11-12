import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket} from '../site/lib/model.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';

// Synthetic archived grinder-calibration fixtures only; no real member or provider I/O.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),target=s.coffees.find(c=>c.id==='coffee');
 target.roastLevel='Light';
 s.shots=[];
 s.coffees.push({...structuredClone(target),id:'other-coffee',name:'Other light coffee'});
 const basket=selectedBasket(s,target.id);
 const donor=(id,patch={})=>({
  id,coffeeId:'other-coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:basket.id,style:'Turbo',feedMode:'standard',hidden:false,
  dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:16,
  grindSetting:9,snapshot:{grinderMin:8,grinderMax:10},tempC:93,
  timestamp:'2026-11-01T12:00:00Z',notes:'Original private archival note',
  ...patch
 });
 const reference=()=>personalSimilarCoffeeReference(s,target,v,'Turbo','standard',basket.id);
 const rec=()=>recommendation(s,target.id,{style:'Turbo',basketId:basket.id,feedMode:'standard',ignoreAdvice:true});
 return {s,v,basket,target,donor,reference,rec};
}
test('R200 original-valid archived dial outside active range still seeds cautious similar-coffee reference',()=>{
 const f=fixture();
 assert.equal(f.v.grinderMax,5,'fixture must distinguish current and original dial ranges');
 f.s.shots.push(f.donor('old'));
 const before=structuredClone(f.s),r=f.reference(),rec=f.rec();
 assert.equal(r?.count,1);assert.equal(r?.ratio,2);assert.equal(r?.time,16);
 assert.equal(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.observations,1);
 assert.deepEqual(f.s,before,'archive including private notes stays untouched');
});
test('R200 historical original-range boundaries are inclusive, not current-range boundaries',()=>{
 for(const dial of [8,10]){
  const f=fixture();f.s.shots.push(f.donor('edge',{grindSetting:dial}));
  assert.equal(f.reference()?.count,1,String(dial));
 }
 for(const dial of [7.99,10.01]){
  const f=fixture();f.s.shots.push(f.donor('out',{grindSetting:dial}));
  assert.equal(f.reference(),null,String(dial));
 }
});
test('R200 malformed or impossible original snapshots cannot become evidence',()=>{
 for(const patch of [
  {grindSetting:11},
  {grindSetting:2},
  {snapshot:{grinderMin:10,grinderMax:8}},
  {grindSetting:-1},
  {grindSetting:NaN},
  {grindSetting:Infinity}
 ]){
  const f=fixture();f.s.shots.push(f.donor('bad',patch));
  const before=structuredClone(f.s);
  assert.equal(f.reference(),null,JSON.stringify(patch));
  assert.equal(f.rec().source,'Starting recommendation',JSON.stringify(patch));
  assert.deepEqual(f.s,before);
 }
});
test('R200 invalid donor must not skew a valid archived other-coffee donor',()=>{
 const f=fixture();
 f.s.shots.push(f.donor('valid'),f.donor('invalid',{grindSetting:11,yieldG:108,timeS:90}));
 const before=structuredClone(f.s),r=f.reference();
 assert.equal(r?.count,1);assert.equal(r?.ratio,2);assert.equal(r?.time,16);
 assert.deepEqual(f.s,before);
});
test('R200 incomplete five-taste ratings and unrelated style/feed/setup do not seed donor',()=>{
 const changes=[
  {tasteScales:{...green,sweetness:null}},
  {dialedIn:false},{hidden:true},
  {style:'Traditional'},{feedMode:'slow'},{setupVersionId:'other-version'},
  {doseG:4},{yieldG:201},{timeS:181},{tempC:120}
 ];
 for(const patch of changes){
  const f=fixture();f.s.shots.push(f.donor('unusable',patch));
  assert.equal(f.reference(),null,JSON.stringify(patch));
 }
});
test('R200 old optional missing controls remain allowable without inventing dial readings',()=>{
 for(const patch of [{grindSetting:null,snapshot:null,tempC:null},
                     {grindSetting:undefined,snapshot:undefined,tempC:undefined}]){
  const f=fixture();f.s.shots.push(f.donor('legacy',patch));
  const before=structuredClone(f.s);
  assert.equal(f.reference()?.count,1);
  assert.equal(f.reference()?.ratio,2);
  assert.deepEqual(f.s,before);
 }
});
test('R200 historical other-coffee reference is a starting hint, never transferred grind or proven family',()=>{
 const f=fixture();f.s.shots.push(f.donor('archived'));
 const rec=f.rec();
 assert.equal(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.established,false);
 assert.equal(rec.familyId,null);
 assert.equal(Object.hasOwn(rec,'grindSetting'),false);
 assert.notEqual(rec.source,'Your dialed in window');
});
