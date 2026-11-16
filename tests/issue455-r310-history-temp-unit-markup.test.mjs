import test from 'node:test';
import assert from 'node:assert/strict';
import {shotSummary} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

// Entirely synthetic archived shot records. No real member, provider, or DB.
const shot=unit=>({
 id:'r310-archived',timestamp:'2026-11-16T12:00:00Z',
 doseG:18,yieldG:36,timeS:28,grindSetting:2.5,tempC:93,
 style:'Traditional',setupVersionId:'version',familyId:'family',
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Private <original> note',dialedIn:true,revision:1,
 snapshot:{tempUnit:unit,setupName:'Private setup'}
});

test('R310 malformed historical units never inject markup or invent degrees in Shot History',()=>{
 for(const invalid of ['K','Kelvin','',null,'<img src=x onerror=alert(1)>']){
  const historical=shot(invalid),before=structuredClone(historical);
  const c=shotCard(historical,{expanded:true,activeVersionId:'version',unit:'C'});
  assert.match(c,/93°C/,'valid active Celsius controls fallback');
  assert.doesNotMatch(c,/°K|°Kelvin|<img|onerror=/);
  assert.match(c,/Private &lt;original&gt; note/);
  assert.match(c,/Dialed In/);
  assert.deepEqual(historical,before,'rendering never changes history, ratings or notes');
  const f=shotCard(historical,{expanded:true,activeVersionId:'version',unit:'unknown'});
  assert.match(f,/199°F/,'malformed active unit must safely fall back to Fahrenheit');
  assert.doesNotMatch(f,/<img|onerror=/);
 }
});
test('R310 valid original F/C temperature units remain authoritative across changed setup units',()=>{
 for(const [original,active,expected] of [['C','F','93°C'],['F','C','199°F']]){
  const s=shot(original),before=structuredClone(s);
  const html=shotCard(s,{expanded:true,activeVersionId:'version',unit:active});
  assert.ok(html.includes(expected));
  assert.deepEqual(s,before);
 }
});
test('R310 direct shotSummary entrypoint rejects untrusted unit markup and preserves measured Celsius',()=>{
 const s=shot('C'),before=structuredClone(s);
 const unsafe=shotSummary(s,'<img src=x onerror=alert(1)>');
 assert.match(unsafe,/199°F/);
 assert.doesNotMatch(unsafe,/<img|onerror=/);
 assert.match(shotSummary(s,'C'),/93°C/);
 assert.match(shotSummary(s,'F'),/199°F/);
 assert.deepEqual(s,before);
});
