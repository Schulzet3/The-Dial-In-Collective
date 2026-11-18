import test from 'node:test';
import assert from 'node:assert/strict';
import {nextShotAdjustment,nextShotGuidance} from '../site/lib/ui.js';

// Synthetic-only: no member records, live SQL, provider, or telemetry.
const shot={id:'r352-synthetic',doseG:18,yieldG:36,grindSetting:4.5,tempC:70.2,
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:2},notes:'Original private note'};
const clipped={title:'Try a small temperature change',
 text:'Try about 1 degree C (2 degrees F) cooler while keeping the other variables steady.',
 next:{grindSetting:4.5,yieldCenter:36,tempC:70}};
test('R352 near floor no identical F/C numeric arrow or falsely full-degree guidance',()=>{
 const original=structuredClone(shot),prior=structuredClone(clipped);
 for(const unit of ['F','C']){
  assert.equal(nextShotAdjustment(clipped,shot,true,unit),null);
  const html=nextShotGuidance(clipped,shot,true,unit);
  assert.doesNotMatch(html,/next-shot-change|next-shot-number|Try about 1 degree C/);
  assert.match(html,/smaller than one displayed degree/);
  assert.match(html,/check whether your machine can make that small adjustment/);
 }
 assert.deepEqual(shot,original);assert.deepEqual(clipped,prior);
 assert.deepEqual(Object.keys(shot.tasteScales).sort(),['astringency','body','clarity','extraction','sweetness']);
});
test('R352 ordinary one-degree temperature step still makes a single valid arrow',()=>{
 const measured={...shot,tempC:93},advice={title:'Try a small temperature change',text:'Keep other settings steady.',
  next:{grindSetting:4.5,yieldCenter:36,tempC:92}};
 for(const unit of ['F','C']){
  const change=nextShotAdjustment(advice,measured,true,unit);
  assert.ok(change);assert.equal(change.label,'Temperature');
  assert.notEqual(change.before,change.after);
  assert.match(nextShotGuidance(advice,measured,true,unit),/next-shot-change/);
 }
});
test('R352 unchanged yield guidance and disabled-temperature fallback',()=>{
 const yieldAdvice={text:'Try a longer yield with grind steady.',
  evidenceNote:'Exploratory trial; no measured personal outcome.',
  next:{grindSetting:shot.grindSetting,yieldCenter:38}};
 assert.equal(nextShotAdjustment(yieldAdvice,shot,false,'F').label,'Yield');
 assert.match(nextShotGuidance(yieldAdvice,shot,false,'F'),/next-shot-change/);
 assert.match(nextShotGuidance(yieldAdvice,shot,false,'F'),/Exploratory trial/);
 assert.match(nextShotGuidance(clipped,shot,false,'F'),/Try about 1 degree C/);
 assert.doesNotMatch(nextShotGuidance(clipped,shot,false,'F'),/next-shot-change/);
});