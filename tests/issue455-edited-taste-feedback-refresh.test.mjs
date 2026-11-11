import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {saveShot,editShot,recommendation} from '../site/lib/engine.js';

// R175 synthetic-only Log Shot -> edit ratings -> recommendation.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function sample(taste=green,yieldG=44){
 const s=hydrate(rawFixture());s.shots=[];s.families=[];s.communityEvidence={};
 const shot=saveShot(s,'coffee',{
  id:'rated-shot',basketId:'basketv',style:'Turbo',feedMode:'standard',
  doseG:18,yieldG,timeS:16,grindSetting:2,tempC:null,
  tasteScales:{...taste},notes:'Original private shot notes'
 });
 const rec=()=>recommendation(s,'coffee',{
  style:'Turbo',basketId:'basketv',feedMode:'standard'
 });
 return {s,shot,rec};
}
test('R175 editing a green shot to sour yields an actionable single-control next recipe',()=>{
 const f=sample();
 const corrected=editShot(f.s,f.shot.id,{tasteScales:{...green,extraction:2}});
 assert.equal(corrected.suggestion.title,'Shot corrected');
 assert.equal(corrected.suggestion.next,null,'cached edit message has no usable action');
 const frozen=structuredClone(f.s),r=f.rec();
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,49,'existing five-gram yield step, not a new rule');
 assert.equal(r.grind.value,2,'grind must remain measured setting');
 assert.equal(r.doseG,18);
 assert.equal(r.tempC,null);
 assert.deepEqual(f.s,frozen,'history, notes and corrected five ratings untouched on read');
 assert.equal(f.shot.notes,'Original private shot notes');
 assert.equal(f.shot.tasteScales.extraction,2);
});
test('R175 editing the five ratings toward bitter changes only the yield direction',()=>{
 const f=sample();
 editShot(f.s,f.shot.id,{tasteScales:{...green,extraction:4}});
 const r=f.rec();
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,39);
 assert.equal(r.grind.value,2);
 assert.equal(r.doseG,18);
});
test('R175 edited strong dryness yields preparation diagnostic, not a fabricated numeric move',()=>{
 const f=sample();
 editShot(f.s,f.shot.id,{tasteScales:{...green,astringency:3}});
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.source,'Your last measured shot (preparation check)');
 assert.equal(r.diagnosticOnly,true);
 assert.equal(r.grind.value,2);
 assert.equal(r.yield.center,44);
 assert.deepEqual(f.s,before);
});
test('R175 existing actionable saved suggestion still drives the same next recipe',()=>{
 const f=sample({...green,extraction:2});
 assert.equal(f.shot.suggestion.next?.yieldCenter,49);
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,49);
 assert.equal(r.grind.value,2);
 assert.deepEqual(f.s,before);
});
test('R175 corrected ratings cannot manufacture an out-of-range next action',()=>{
 const f=sample(green,200);
 editShot(f.s,f.shot.id,{tasteScales:{...green,extraction:2}});
 const before=structuredClone(f.s),r=f.rec();
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.ok(r.yield.high<=200,'displayed start remains inside current entry range');
 assert.equal(f.shot.yieldG,200,'original extreme measurement intact');
 assert.deepEqual(f.s,before);
});
test('R175 corrected all-green success is not replaced with taste adjustment',()=>{
 const f=sample({...green,extraction:2});
 editShot(f.s,f.shot.id,{tasteScales:{...green}});
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(f.shot.dialedIn,true);
 assert.equal(f.shot.suggestion.next,null);
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.shot.tasteScales,green);
 assert.deepEqual(f.s,before);
});
