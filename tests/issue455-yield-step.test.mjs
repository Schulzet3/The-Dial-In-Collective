import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {nextAdvice,recommendation} from '../site/lib/engine.js';
import {nextShotAdjustment,nextShotGuidance} from '../site/lib/ui.js';

const GREEN={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(overrides={}){
 const state=hydrate(rawFixture()),v=activeVersion(state);
 v.advanced.temperature=true;
 const shot={id:'current',coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',doseG:18,yieldG:36,
  timeS:16,grindSetting:1.2,tempC:93,hidden:false,dialedIn:false,
  timestamp:'2026-11-04T12:00:00Z',notes:'Keep original notes.',
  tasteScales:{...GREEN,sweetness:4},...overrides};
 const rec=recommendation(state,'coffee',{ignoreAdvice:true,style:shot.style,basketId:shot.basketId,feedMode:shot.feedMode});
 return {state,shot,rec,advice:()=>nextAdvice(state,shot,rec)};
}
function comparable(shot,overrides={}){
 return {...structuredClone(shot),id:'prior',timestamp:'2026-11-03T12:00:00Z',
  tasteScales:{...GREEN,sweetness:5},...overrides};
}
test('#455 default sweetness-only: exactly +5 g and honest exploratory context visible alongside one-control arrow',()=>{
 const {shot,advice}=fixture(),before=structuredClone(shot),a=advice();
 assert.equal(a.next.yieldCenter,41);
 assert.equal(a.next.grindSetting,1.2);
 assert.match(a.evidenceNote,/exploratory/i);
 const arrow=nextShotAdjustment(a,shot,true,'C');
 assert.deepEqual([arrow.label,arrow.before,arrow.after],['Yield','36.0','41.0']);
 assert.match(nextShotGuidance(a,shot,true,'C'),/Exploratory starting step/);
 assert.match(nextShotGuidance(a,shot,true,'C'),/Keep dose, grind, and temperature unchanged/);
 assert.deepEqual(shot,before);
});
test('#455 short ristretto and smaller Fast-Flow scale relative to 36 g baseline without other controls',()=>{
 const a=fixture({style:'Ristretto',yieldG:20}),b=fixture({style:'Fast-Flow',doseG:8,yieldG:12,feedMode:'slow'});
 assert.equal(a.advice().next.yieldCenter,23);
 assert.equal(b.advice().next.yieldCenter,14);
 assert.equal(b.advice().next.grindSetting,1.2);
});
test('#455 all numeric extraction and body yield changes use meaningful directionally correct steps',()=>{
 const cases=[
  [{...GREEN,extraction:2},41],
  [{...GREEN,extraction:4},31],
  [{...GREEN,body:2},31],
  [{...GREEN,body:4},41]
 ];
 for(const [tasteScales,expected] of cases){
  const {advice}=fixture({tasteScales});
  assert.equal(advice().next.yieldCenter,expected);
 }
 const {advice}=fixture({yieldG:20,tasteScales:{...GREEN,body:2}});
 assert.equal(advice().next.yieldCenter,17);
});
test('#455 green and missing ratings do not trigger suggestions',()=>{
 assert.equal(fixture({tasteScales:GREEN}).advice().next,null);
 assert.equal(fixture({tasteScales:{...GREEN,sweetness:null}}).advice().next,null);
});
test('#455 meaningful-step limit abstains instead of disguising a clipped +2 g as +5 g',()=>{
 for(const [yieldG,tasteScales] of [[198,{...GREEN,sweetness:4}],[198,{...GREEN,extraction:2}],[5,{...GREEN,extraction:4}]]){
  const advice=fixture({yieldG,tasteScales}).advice();
  assert.equal(advice.next,null);
  assert.match(advice.text,/limit|range/i);
 }
});
test('#455 comparable same-coffee sweeter history can suggest shorter or longer yield, never a causal guarantee',()=>{
 for(const [priorYield,expected] of [[31,31],[41,41]]){
  const {state,shot,advice}=fixture();
  state.shots.push(comparable(shot,{yieldG:priorYield}));
  const a=advice();
  assert.equal(a.next.yieldCenter,expected);
  assert.match(a.evidenceNote,/comparable same-coffee ratings/i);
  assert.match(a.evidenceNote,/do not prove causation/i);
 }
});
test('#455 worse sweetness at higher comparable yield can favor a shorter experiment',()=>{
 const {state,shot,advice}=fixture();
 state.shots.push(comparable(shot,{yieldG:41,tasteScales:{...GREEN,sweetness:3}}));
 assert.equal(advice().next.yieldCenter,31);
});
test('#455 stagnant +5 g trial explores the opposite side rather than recommending another blind +5 g',()=>{
 const {state,shot,advice}=fixture({yieldG:41});
 state.shots.push(comparable(shot,{yieldG:36,tasteScales:{...GREEN,sweetness:4}}));
 const a=advice();
 assert.equal(a.next.yieldCenter,31);
 assert.match(a.evidenceNote,/same sweetness rating/i);
});
test('#455 conflicting comparable evidence does not invent a precision direction',()=>{
 const {state,shot,advice}=fixture();
 state.shots.push(comparable(shot,{id:'higher',yieldG:41,tasteScales:{...GREEN,sweetness:5}}),
  comparable(shot,{id:'lower',yieldG:31,tasteScales:{...GREEN,sweetness:5}}));
 const a=advice();
 assert.equal(a.next,null);
 assert.match(a.text,/conflicting/i);
});
test('#455 same-bean evidence must match setup, calibration, style, basket, feed, dose, grind and temperature',()=>{
 const deltas=[
  {coffeeId:'different-coffee'}, {setupVersionId:'old-version'}, {calibrationId:'old-cal'},
  {style:'Traditional'}, {basketId:'different-basket'}, {feedMode:'slow'},
  {doseG:19}, {grindSetting:1.5}, {tempC:95}, {hidden:true},
  {timestamp:'2026-11-05T12:00:00Z'},
  {tasteScales:{...GREEN,extraction:4,sweetness:5}}
 ];
 for(const delta of deltas){
  const {state,shot,advice}=fixture();
  state.shots.push(comparable(shot,{yieldG:31,...delta}));
  const a=advice();
  assert.equal(a.next.yieldCenter,41,JSON.stringify(delta));
  assert.match(a.evidenceNote,/Exploratory starting step/);
 }
});
test('#455 older cached +1 g next recipe is refreshed read-only; measured shot and stored advice remain intact',()=>{
 const {state,shot}=fixture();
 shot.suggestion={title:'A small refinement',next:{grindSetting:1.2,yieldCenter:37}};
 state.shots.push(shot);
 const before=structuredClone(shot),rec=recommendation(state,'coffee');
 assert.equal(rec.yield.center,41);
 assert.equal(rec.doseG,18);
 assert.equal(rec.grind.value,1.2);
 assert.deepEqual(shot,before);
});

test('#455 empty or whitespace legacy sweetness evidence cannot invent a shorter next yield',()=>{
 for(const invalidTime of ['', '   ']){
  const {state,shot,advice}=fixture();
  const legacy=comparable(shot,{id:'undated',timestamp:invalidTime,yieldG:31,
   notes:'Private original historical shot note'});
  state.shots.push(legacy);
  const original=structuredClone(state.shots);
  const a=advice();
  assert.equal(a.next.yieldCenter,41,'undated history cannot reverse a 36g exploratory shot');
  assert.match(a.evidenceNote,/Exploratory starting step/);
  assert.deepEqual(state.shots,original,'preserve every original measurement, five tastes and notes');
 }
});

test('#455 dated same-coffee sweetness evidence remains eligible beside undated rows',()=>{
 const {state,shot,advice}=fixture();
 const past=comparable(shot,{id:'dated',yieldG:31,
  notes:'Measured successful shorter prior'});
 state.shots.push(comparable(shot,{id:'legacy',timestamp:' ',yieldG:41,
  notes:'Retain undated measurement'}),past);
 const original=structuredClone(state.shots);
 const a=advice();
 assert.equal(a.next.yieldCenter,31);
 assert.match(a.evidenceNote,/Earlier comparable same-coffee ratings/);
 assert.deepEqual(state.shots,original);
});

test('#455 undated current legacy shot cannot infer a chronological sweetness trend',()=>{
 const {state,shot,advice}=fixture({timestamp:'   '});
 state.shots.push(comparable(shot,{id:'earlier-untrusted',timestamp:'',yieldG:31,
  notes:'Preserved historical note'}));
 const original=structuredClone(state.shots);
 const a=advice();
 assert.equal(a.next.yieldCenter,41);
 assert.match(a.evidenceNote,/Exploratory starting step/);
 assert.deepEqual(state.shots,original);
});
