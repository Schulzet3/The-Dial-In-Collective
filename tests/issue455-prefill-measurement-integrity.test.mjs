import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {prefill} from '../site/lib/engine.js';

// Reproductions use only isolated synthetic archives, not real member data.
const state=()=>hydrate(rawFixture());
const shot=(id,timestamp,overrides={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',basketId:'basketv',
 calibrationId:'cal',style:'Turbo',feedMode:'standard',
 doseG:18,grindSetting:2.5,timeS:16,yieldG:36,
 notes:'Original private historical note',timestamp,hidden:false,...overrides
});
const newest='2026-11-06T12:00:00Z',older='2026-11-05T12:00:00Z';
const get=s=>prefill(s,'coffee',{basketId:'basketv',style:'Turbo',feedMode:'standard'});

test('R082 malformed newest historical doses never prefill Log Shot; older measured dose survives',()=>{
 for(const doseG of [0,-1,NaN,Infinity,'19',401]){
  const s=state();s.shots.push(shot('older',older,{doseG:19.5}),shot('bad',newest,{doseG}));
  const before=structuredClone(s),next=get(s);
  assert.equal(next.doseG,19.5,String(doseG));
  assert.equal(next.yieldG,'');assert.equal(next.timeS,'');
  assert.deepEqual(s,before,'preserve all original notes and shot measurements');
 }
});

test('R082 unmeasured archived doses fall back to actual selected basket dose',()=>{
 const s=state();s.shots.push(shot('bad',newest,{doseG:0}));
 assert.equal(get(s).doseG,activeVersion(s).baskets[0].doseG);
});

test('R082 out-of-range current-calibration grind never prepopulates next-shot dial',()=>{
 for(const grindSetting of [-1,5.1,NaN,Infinity,'2']){
  const s=state();s.shots.push(shot('older',older,{grindSetting:2.4}),shot('bad',newest,{grindSetting}));
  const before=structuredClone(s),next=get(s);
  assert.equal(next.grindSetting,2.4,String(grindSetting));
  assert.deepEqual(s,before);
 }
});

test('R082 if no valid current-calibration grind, require fresh measured input',()=>{
 const s=state();s.shots.push(shot('outside',newest,{grindSetting:9}));
 assert.equal(get(s).grindSetting,'');
});

test('R082 both entered espresso endpoints and latest valid inputs remain eligible',()=>{
 for(const grindSetting of [0,5]){
  const s=state();s.shots.push(shot('endpoint',newest,{grindSetting,doseG:20}));
  const next=get(s);
  assert.equal(next.grindSetting,grindSetting);
  assert.equal(next.doseG,20);
  assert.deepEqual(Object.values(next.tasteScales),[null,null,null,null,null]);
  assert.equal(next.notes,'');
 }
});

test('R082 old calibration and nonmatching style/feed/basket do not override valid current grind',()=>{
 const s=state();s.shots.push(
  shot('valid',older,{grindSetting:1.8}),
  shot('old-cal',newest,{calibrationId:'legacy',grindSetting:3.1}),
  shot('wrong-style',newest,{style:'Fast-Flow',grindSetting:4.1}),
  shot('wrong-feed',newest,{feedMode:'slow',grindSetting:4.2}),
  shot('wrong-basket',newest,{basketId:'other',grindSetting:4.3})
 );
 const before=structuredClone(s),next=get(s);
 assert.equal(next.grindSetting,1.8);
 assert.equal(next.doseG,18);
 assert.deepEqual(s,before);
});
