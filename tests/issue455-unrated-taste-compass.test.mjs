import test from 'node:test';
import assert from 'node:assert/strict';
import {chips,radar} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const dots=html=>(html.match(/class="dot severity-\d+"/g)||[]).length;

test('#455 legacy missing five tastes remain neutral and are not plotted as ideal or failures',()=>{
 for(const tastes of [null,undefined,{},Object.fromEntries(Object.keys(green).map(key=>[key,null]))]){
  const summary=chips(tastes),compass=radar(tastes);
  assert.equal((summary.match(/class="taste-chip is-unrated"/g)||[]).length,5);
  assert.equal((summary.match(/Not rated/g)||[]).length,5);
  assert.doesNotMatch(summary,/severity-0|severity-4/);
  assert.match(compass,/Extraction Not rated/);
  assert.equal(dots(compass),0);
  assert.doesNotMatch(compass,/class="radar-result /);
  assert.doesNotMatch(compass,/is-ideal/);
 }
});

test('#455 partial rating shows recorded tastes only and omits misleading completed radar polygon',()=>{
 const tastes={...green,sweetness:null};
 const summary=chips(tastes),compass=radar(tastes);
 assert.equal((summary.match(/class="taste-chip is-unrated"/g)||[]).length,1);
 assert.match(summary,/Sweetness: Not rated/);
 assert.equal(dots(compass),4);
 assert.doesNotMatch(compass,/class="radar-result /);
 assert.match(compass,/Sweetness Not rated/);
 assert.match(summary,/class="taste-chip severity-0">Extraction/);
});

test('#455 all five real green and off-green scores keep existing compass meaning',()=>{
 const success=radar(green),failure=radar({...green,extraction:1});
 assert.equal(dots(success),5);
 assert.match(success,/class="radar-result is-ideal"/);
 assert.equal(dots(failure),5);
 assert.match(failure,/class="radar-result "/);
 assert.doesNotMatch(failure,/class="radar-result is-ideal"/);
 assert.match(chips({...green,extraction:1}),/class="taste-chip severity-4">Extraction: Very sour/);
});

test('#455 malformed legacy taste entries are unknown, never fabricated scored coordinates',()=>{
 const invalid={...green,extraction:0,body:'3',clarity:9};
 const summary=chips(invalid),compass=radar(invalid);
 assert.equal((summary.match(/class="taste-chip is-unrated"/g)||[]).length,3);
 assert.equal(dots(compass),2);
 assert.doesNotMatch(compass,/class="radar-result /);
 assert.match(compass,/Extraction Not rated, Body Not rated, Clarity Not rated/);
});

test('#455 expanded historical card preserves measurements, five fields and private notes',()=>{
 const shot={
  id:'legacy-partial',timestamp:'2026-11-05T01:00:00Z',style:'Turbo',
  doseG:18,yieldG:42,timeS:15,grindSetting:2,
  tasteScales:{...green,clarity:null},notes:'Original private sensory notes',
  dialedIn:false,setupVersionId:'v1',snapshot:{setupName:'Original'}
 };
 const before=structuredClone(shot);
 const html=shotCard(shot,{expanded:true,activeVersionId:'v1'});
 assert.match(html,/Clarity: Not rated/);
 assert.match(html,/Original private sensory notes/);
 assert.match(html,/18\.0g → 42\.0g/);
 assert.doesNotMatch(html,/class="radar-result /);
 assert.deepEqual(shot,before);
});
