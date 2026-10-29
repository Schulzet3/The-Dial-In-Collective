import test from 'node:test';
import assert from 'node:assert/strict';
import {shotSummary} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const measured = {
 id:'shot-history-ratio',timestamp:'2026-10-29T17:45:00Z',
 doseG:18,yieldG:50,timeS:21.5,grindSetting:1.3,tempC:89.4,
 style:'Traditional',dialedIn:true,setupVersionId:'version',
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Raw measurements and annotations remain untouched',
 snapshot:{setupName:'Personal',basketDoseG:18,tempUnit:'F'}
};

test('Shot History shows dose, yield, computed ratio, time and actual measurements',()=>{
 const compact=shotSummary(measured,'F');
 assert.match(compact,/18\.0g → 50\.0g · 1:2\.78 · 21\.5s/);
 assert.match(compact,/Grind 1\.3/);
 for(const expanded of [false,true]){
  const html=shotCard(measured,{expanded,activeVersionId:'version',unit:'F'});
  assert.match(html,/18\.0g → 50\.0g · 1:2\.78 · 21\.5s/);
  assert.equal((html.match(/1:2\.78/g)||[]).length,1,'single visible ratio in the measured shot');
  assert.match(html,/Raw measurements and annotations remain untouched/);
  if(expanded)assert.match(html,/class="radar"/);
 }
});

test('History ratio is source-measurement derived, never fabricated for corrupt or partial historic data',()=>{
 const zeroDose=shotSummary({...measured,doseG:0});
 const badYield=shotSummary({...measured,yieldG:null});
 const badDose=shotSummary({...measured,doseG:'not-a-number'});
 for(const html of [zeroDose,badYield,badDose]){
  assert.doesNotMatch(html,/1:(NaN|Infinity|\d)/);
  assert.doesNotMatch(html,/1:0\.00/);
 }
 assert.match(shotSummary({...measured,doseG:19,yieldG:38}),/1:2\.00/);
});
