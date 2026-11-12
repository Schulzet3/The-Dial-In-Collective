import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {nextAdvice} from '../site/lib/engine.js';

// R179 synthetic archived source-level integrity tests, NOT member observations.
const rec={time:{low:12,center:16,high:20}};
const taste={extraction:3,body:3,clarity:5,sweetness:4,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const common={coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',doseG:18,timeS:16,
  grindSetting:1.2,tempC:93,hidden:false,notes:'Original private tasting note'};
 const current={...common,id:'current',timestamp:'2026-11-10T12:00:00Z',
  yieldG:36,tasteScales:{...taste}};
 const previous=(id,yieldG=31,extra={})=>({...common,id,yieldG,
  timestamp:'2026-11-09T12:00:00Z',tasteScales:{...taste,sweetness:5},...extra});
 return {s,current,previous,advice:()=>nextAdvice(s,current,rec)};
}
test('R179 impossible original grinder snapshot cannot claim observed sweetness direction',()=>{
 const f=fixture();
 f.s.shots=[f.previous('bad',31,{snapshot:{grinderMin:2,grinderMax:5}})];
 const before=structuredClone(f.s),cur=structuredClone(f.current);
 const a=f.advice();
 assert.equal(a.title,'Explore a longer yield');
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Exploratory starting step/);
 assert.deepEqual(f.s,before);
 assert.deepEqual(f.current,cur);
});
test('R179 inclusive original calibration endpoint remains comparable',()=>{
 const f=fixture();
 f.s.shots=[f.previous('valid',31,{snapshot:{grinderMin:1.2,grinderMax:5}})];
 const before=structuredClone(f.s),a=f.advice();
 assert.equal(a.title,'Explore a shorter yield');
 assert.equal(a.next.yieldCenter,31);
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
 assert.deepEqual(f.s,before);
});
test('R179 inverted original grinder range cannot manufacture a sweetness signal',()=>{
 const f=fixture();
 f.s.shots=[f.previous('bad',31,{snapshot:{grinderMin:5,grinderMax:2}})];
 const a=f.advice();
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Exploratory starting step/);
});
test('R179 missing optional legacy snapshot preserves comparable measured history',()=>{
 const f=fixture();
 f.s.shots=[f.previous('legacy',31,{snapshot:null})];
 const a=f.advice();
 assert.equal(a.title,'Explore a shorter yield');
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
});
test('R179 impossible archived opposing yield cannot create false conflict',()=>{
 const f=fixture();
 f.s.shots=[
  f.previous('genuine',31,{snapshot:{grinderMin:1,grinderMax:5}}),
  f.previous('impossible',43,{snapshot:{grinderMin:2,grinderMax:5}})
 ];
 const before=structuredClone(f.s),a=f.advice();
 assert.equal(a.title,'Explore a shorter yield');
 assert.equal(a.next.yieldCenter,31);
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
 assert.deepEqual(f.s,before);
});
