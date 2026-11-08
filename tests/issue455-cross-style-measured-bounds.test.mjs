import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';

// R455-088: synthetic imported shots only, never actual member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const fixture=()=>{
 const s=hydrate(rawFixture());
 const shot=(id,change={})=>({
  id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
  basketId:'basketv',style:'Turbo',feedMode:'standard',
  hidden:false,dialedIn:true,tasteScales:{...green},
  doseG:18,yieldG:40,timeS:13,grindSetting:2,tempC:93,
  timestamp:'2026-11-07T08:00:00Z',notes:'Preserve original private note',
  familyId:null,...change
 });
 const rec=(style='Fast-Flow')=>recommendation(s,'coffee',{
  style,basketId:'basketv',feedMode:'standard',ignoreAdvice:true
 });
 return {s,shot,rec};
};
test('R088 out-of-bounds historical Turbo dose cannot seed Fast-Flow estimate',()=>{
 for(const data of [
  {doseG:2,yieldG:5},{doseG:4.9,yieldG:10},
  {doseG:41,yieldG:110},{doseG:60,yieldG:150}
 ]){
  const {s,shot,rec}=fixture(),baseline=rec();
  s.shots.push(shot('bad',data));const history=structuredClone(s);
  const actual=rec();
  assert.equal(actual.turboFallback,undefined,JSON.stringify(data));
  assert.deepEqual(actual.ratio,baseline.ratio);
  assert.deepEqual(actual.time,baseline.time);
  assert.deepEqual(s,history);
 }
});
test('R088 valid Turbo affects only the unproven Fast-Flow ratio',()=>{
 const {s,shot,rec}=fixture(),before=rec();
 s.shots.push(shot('valid'));const history=structuredClone(s),actual=rec();
 assert.equal(actual.turboFallback?.ratioOnly,true);
 assert.equal(actual.turboFallback?.compatibleShots,1);
 assert.notEqual(actual.ratio.center,before.ratio.center);
 assert.deepEqual(actual.time,before.time);
 assert.equal(actual.grind.value,before.grind.value);
 assert.equal(actual.established,false);
 assert.equal(actual.observations,0);
 assert.deepEqual(s,history);
});
test('R088 invalid Turbo samples do not skew valid sampled Turbo',()=>{
 const {s,shot,rec}=fixture();
 s.shots.push(shot('valid'));const expected=rec();
 s.shots.push(shot('small',{doseG:2,yieldG:5}),
  shot('large',{doseG:41,yieldG:110}));
 assert.deepEqual(rec().ratio,expected.ratio);
 assert.equal(rec().turboFallback?.compatibleShots,1);
});
test('R088 valid inclusive dose endpoints remain legitimate Turbo donor measurements',()=>{
 const {s,shot,rec}=fixture();
 s.shots.push(shot('small',{doseG:5,yieldG:10,timeS:8}),
  shot('large',{doseG:40,yieldG:80,timeS:20}));
 assert.equal(rec().turboFallback?.compatibleShots,2);
});
test('R088 generic cross-style path excludes physically out-of-bounds imports',()=>{
 for(const data of [
  {doseG:2,yieldG:6},{doseG:41,yieldG:123},
  {doseG:18,yieldG:201},{doseG:18,yieldG:54,timeS:181}
 ]){
  const {s,shot,rec}=fixture(),baseline=rec('Traditional');
  s.shots.push(shot('bad',data));const history=structuredClone(s),actual=rec('Traditional');
  assert.deepEqual(actual.ratio,baseline.ratio,JSON.stringify(data));
  assert.doesNotMatch(actual.reasons.join(' '),/other styles/);
  assert.deepEqual(s,history);
 }
});
test('R088 valid legacy-style donor stays weak; invalid competitors cannot affect ratio',()=>{
 const {s,shot,rec}=fixture(),baseline=rec('Traditional');
 s.shots.push(shot('valid',{yieldG:45}));
 const expected=rec('Traditional');
 assert.notDeepEqual(expected.ratio,baseline.ratio);
 assert.match(expected.reasons.join(' '),/other styles/);
 s.shots.push(shot('bad-dose',{doseG:2,yieldG:6}),
  shot('bad-yield',{doseG:18,yieldG:201}),
  shot('bad-time',{doseG:18,yieldG:54,timeS:181}));
 const history=structuredClone(s);
 assert.deepEqual(rec('Traditional').ratio,expected.ratio);
 assert.deepEqual(s,history);
});
test('R088 invalid exact-coffee other-style import does not suppress valid similar prior',()=>{
 const {s,shot,rec}=fixture(),coffee=s.coffees[0];
 s.coffees.push({...structuredClone(coffee),id:'similar-coffee',name:'Other light coffee'});
 s.shots.push(shot('same-style',{coffeeId:'similar-coffee',style:'Turbo',yieldG:39}),
  shot('bad-cross',{style:'Traditional',doseG:2,yieldG:6,timeS:181}));
 const history=structuredClone(s),actual=rec('Turbo');
 assert.equal(actual.source,'Your successful similar coffees on this setup');
 assert.equal(actual.observations,1);
 assert.deepEqual(s,history);
});
test('R088 valid cross-style success keeps previously approved higher-priority gate',()=>{
 const {s,shot,rec}=fixture(),coffee=s.coffees[0];
 s.coffees.push({...structuredClone(coffee),id:'similar-coffee',name:'Other light coffee'});
 s.shots.push(shot('same-style',{coffeeId:'similar-coffee',style:'Turbo',yieldG:39}),
  shot('valid-cross',{style:'Traditional',yieldG:45}));
 const actual=rec('Turbo');
 assert.notEqual(actual.source,'Your successful similar coffees on this setup');
 assert.equal(actual.observations,0);
});
test('R088 hidden, five-taste-incomplete, wrong feed/style/equipment donors remain excluded',()=>{
 for(const change of [
  {hidden:true},{dialedIn:false},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,body:2}},{style:'Traditional'},
  {feedMode:'slow'},{setupVersionId:'different'},{basketId:'other'}
 ]){
  const {s,shot,rec}=fixture(),baseline=rec();
  s.shots.push(shot('bad',change));
  assert.deepEqual(rec().ratio,baseline.ratio,JSON.stringify(change));
 }
});
