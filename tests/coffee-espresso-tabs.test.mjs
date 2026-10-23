import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductEspressoReference} from '../src/server/coffee-espresso-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const page=body=>'<main><h1>Geometry</h1>'+body+'</main>';
const button=(id,title)=>'<button data-guide="'+id+'">'+title+'</button>';
const guide=(id,body)=>'<div class="guide-body" data-guide="'+id+'"><div class="guide-text">'+body+'</div></div>';
const espresso='<div><p><strong>Overview</strong></p><p></p><p>Coffee: 20g</p><p>Yield: 47g</p></div>'+
 '<div><p><strong>Recipe</strong></p><p>Line Pressure: 0-3.5s</p><p>9 Bar: 26s</p></div>';
const partial={dose_g:20,method:'Espresso',yield_g:47};
const source='https://onyxcoffeelab.com/products/geometry';

test('Onyx-style guide identities preserve published 20 g / 47 g without inventing total time',()=>{
 // Relevant markup and values transcribed from Geometry, retrieved 2026-10-23.
 // The full captured page is independently replayed by the live-source audit.
 const html=page(button('filter_en','Filter - English')+button('filter_es','Filter - Español')+
  button('espresso_en','Espresso - English')+button('espresso_es','Espresso - Español')+
  guide('filter_en','<p>Coffee: 25g</p><p>Water: 400g @ 205°F</p><p>Total time: 3:35</p>')+
  guide('filter_es','<p>Coffee: 25g</p><p>Yield: 400g</p><p>Time: 3:35</p>')+
  guide('espresso_en',espresso)+guide('espresso_es',espresso));
 assert.deepEqual(extractProductEspressoReference(html),partial);
 const result=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:source});
 assert.deepEqual(result.roaster_recipe,partial);
 for(const key of ['time_s_min','time_s_max','temperature','ratio'])assert.equal(result.roaster_recipe[key],undefined,key);
 const markup=coffeeUrlPreviewMarkup(result);
 assert.match(markup,/published espresso reference/);
 assert.match(markup,/20 g in, 47 g out \(total shot time not published\)/);
 assert.match(markup,/Reference only; not applied or saved automatically/);
 assert.doesNotMatch(markup,/26(?:–26)? s|205°F|400 g out|25 g in|29\.5/);
});

test('a guide needs its exact espresso control identity; filter tabs cannot donate fields',()=>{
 const filterRecipe='<h2>Espresso Recommendations:</h2><p>Dose: 25g Output: 50g Time: 35s</p>';
 for(const html of [
  page(button('right','Espresso - English')+button('wrong','Filter - English')+guide('wrong',filterRecipe)),
  page(button('Espresso_A','Espresso - English')+guide('espresso_a',espresso)),
  page(button('a','Espresso | Filter')+guide('a',espresso)),
  page(button('a','Filter - English')+guide('a',filterRecipe)),
  '<nav>'+button('a','Espresso - English')+'</nav>'+page(guide('a',espresso)),
  page('<product-recommendations>'+button('a','Espresso - English')+guide('a',espresso)+'</product-recommendations>')
 ])assert.equal(extractProductEspressoReference(html),null);
});

test('duplicate guide IDs and contradictory espresso controls fail closed',()=>{
 for(const html of [
  page(button('a','Espresso - English')+button('a','Filter - English')+guide('a',espresso)),
  page(button('a','Espresso - English')+guide('a',espresso)+guide('a',espresso)),
  page('<button data-guide="a" data-guide="b">Espresso - English</button>'+guide('a',espresso)),
  page(button('a','Espresso - English')+'<div class="guide-body" data-guide="a" data-guide="b"><div class="guide-text">'+espresso+'</div></div>')
 ])assert.equal(extractProductEspressoReference(html),null);
 const repeated=page(button('a','Espresso - English')+button('a','Espresso - Español')+guide('a',espresso));
 assert.deepEqual(extractProductEspressoReference(repeated),partial);
});

test('espresso translations must agree; conflicting masses or times cannot form a hybrid recipe',()=>{
 for(const other of [espresso.replace('47g','44g'),espresso.replace('20g','20g–22g'),
  espresso.replace('47g','45g–47g')]){
  const html=page(button('a','Espresso - English')+button('b','Espresso - Español')+guide('a',espresso)+guide('b',other));
  assert.equal(extractProductEspressoReference(html),null);
 }
 const differentTimes=page(button('a','Espresso - English')+button('b','Espresso - Español')+
  guide('a',espresso+'<p>Shot time: 25s</p>')+guide('b',espresso+'<p>Shot time: 26s</p>'));
 assert.equal(extractProductEspressoReference(differentTimes),null);
 const duplicateDose=page(button('a','Espresso - English')+guide('a',espresso+'<p>Dose: 22g</p>'));
 assert.equal(extractProductEspressoReference(duplicateDose),null);
});

test('a complete explicit espresso guide can complement a matching partial translation',()=>{
 const complete=espresso+'<p>Total shot time: 25 seconds–30 seconds</p><p>Temperature: 94°C</p>';
 const html=page(button('a','Espresso - English')+button('b','Espresso - Español')+
  guide('a',complete)+guide('b',espresso));
 const result=extractProductEspressoReference(html);
 assert.deepEqual(result,{...partial,time_s_min:25,time_s_max:30,temperature:'94°C'});
 const markup=coffeeUrlPreviewMarkup({ok:true,fields:{name:'Geometry'},roaster_recipe:result});
 assert.match(markup,/published espresso recipe/);
 assert.match(markup,/20 g in, 47 g out, 25–30 s, 94°C/);
 assert.doesNotMatch(markup,/total shot time not published/);
});

test('nested method guides cannot contribute measurements to their parent espresso tab',()=>{
 for(const body of [guide('filter',espresso),
  '<div class="guide-text">'+guide('filter',espresso)+'</div>']){
  const html=page(button('a','Espresso - English')+button('filter','Filter - English')+
   '<div class="guide-body" data-guide="a">'+body+'</div>');
  assert.equal(extractProductEspressoReference(html),null);
 }
});

test('tabbed references require explicit units and bounded plausible dose/yield values',()=>{
 for(const body of [espresso.replace('Coffee: 20g','Coffee: 20'),espresso.replace('Yield: 47g','Yield: unknown'),
  espresso.replace('20g','80g'),espresso.replace('47g','400g'),espresso.replace('20g','22g–20g')]){
  assert.equal(extractProductEspressoReference(page(button('a','Espresso')+guide('a',body))),null);
 }
 const ranges=espresso.replace('20g','18g–20g').replace('47g','40g–47g');
 assert.deepEqual(extractProductEspressoReference(page(button('a','Espresso')+guide('a',ranges))),
  {dose_g:18,dose_g_max:20,method:'Espresso',yield_g_min:40,yield_g_max:47});
});

test('guide count, fragment limits and unclosed markup remain bounded and fail closed',()=>{
 const control=button('a','Espresso - English');
 for(const html of [
  page(control+guide('a',' '.repeat(8001)+espresso)),
  page(control+'<div class="guide-body" data-guide="a">'+' '.repeat(16_001)+'<div class="guide-text">'+espresso+'</div></div>'),
  page(control+'<div class="guide-body" data-guide="a"><div class="guide-text">'+espresso),
  page(Array.from({length:65},(_,i)=>button('guide_'+i,'Espresso')).join('')+guide('guide_0',espresso)),
  'x'.repeat(2_000_001)
 ])assert.equal(extractProductEspressoReference(html),null);
});

test('a partial recipe is review-only and cannot be applied to dose/yield form fields',()=>{
 const fields={name:{value:'',dispatchEvent(){}},dose_g:{value:'18'},yield_g:{value:'36'}};
 const result={ok:true,fields:{name:'Geometry'},roaster_recipe:partial};
 assert.deepEqual(applyCoffeeUrlFields({elements:{namedItem:key=>fields[key]||null}},result),{filled:1,skipped:0});
 assert.equal(fields.name.value,'Geometry');assert.equal(fields.dose_g.value,'18');assert.equal(fields.yield_g.value,'36');
 const markup=coffeeUrlPreviewMarkup({...result,roaster_recipe:{...partial,temperature:'<script>untrusted</script>'}});
 assert.doesNotMatch(markup,/<script>/);assert.match(markup,/&lt;script&gt;/);
});
