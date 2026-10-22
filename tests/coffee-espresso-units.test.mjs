import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductEspressoReference} from '../src/server/coffee-espresso-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const page=body=>'<main><h1>Test Coffee</h1><h2>Espresso Recommendations:</h2><p>'+body+'</p></main>';
test('spelled-out espresso units produce finite measured recipe references',()=>{
 for(const [mass,time] of [['grams','seconds'],['gram','sec'],['g','s']]){
  const html=page(`Dose: 18 ${mass} Output: 36 ${mass} Time: 25 ${time}`);
  const expected={dose_g:18,time_s_min:25,time_s_max:25,method:'Espresso',yield_g:36};
  assert.deepEqual(extractProductEspressoReference(html),expected);
  const preview=extractPublicCoffeeFacts(html,{source_url:'https://roaster.com/products/test-coffee'});
  assert.deepEqual(preview.roaster_recipe,expected);
 }
});
test('spelled-out units preserve explicit ranges and do not cross-match unrelated words',()=>{
 const result=extractProductEspressoReference(page('Dose: 18 grams to 20 grams Output: 36 grams–40 grams Time: 25 seconds–30 seconds'));
 assert.deepEqual(result,{dose_g:18,dose_g_max:20,time_s_min:25,time_s_max:30,method:'Espresso',yield_g_min:36,yield_g_max:40});
 for(const body of [
  'Measure grams carefully. Time: 25 seconds.',
  'Dose: 18 grams Output: unknown grams Time: 25 seconds',
  'Dose: 18 grams Output: 36 grams Time: unknown seconds',
  'Dose: 20 grams to 18 grams Output: 36 grams Time: 25 seconds'
 ])assert.equal(extractProductEspressoReference(page(body)),null,body);
});
