import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeGrid} from '../site/lib/ui.js';
import {recommendation} from '../site/lib/engine.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';

// Only synthetic recipes and shot records: no member/provider access.
const recipe=()=>({
 doseG:18,
 yield:{low:34,high:40,center:36},
 ratio:{center:2},
 time:{low:24,high:30,center:27},
 grind:{range:null,value:3.2,source:'Original measured context'},
 tempC:null
});

test('R458 optional tracked temperature without a recorded value says Not available, never just a unit',()=>{
 for(const missing of [null,undefined,'',NaN,Infinity,-Infinity,'unknown']){
  for(const unit of ['F','C']){
   const rec=recipe();rec.tempC=missing;
   const original=structuredClone(rec);
   const html=recipeGrid(rec,true,unit);
   assert.match(html,/Temperature/);
   assert.match(html,/class="metric-value">Not available<\/div>/);
   assert.doesNotMatch(html,/<span class="unit">°[FC]<\/span>/);
   assert.deepEqual(rec,original,'rendering must not alter the recipe');
  }
 }
});

test('R458 known physical temperatures still display correct Fahrenheit and Celsius without missing copy',()=>{
 for(const [value,unit,expected] of [[93,'C',93],[93,'F',199],['93','C',93],['93','F',199],[0,'F',32]]){
  const rec=recipe();rec.tempC=value;
  const html=recipeGrid(rec,true,unit);
  assert.match(html,new RegExp(String(expected)+'<span class="unit">°'+unit+'<\\/span>'));
  assert.doesNotMatch(html,/Not available/);
  assert.equal(rec.tempC,value);
 }
});

test('R458 disabled temperature tracking hides metric and preserves all other recipe controls',()=>{
 const rec=recipe(),original=structuredClone(rec);
 const html=recipeGrid(rec,false,'C');
 assert.doesNotMatch(html,/Temperature|Not available|°C/);
 for(const label of ['Dose','Yield','Time','Grind'])assert.match(html,new RegExp(label));
 assert.match(html,/Original measured context/);
 assert.deepEqual(rec,original);
});

test('R458 same-coffee, five-rated, no-temperature feedback renders truthful missing metric without editing shot',()=>{
 const raw=rawFixture();
 raw.setupPreferences[0].track_temperature=true;
 raw.shots=[rawShot({
   feed_mode:'standard',grind_setting:2.5,temperature_c:null,
   extraction:1,body:3,clarity:5,sweetness:5,astringency:1,
   is_dialed_in:false,notes:'Synthetic original shot'
 })];
 const before=structuredClone(raw),state=hydrate(raw);
 const rec=recommendation(state,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.tempC,null,'unknown actual must not become a fabricated number');
 const rendered=recipeGrid(rec,true,'F');
 assert.match(rendered,/class="metric-value">Not available<\/div>/);
 assert.doesNotMatch(rendered,/<span class="unit">°F<\/span>/);
 assert.match(rendered,/Original measured context|Next setting to try/);
 assert.deepEqual(raw,before,'private shots and five ratings remain unchanged');
 assert.deepEqual(state.shots[0].tasteScales,{
   extraction:1,body:3,clarity:5,sweetness:5,astringency:1
 });
});
