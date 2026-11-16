import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeGrid} from '../site/lib/ui.js';

// Synthetic current and imported legacy setup values; no real member/provider access.
const recipe=()=>({
 doseG:18,
 yield:{low:34,high:40,center:36},
 ratio:{center:2},
 time:{low:24,high:30,center:27},
 grind:{range:null,value:3.2,source:'Original measured context'},
 tempC:93
});

test('R313 a legitimate F/C setup renders measured Celsius without changing the recipe',()=>{
 const rec=recipe(),before=structuredClone(rec);
 assert.match(recipeGrid(rec,true,'C'),/93<span class="unit">°C<\/span>/);
 assert.match(recipeGrid(rec,true,'F'),/199<span class="unit">°F<\/span>/);
 assert.deepEqual(rec,before,'rendering never changes measured recipe or source');
});

test('R313 malformed historical unit cannot introduce markup or a fictional physical scale',()=>{
 for(const invalid of ['Kelvin','K','',null,undefined,'<img src=x onerror=alert(1)>']){
  const rec=recipe(),original=structuredClone(rec);
  const html=recipeGrid(rec,true,invalid);
  assert.match(html,/199<span class="unit">°F<\/span>/);
  assert.doesNotMatch(html,/<img|onerror=|°Kelvin|°K/);
  assert.match(html,/Original measured context/);
  assert.deepEqual(rec,original);
 }
});

test('R313 a disabled temperature field still displays other recipe controls unchanged',()=>{
 const rec=recipe(),original=structuredClone(rec);
 const hidden=recipeGrid(rec,false,'<script>untrusted()</script>');
 assert.doesNotMatch(hidden,/Temperature|untrusted|<script>/);
 assert.match(hidden,/Basket-based/);
 assert.match(hidden,/Original measured context/);
 assert.deepEqual(rec,original);
});
