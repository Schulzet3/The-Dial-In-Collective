import test from 'node:test';
import assert from 'node:assert/strict';
import {nextShotAdjustment,nextShotGuidance} from '../site/lib/ui.js';

const measured=Object.freeze({doseG:18,yieldG:36,grindSetting:8,tempC:93});
const yieldNext={grindSetting:8,yieldCenter:39};

test('R292 extraction yield arrow retains the engine coaching and one real measured adjustment',()=>{
 const advice={title:'Try a longer yield',text:'Aim around 39.0 g out with dose and grind unchanged. Compare the balance.',next:yieldNext};
 const html=nextShotGuidance(advice,measured,true,'C');
 assert.equal(nextShotAdjustment(advice,measured,true,'C').label,'Yield');
 assert.match(html,/class="next-shot-change"/);
 assert.match(html,/class="helper next-shot-coaching"/);
 assert.match(html,/Compare the balance\./);
 assert.match(html,/Keep dose, grind, and temperature unchanged\./);
 assert.equal((html.match(/class="next-shot-change"/g)||[]).length,1);
});

test('R292 body and grind arrow preserve their distinct taste-again coaching',()=>{
 const body=nextShotGuidance({text:'Keep dose and grind steady; aim around 39.0 g out. Let taste decide.',next:yieldNext},measured);
 assert.match(body,/Let taste decide\./);
 const grind=nextShotGuidance({text:'Try grind 7.8. Keep dose and yield similar, then taste again. Sized from your own comparable adjustments.',
  next:{grindSetting:7.8,yieldCenter:36}},measured);
 assert.match(grind,/then taste again\./);
 assert.match(grind,/Adjustment sized from your comparable shots\./);
 assert.match(grind,/Keep dose and yield unchanged\./);
});

test('R292 numeric arrow retains separate uncertainty note once, escaped from untrusted text',()=>{
 const advice={text:'Compare <sweet> & evaluate',evidenceNote:'Not <proven> & uncertain',next:yieldNext};
 const html=nextShotGuidance(advice,measured);
 assert.match(html,/Compare &lt;sweet&gt; &amp; evaluate/);
 assert.match(html,/Not &lt;proven&gt; &amp; uncertain/);
 assert.doesNotMatch(html,/<sweet>|<proven>/);
 assert.equal(html.split('Not &lt;proven&gt; &amp; uncertain').length-1,1);
});

test('R292 all-green and unrated no-op remain original text without numeric arrow',()=>{
 for(const text of ['Balanced, sweet and clean for your taste.','Rate all five sensory qualities before using taste feedback.']){
  const html=nextShotGuidance({text,next:null},measured);
  assert.match(html,/next-shot-original-advice/);
  assert.ok(html.includes(text));
  assert.doesNotMatch(html,/next-shot-change|next-shot-coaching/);
 }
});

test('R292 multiple real controls cannot be presented as one misleading arrow',()=>{
 const advice={text:'Review both settings before changing.',next:{grindSetting:7.8,yieldCenter:39}};
 assert.equal(nextShotAdjustment(advice,measured,true),null);
 const html=nextShotGuidance(advice,measured,true);
 assert.match(html,/Review both settings before changing/);
 assert.doesNotMatch(html,/next-shot-change|next-shot-coaching/);
});

test('R292 missing historical measurement and unsupported temperature retain exact fallback',()=>{
 const absent={...measured,yieldG:null};
 const advice={text:'History has no measured yield.',next:yieldNext};
 assert.equal(nextShotAdjustment(advice,absent),null);
 assert.match(nextShotGuidance(advice,absent),/History has no measured yield/);
 const temp={text:'Temperature is not supported.',next:{grindSetting:8,yieldCenter:36,tempC:92}};
 assert.equal(nextShotAdjustment(temp,measured,false),null);
 assert.doesNotMatch(nextShotGuidance(temp,measured,false),/next-shot-change/);
});

test('R292 empty original coaching emits no blank paragraph or new advice',()=>{
 const html=nextShotGuidance({next:yieldNext},measured);
 assert.match(html,/next-shot-change/);
 assert.doesNotMatch(html,/next-shot-coaching|undefined|>null</);
});
