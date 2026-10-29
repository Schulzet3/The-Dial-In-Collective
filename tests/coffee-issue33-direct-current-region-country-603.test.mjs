// Source-backed Issue33: official Quartermaine current-coffee prose has an
// explicit region/country tuple. Never store a mountain intro or repeated
// intermediate context in Add Coffee Origin. No URL-specific rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {extractCoffeeIdentityEvidence,extractCoffeeGeographyTuples} from '../src/server/coffee-identity-evidence.mjs';
const url='https://roaster.example/products/selected-coffee';
const read=(name,body)=>{
 const html='<main><h1>'+name+'</h1>'+body+'</main>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,name);
 return {result,html};
};
const cases=[
 ['Colombia',
  "From the Andes Mountains in Colombia's Huila region, this coffee is a rare find. Shade grown, sun dried, and beautifully prepared, this high-altitude coffee offers more than enough flavor and acidity to stand up to our deep signature roast. 100% Typica (an heirloom variety of the Arabica species), it boasts penetrating acidity and notes of caramel.",
  'Huila, Colombia'],
 ['Costa Rica',
  'From the Tarrazu region of Costa Rica, this coffee opens with a floral aroma. Our signature roast marries its medium body with bright acidity, notes of baking chocolate, and hints of citrus rind on the finish.',
  'Tarrazu, Costa Rica']
];
for(const [name,prose,expected] of cases){
 test('actual current selected description supplies correct Add Coffee origin: '+name,()=>{
  const {result,html}=read(name,'<p>'+prose+'</p>');
  assert.equal(result.fields.origin,expected,'direct region-country should win over mountain/general intro');
  assert.ok(!result.conflicts?.includes('origin'),'current product facts agree');
  assert.ok(coffeeUrlPreviewMarkup(result).includes(expected),'public preview shows corrected location');
  assert.ok(result.source_facts?.some(f=>String(f.value||'').includes(prose.split('.')[0])),
   'original published prose retained for member source review');
  const facts=extractCoffeeIdentityEvidence(html,{name});
  assert.ok(facts.facts.some(f=>f.label==='Origin'&&f.value===expected),
   'actual selected source identity extractor emits exact direct tuple');
 });
}
test('new rule is generic: another country and an unfamiliar stated region are preserved without lookup',()=>{
 const {result}=read('Current Coffee',
  '<p>From the Imaginary Highlands region of Ecuador, this coffee has pronounced sweetness.</p>');
 assert.equal(result.fields.origin,'Imaginary Highlands, Ecuador');
});
test('different explicit Country contradicts current-prose origin and must require member review',()=>{
 const {result}=read('Current Coffee','<p>Country: Peru</p>'+
  '<p>From the Tarrazu region of Costa Rica, this coffee opens with a floral aroma.</p>');
 assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));
});
test('older, unrelated and educational origins cannot donate places',()=>{
 for(const line of [
  'Other coffees come from the Tarrazu region of Costa Rica, this coffee is elsewhere.',
  'Previously, from the Tarrazu region of Costa Rica, this coffee was imported.',
  'From the Tarrazu region of Costa Rica, other coffees may have floral aromas.'
 ]){
  const {result}=read('Current Coffee','<p>'+line+'</p>');
  assert.ok(!String(result.fields.origin||'').includes('Tarrazu'),line);
 }
});
test('bare mountain, unnamed regions and geography-free marketing do not create an origin',()=>{
 for(const line of [
  'From the Andes Mountains in Colombia, this coffee is a rare find.',
  'From the region of Costa Rica, this coffee opens with sweetness.',
  'From the Seasonal Blend region of Costa Rica, this coffee is delicious.'
 ]){
  const {result}=read('Current Coffee','<p>'+line+'</p>');
  assert.notEqual(result.fields.origin,'Seasonal Blend, Costa Rica',line);
  assert.ok(!/From the Andes|From the region/.test(result.fields.origin||''),line);
 }
});
test('explicitly different direct source countries cannot be merged with a country inferred from mountain name',()=>{
 const {result}=read('Current Coffee','<p>Country: Ethiopia</p>'+
  "<p>From the Andes Mountains in Colombia's Huila region, this coffee is a rare find.</p>");
 assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));
});
test('related-product prose remains out of selected coffee source facts',()=>{
 const {result}=read('Current Coffee','<p>Country: Colombia</p>'+
  '<section class="product-recommendations"><h3>Costa Rica</h3>'+
  '<p>From the Tarrazu region of Costa Rica, this coffee has a floral aroma.</p></section>');
 assert.equal(result.fields.origin,'Colombia');
});
