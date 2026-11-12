import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWakeChecks} from '../scripts/audit/issue33-r87-wake-403-405-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own={
 403:'Celebrating the heart and soul of Ambler. Crafted with Latin-American beans, Ambler offers a light-bodied, spirited coffee experience.',
 404:'The Keasbey and Mattison company inspired Bromo. Our espresso blend crafted from select Central American and Indonesian beans delivers a robust caramel flavor.',
 405:'Our Mountain Water Decaf Beans undergo a 100% chemical-free decaffeination process. Tasting notes: herbal, dark chocolate, medium body. Latin American, Indonesian and African Blend.'
};
const names={403:'Ambler Blend',404:'Bromo',405:'Mountain Water Decaf'};
const urls={403:'https://wakecoffee.com/products/ambler-blend',404:'https://wakecoffee.com/products/bromo-blend',405:'https://wakecoffee.com/products/decaf'};
const markup=(number,story=own[number],extra='')=>'<main><article class="product"><h1>'+names[number]+'</h1><div class="product__description">'+story+'</div></article></main>'+extra;
for(const n of [403,404,405]){
 test('#'+n+' exact selected story and heading contract',()=>{
  const r=selectedWakeChecks(n,markup(n),[names[n]]);
  assert.equal(r.uniqueSelected,true);assert.equal(r.ownDescription,true);assert.ok(r.ownSourcePhrases.every(Boolean));
 });
 test('#'+n+' absent or duplicate selected identity must fail',()=>{
  assert.equal(selectedWakeChecks(n,markup(n),[]).uniqueSelected,false);
  assert.equal(selectedWakeChecks(n,markup(n),[names[n],names[n]]).uniqueSelected,false);
  assert.equal(selectedWakeChecks(n,markup(n),['other coffee']).uniqueSelected,false);
 });
 test('#'+n+' absent own product prose cannot be rescued by navigation or review',()=>{
  const s=markup(n,'','<nav>'+own[n]+'</nav><aside>'+own[n]+'</aside><footer>'+own[n]+'</footer><script>'+own[n]+'</script>');
  assert.equal(selectedWakeChecks(n,s,[names[n]]).ownDescription,false);
 });
 test('#'+n+' selected product loss of direct phrase fails closed',()=>{
  const a=own[n].replace(n===403?'light-bodied, spirited coffee experience':n===404?'robust caramel flavor':'Latin American, Indonesian and African Blend','NOT PUBLISHED');
  assert.equal(selectedWakeChecks(n,markup(n,a),[names[n]]).ownDescription,false);
 });
}
test('Ambler light-bodied describes mouthfeel, not a published Light roast',()=>{
 const r=extractPublicCoffeeFacts(markup(403),{source_url:urls[403]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.roast_level,'Light',JSON.stringify(r.fields));
});
test('Bromo consumer testimonial Dark roast cannot supply selected product roast',()=>{
 const r=extractPublicCoffeeFacts(markup(404,own[404],'<section class="reviews"><h2>Customer reviews</h2><p>Love the dark roasts</p></section>'),{source_url:urls[404]});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.roast_level,'Dark',JSON.stringify(r.fields));
});
test('Decaf medium body cannot be inferred as Medium roast',()=>{
 const r=extractPublicCoffeeFacts(markup(405),{source_url:urls[405]});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.roast_level,'Medium',JSON.stringify(r.fields));
});
test('neighboring Bromo blend cannot contaminate Ambler origin',()=>{
 const r=extractPublicCoffeeFacts(markup(403,own[403],'<aside>Another coffee: Bromo, Indonesian beans, caramel</aside>'),{source_url:urls[403]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/indonesia/i.test(r.fields.origin||''),JSON.stringify(r.fields));
});

// R87 live failure: current exact H1 + its direct decaffeination paragraph
// were overlooked; bare titles, other beans and conflicting methods stay blank.
test('named water decaf current H1 plus its OWN chemical-free treatment sentence supports Water Process',()=>{

 const r=extractPublicCoffeeFacts(markup(405),{source_url:urls[405]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
});
test('named water decaf H1 alone or generic unrelated decaf copy is not treatment proof',()=>{
 for(const story of ['Tasting notes: herbal and chocolate.',
   'Our ordinary coffee beans undergo a 100% chemical-free decaffeination process.']){
  const r=extractPublicCoffeeFacts(markup(405,story),{source_url:urls[405]});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!r.fields.decaffeination_method,JSON.stringify(r.fields));
 }
});
test('named water decaf page with incompatible selected sugarcane treatment cannot choose Water Process',()=>{
 const story=own[405]+' Our Mountain Water Decaf Beans undergo sugarcane decaffeination process.';
 const r=extractPublicCoffeeFacts(markup(405,story),{source_url:urls[405]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
});
