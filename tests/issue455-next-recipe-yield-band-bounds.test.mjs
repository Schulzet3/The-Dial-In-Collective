import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';
import {CONFIG} from '../site/lib/constants.js';

// Synthetic offline state only; no production accounts or member data.
function scenario(yieldG,{cachedNext=null,extraction=2,timeS=22}={}) {
 const state=hydrate(rawFixture()),v=activeVersion(state);
 v.advanced.temperature=true;
 const shot={id:'upper-bound-measured',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:'basketv',style:'Turbo',
  feedMode:'standard',doseG:20,yieldG,timeS,grindSetting:1.2,tempC:91,
  timestamp:'2026-11-08T03:00:00Z',hidden:false,dialedIn:false,
  notes:'Do not edit measured history or my notes.',
  tasteScales:{extraction,body:3,clarity:5,sweetness:4,astringency:1}};
 if(cachedNext)shot.suggestion={title:'Original private cached suggestion',next:cachedNext};
 state.shots.push(shot);
 return {state,shot};
}
function card(state){
 return recommendation(state,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
}
test('R109 direct computed meaningful +5 g reaches valid inclusive 200 g without displaying impossible 201 g range',()=>{
 const {state,shot}=scenario(195),before=structuredClone(state);
 const expected=nextAdvice(state,shot,recommendation(state,'coffee',{ignoreAdvice:true}));
 assert.equal(expected.next.yieldCenter,200);
 const rec=card(state);
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.deepEqual(rec.yield,{low:199,high:200,center:200});
 assert.equal(rec.ratio.high,10,'display ratio must derive from bounded physical yield');
 assert.equal(rec.doseG,20);assert.equal(rec.grind.value,1.2);assert.equal(rec.tempC,91);
 assert.deepEqual(state,before,'original measured shot, five tastes, notes, and saved data untouched');
});
test('R109 valid archived one-change cached 200 g next recipe also uses in-range display band',()=>{
 const {state,shot}=scenario(195,{cachedNext:{grindSetting:1.2,yieldCenter:200}});
 const original=structuredClone(state),rec=card(state);
 assert.deepEqual(rec.yield,{low:199,center:200,high:200});
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.deepEqual(shot,original.shots[0],'do not rewrite a private cached plan or history');
});
test('R109 ordinary middle-range and inclusive lower yield end stay unchanged',()=>{
 const middle=scenario(50),before=structuredClone(middle.state),m=card(middle.state);
 assert.deepEqual(m.yield,{low:54,high:56,center:55});
 assert.deepEqual(middle.state,before);
 const lower=scenario(6,{extraction:4,timeS:16});
 const l=card(lower.state);
 assert.equal(l.yield.center,5);
 assert.deepEqual(l.yield,{low:CONFIG.bounds.yieldG[0],high:6,center:5});
 assert.equal(l.doseG,20);assert.equal(l.grind.value,1.2);
 assert.deepEqual(lower.shot.tasteScales,{extraction:4,body:3,clarity:5,sweetness:4,astringency:1});
});
