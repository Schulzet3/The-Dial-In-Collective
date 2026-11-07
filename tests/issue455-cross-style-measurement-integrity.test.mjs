import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';

// Synthetic private local archived shots only. No Auth, SQL, user or provider reads.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const setup=()=>hydrate(rawFixture());
const shot=(id,extra={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',
 dialedIn:true,hidden:false,tasteScales:{...green},
 doseG:18,yieldG:54,timeS:16,grindSetting:2.5,
 notes:'Preserved original private notes',...extra
});
const rec=s=>recommendation(s,'coffee',{style:'Traditional',
 basketId:'basketv',feedMode:'standard',ignoreAdvice:true});

test('#455 R081 malformed archived Turbo measurements cannot bias Traditional starting ratio',()=>{
 const bad=[
  {doseG:0},{doseG:-18},{doseG:'18'},
  {doseG:Number.MIN_VALUE,yieldG:54},{doseG:Infinity},
  {yieldG:0},{yieldG:-54},{yieldG:'54'},
  {yieldG:Infinity},{yieldG:NaN},
  {timeS:0},{timeS:-1},{timeS:'16'},{timeS:NaN}
 ];
 for(let i=0;i<bad.length;i++){
  const s=setup(),base=rec(s).ratio;
  s.shots.push(shot('bad-'+i,bad[i]));
  const original=structuredClone(s.shots),now=rec(s);
  assert.deepEqual(now.ratio,base,'malformed cross-style donor '+JSON.stringify(bad[i]));
  assert.equal(now.style,'Traditional');
  assert.deepEqual(s.shots,original,'history, ratings and notes preserved');
 }
});

test('#455 R081 a valid five-green Turbo measured ratio still gives its existing weak Traditional prior',()=>{
 const s=setup(),base=rec(s).ratio;
 s.shots.push(shot('valid',{yieldG:45}));
 const before=structuredClone(s.shots),actual=rec(s);
 assert.notDeepEqual(actual.ratio,base,'legitimate weak ratio-only transfer remains');
 assert.ok(Number.isFinite(actual.ratio.center));
 assert.match(actual.reasons.join(' '),/other styles/i);
 assert.deepEqual(s.shots,before);
});

test('#455 R081 malformed archived rows cannot poison an otherwise valid cross-style prior',()=>{
 const s=setup();
 s.shots.push(shot('good'));
 const valid=rec(s).ratio;
 s.shots.push(shot('bad-overflow',{doseG:Number.MIN_VALUE}),
  shot('bad-typed',{yieldG:'100'}),
  shot('bad-zero',{yieldG:0}),
  shot('bad-time',{timeS:0}));
 const before=structuredClone(s.shots),after=rec(s);
 assert.deepEqual(after.ratio,valid,'only actual measured positive finite ratio contributes');
 assert.deepEqual(s.shots,before);
});

test('#455 R081 missing or nonideal taste ratings are not eligible cross-style evidence',()=>{
 const s=setup(),base=rec(s).ratio;
 s.shots.push(shot('missing',{tasteScales:{...green,clarity:null}}),
  shot('not-green',{tasteScales:{...green,sweetness:4}}),
  shot('false-success',{dialedIn:false}));
 const before=structuredClone(s.shots);
 assert.deepEqual(rec(s).ratio,base);
 assert.deepEqual(s.shots,before);
});

test('#455 R081 Fast-Flow keeps its independent style and no generic cross-style transfer',()=>{
 const s=setup(),base=rec(s).ratio;
 s.shots.push(shot('fast-flow-success',{style:'Fast-Flow',yieldG:54}));
 assert.deepEqual(rec(s).ratio,base,'Fast-Flow must not seed generic other-style residual');
 const fast=recommendation(s,'coffee',{style:'Fast-Flow',basketId:'basketv',
  feedMode:'standard',ignoreAdvice:true});
 assert.equal(fast.style,'Fast-Flow');
});
