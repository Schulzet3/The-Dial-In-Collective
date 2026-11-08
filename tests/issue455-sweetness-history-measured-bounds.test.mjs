import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {nextAdvice} from '../site/lib/engine.js';

// Synthetic imported same-coffee archive. No actual member records.
const rec={time:{low:12,center:16,high:20}};
const taste={extraction:3,body:3,clarity:5,sweetness:4,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const common={coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',doseG:18,timeS:16,
  grindSetting:1.2,tempC:93,hidden:false,notes:'Unchanged private note'};
 const current={...common,id:'current',timestamp:'2026-11-06T12:00:00Z',
  yieldG:36,tasteScales:{...taste}};
 const prior=(id,yieldG=43,timeS=16)=>({...common,id,yieldG,timeS,
  timestamp:'2026-11-05T12:00:00Z',tasteScales:{...taste,sweetness:5}});
 return {s,current,prior};
}
function advice(s,current){return nextAdvice(s,current,rec);}
test('R085 valid measured comparable same-coffee yield still informs one-control advice',()=>{
 const {s,current,prior}=fixture();s.shots=[prior('valid')];
 const before=structuredClone(s.shots),a=advice(s,current);
 assert.equal(a.title,'Explore a longer yield');
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
 assert.deepEqual(s.shots,before);
});
test('R085 archived yield beyond existing upper logging bound is not measured sweetness evidence',()=>{
 const {s,current,prior}=fixture();s.shots=[prior('invalid',230)];
 const before=structuredClone(s.shots),a=advice(s,current);
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Exploratory starting step/);
 assert.doesNotMatch(a.evidenceNote,/Earlier comparable/);
 assert.deepEqual(s.shots,before);
});
test('R085 below-minimum archived yield cannot manufacture contradictory directions',()=>{
 const {s,current,prior}=fixture();s.shots=[prior('valid',43),prior('invalid',2)];
 const before=structuredClone(s.shots),a=advice(s,current);
 assert.equal(a.title,'Explore a longer yield');
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
 assert.deepEqual(s.shots,before);
});
test('R085 historical times outside shot logging bounds cannot support a sweetness signal',()=>{
 const {s,current,prior}=fixture();
 for(const timeS of [0,181]){
  s.shots=[prior('invalid',43,timeS)];
  const before=structuredClone(s.shots),a=advice(s,current);
  assert.equal(a.next.yieldCenter,41);
  assert.match(a.evidenceNote,/Exploratory starting step/);
  assert.deepEqual(s.shots,before);
 }
});
test('R085 inclusive physical time and yield endpoints remain eligible',()=>{
 const {s,current,prior}=fixture();
 for(const timeS of [1,180]){
  s.shots=[prior('valid',43,timeS)];
  assert.match(advice(s,current).evidenceNote,/Earlier comparable/);
 }
 s.shots=[prior('valid-minimum-yield',5)];
 assert.equal(advice(s,current).title,'Explore a shorter yield');
 assert.equal(advice(s,current).next.yieldCenter,31);
});
test('R085 missing and nonnumeric imported time do not become measured evidence',()=>{
 const {s,current,prior}=fixture();
 for(const timeS of [null,'garbled',Number.POSITIVE_INFINITY]){
  s.shots=[prior('invalid',43,timeS)];
  assert.match(advice(s,current).evidenceNote,/Exploratory starting step/);
 }
});
