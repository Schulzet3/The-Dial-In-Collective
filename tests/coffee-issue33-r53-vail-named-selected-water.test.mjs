// Original603 #591 exact selected source-shaped own named-water-decaf provenance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.vailcoffee.com/products/reserve-coffee-4';
const name='Decaf Ethiopian Yirgacheffe SW';
const first='Ethiopia FTO Natural Yirgacheffe Swiss Water Process Decaf is sourced from one of the most prized coffee origins in the entire world.';
const second='The Swiss Water Process is an environmentally friendly, chemical-free way to produce coffee that is 99.9% caffeine-free.';
const own=()=>'<p>Grower: Oromia Coffee Farmers Cooperative<br>Process: Full natural &amp; dried on raised beds</p>'+
 '<p>'+first+'</p><p>'+second+'</p>';
const page=(title=name,body=own(),outside='',seo='')=>'<html><head><meta property="og:type" content="product">'+seo+'</head><body><main>'+
 '<article class="product"><h1>'+title+'</h1><div class="product__description">'+body+
 '</div></article>'+outside+'</main></body></html>';
const parse=(title=name,body=own(),outside='',seo='')=>extractPublicCoffeeFacts(page(title,body,outside,seo),{source_url:url});
test('selected self-named SW process is water decaffeination, not Natural green processing',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Natural');
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&f.source_type==='html'&&
   f.value.includes('Swiss Water Process Decaf')));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}).published_source_information.some(f=>
   f.field==='decaffeination_method'&&f.value.includes('Swiss Water Process Decaf')));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});
test('unrelated coffee identity, missing SW, nondecaf, half caf or two H1 cannot inherit source',()=>{
 for(const title of ['Decaf Ethiopian Sidamo SW','Decaf Kenyan Yirgacheffe SW',
  'Decaf Ethiopian Yirgacheffe','Ethiopian Yirgacheffe SW','Half-Caf Ethiopian Yirgacheffe SW']){
  assert.equal(parse(title).fields?.decaffeination_method,undefined,title);
 }
 assert.equal(parse(name,own()+'<h1>Another Coffee</h1>').fields?.decaffeination_method,undefined);
});
test('SEO, related SKU, FAQ, earlier lot, negation and incomplete source fail closed',()=>{
 for(const intro of [
  first.replace(' is sourced from',' was previously sourced from'),
  first.replace('Swiss Water Process Decaf','Mountain Water Process Decaf'),
  first.replace('Swiss Water Process Decaf','Swiss Water Decaf'),
  first.replace('Swiss Water Process Decaf','Washed Process Decaf'),
  'The Swiss Water Process is an environmentally friendly, chemical-free treatment.'
 ]){
  assert.equal(parse(name,'<p>'+intro+'</p>').fields?.decaffeination_method,undefined,intro);
 }
 assert.equal(parse(name,'<p>Natural processed.</p>',
  '<section class="product-recommendations"><p>'+first+'</p></section>').fields?.decaffeination_method,undefined);
 assert.equal(parse(name,'<p>Natural processed.</p>','',
  '<meta name="description" content="'+first+'">').fields?.decaffeination_method,undefined);
 assert.equal(parse(name,'<p>Natural processed.</p><h2>Frequently Asked Questions</h2><p>'+first+'</p>')
  .fields?.decaffeination_method,undefined);
});
test('explicit contrary selected decaf method keeps canonical method blank',()=>{
 const r=parse(name,own()+'<p>Decaffeination Method: Sugar Cane EA</p>');
 assert.equal(r.fields?.decaffeination_method,undefined,JSON.stringify(r.fields));
});
