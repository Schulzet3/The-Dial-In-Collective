// Issue #33: selected decaf method in exact current product prose, never site SEO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {selectedNamedCurrentDecafEvidence} from '../src/server/coffee-direct-product-prose.mjs';
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


const nativo='Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.';
test('selected exact named current decaf recovers Sugar Process from second sentence without borrowing Colombian origin',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>Savor the richness of world-class coffee without the caffeine kick. '+nativo+'</p>'+
  '<p>Notes: Sugar Cane, Chocolate, Creamy.</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
 assert.equal(result.fields.process,undefined,'decaffeination is not green-bean Natural processing');
 assert.equal(result.fields.origin,undefined,'decaffeination location is not a growing origin');
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value.includes(nativo)));
 assert.match(coffeeUrlPreviewMarkup(result),/Sugar Process/);
});
test('named current decaf evidence must match EXACT selected coffee, not another decaf or regular product',()=>{
 for(const name of ['Other Decaf, 12 oz','Regular Tranquilo','TRANQUILO, Half-Caf']){
  const result=parse(name,'<p>'+nativo+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,name);
 }
});
test('named current decaf method is not donated by past lot, unrelated current subject or education',()=>{
 for(const sentence of [
  'Previously, Tranquilo is decaffeinated using the natural Sugar Cane Process.',
  'Last year Tranquilo is decaffeinated using the natural Sugar Cane Process.',
  'Our other coffee is decaffeinated using the natural Sugar Cane Process.',
  'Tranquilo is naturally sweet, with notes of sugar cane.'
 ]){
  const result=parse('TRANQUILO, Decaffeinated, 12 oz','<p>'+sentence+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,sentence);
 }
 const educational=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<section><h2>What is decaffeination?</h2><p>'+nativo+'</p></section>');
 assert.equal(educational.fields.decaffeination_method,undefined);
});
test('named selected decaf conflicting current methods stay reviewable rather than arbitrary',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>'+nativo+'</p><p>Tranquilo is decaffeinated using Swiss Water.</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.equal(result.source_facts?.filter(x=>x.field==='decaffeination_method').length,2);
});


test('strict current exact H1 restores named decaf-method evidence after geography context isolation',()=>{
 const name='TRANQUILO, Decaffeinated, 12 oz';
 const paragraph='Savor the richness of world-class coffee without the caffeine kick. '+
  'Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia, '+
  'which preserves the bean cellular structure and flavor integrity unlike harsh chemical methods.';
 const current='<main><h1>'+name+'</h1><p>'+paragraph+'</p></main>';
 const dropped='<main><h1>'+name+'</h1></main>';
 const clean=html=>String(html).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 assert.deepEqual(selectedNamedCurrentDecafEvidence(dropped,{name,clean}),[]);
 const facts=selectedNamedCurrentDecafEvidence(current,{name,clean});
 assert.equal(facts.length,1);
 assert.match(facts[0],/Tranquilo is decaffeinated using the natural Sugar Cane Process/);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(current,{name:'Other Decaf',clean}),[]);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(current,{name:'TRANQUILO, Half-Caf',clean}),[]);
 for(const body of [
  'Our coffee is decaffeinated using Swiss Water.',
  'Previously, Tranquilo is decaffeinated using Swiss Water.',
  'Last year Tranquilo is decaffeinated using Swiss Water.',
  'Tranquilo is naturally sweet, with notes of sugar cane.'
 ])assert.deepEqual(selectedNamedCurrentDecafEvidence('<main><h1>'+name+'</h1><p>'+body+'</p></main>',{name,clean}),[],body);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(
  '<main><h1>'+name+'</h1><section class="product-recommendations"><p>'+paragraph+'</p></section></main>',
  {name,clean}),[],'related coffee prose cannot enter current selected product');
});
