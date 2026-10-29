// Issue #33: selected decaf method in exact current product prose, never site SEO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://leapcoffeeroasters.com/products/decaf-coffee';
const page=(name,body)=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body)=>extractPublicCoffeeFacts(page(name,body),{source_url});
const official='The SWISS WATER® Process is a 100% chemical free decaffeination process '+
 'that delivers coffee that is caffeine-free while protecting the unique origin characteristics and flavor.';

test('actual current Leap Decaf Coffee selected prose identifies Water Process in Add Coffee',()=>{
 const result=parse('Decaf Coffee','<p>'+official+'</p>'+
  '<p>Tasting Notes: characteristically smooth, mellow, and sweet, with a slight caramel note and pleasant acidity.</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Water Process');
 assert.equal(result.fields.process,undefined,'decaffeination is not green-coffee processing');
 assert.match(coffeeUrlPreviewMarkup(result),/Water Process/);
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value===official));
});
for(const [statement,expected] of [
 ['Our decaf coffee is decaffeinated using the Swiss Water process.','Water Process'],
 ['This coffee is decaffeinated using Sugar Cane EA.','Sugar Process'],
 ['Our decaf coffee is decaffeinated via supercritical carbon dioxide.','Carbon Dioxide (CO2)']
])test('bounded selected current method: '+expected,()=>{
 const result=parse('Selected Decaf','<p>'+statement+'</p>');
 assert.equal(result.fields.decaffeination_method,expected);
 assert.equal(result.fields.process,undefined);
});
test('unrelated regular and half-caf products cannot receive full decaf method',()=>{
 for(const name of ['Regular Colombia','Half-Caf Blend']){
  const result=parse(name,'<p>'+official+'</p>'+
   '<p>Our decaf coffee is decaffeinated using Swiss Water.</p>');
  assert.equal(result.fields.decaffeination_method,undefined,name);
 }
});
test('product education, not current coffee evidence, cannot donate a method',()=>{
 const result=parse('Selected Decaf','<p>Delicious daily decaf.</p>'+
  '<section><h2>What is Swiss Water decaffeination?</h2><p>'+official+'</p></section>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('related product card cannot donate its decaf method',()=>{
 const result=parse('Selected Decaf','<p>Sweet balanced decaf coffee.</p>'+
  '<section class="product-recommendations"><h2>Other coffees</h2><p>'+official+'</p></section>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('generic method background, unspecified decaf and past-lot references are not proof',()=>{
 for(const statement of [
  'The Swiss Water Process is a chemical-free decaffeination process.',
  'Our other coffees use Swiss Water decaffeination.',
  'Last year our coffee was decaffeinated using Swiss Water.',
  'Our decaf coffee is not decaffeinated with Swiss Water.'
 ]){
  const result=parse('Selected Decaf','<p>'+statement+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,statement);
 }
});
test('two contradictory current decaf method statements are withheld with raw evidence',()=>{
 const result=parse('Selected Decaf',
  '<p>Our decaf coffee is decaffeinated using Swiss Water.</p>'+
  '<p>This coffee is decaffeinated using Sugar Cane EA.</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 const raw=result.source_facts?.filter(f=>f.field==='decaffeination_method')||[];
 assert.equal(raw.length,2);
 assert.ok(raw.every(f=>f.conflicting===true));
});
test('unrelated selected coffee title blocks direct decaf prose',()=>{
 const result=parse('Everyday Blend','<p>'+official+'</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('exact selected coffee repeated H1 remains eligible after PR255',()=>{
 const html='<main><h1>Decaf Coffee</h1><h1>Decaf Coffee</h1><p>'+official+'</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(result.fields.decaffeination_method,'Water Process');
});
