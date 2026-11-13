import test from 'node:test';
import assert from 'node:assert/strict';
import {nextShotAdjustment,nextShotGuidance} from '../site/lib/ui.js';

const measured={doseG:18,yieldG:36,grindSetting:8,tempC:93};

test('fallback retains supplied uncertainty note when there is no measured one-control change',()=>{
 const advice={title:'Review the next shot',text:'Compare the recorded shot before adjusting.',
  evidenceNote:'Exploratory only: no controlled taste outcome established.',
  next:{grindSetting:8,yieldCenter:36}};
 assert.equal(nextShotAdjustment(advice,measured,true),null);
 const html=nextShotGuidance(advice,measured,true);
 assert.match(html,/class="helper next-shot-original-advice"/);
 assert.match(html,/Compare the recorded shot before adjusting/);
 assert.match(html,/class="next-shot-evidence"/);
 assert.match(html,/Exploratory only: no controlled taste outcome established/);
 assert.doesNotMatch(html,/class="next-shot-change"/);
});

test('fallback escapes source text and uncertainty without adding a fictitious arrow',()=>{
 const advice={text:'Use <actual> & saved measurements',evidenceNote:'Not <verified> & not causal',next:null};
 const html=nextShotGuidance(advice,measured);
 assert.match(html,/Use &lt;actual&gt; &amp; saved measurements/);
 assert.match(html,/Not &lt;verified&gt; &amp; not causal/);
 assert.doesNotMatch(html,/<actual>|<verified>|next-shot-change/);
});

test('measured one-control arrow keeps its note exactly once and other controls unchanged',()=>{
 const advice={text:'Try a slightly longer yield.',evidenceNote:'From comparable shots, not causation.',
  next:{grindSetting:8,yieldCenter:37}};
 assert.ok(nextShotAdjustment(advice,measured,true));
 const html=nextShotGuidance(advice,measured,true);
 assert.match(html,/class="next-shot-change"/);
 assert.match(html,/class="next-shot-keep"/);
 assert.equal(html.split('From comparable shots, not causation.').length-1,1);
 assert.doesNotMatch(html,/class="next-shot-original-advice"/);
});

test('fallback without evidence note remains the same concise textual explanation',()=>{
 const advice={text:'Rate all five tastes.',next:null};
 const html=nextShotGuidance(advice,measured);
 assert.equal(html,'<p class="helper next-shot-original-advice">Rate all five tastes.</p>');
 assert.doesNotMatch(html,/next-shot-evidence/);
});
