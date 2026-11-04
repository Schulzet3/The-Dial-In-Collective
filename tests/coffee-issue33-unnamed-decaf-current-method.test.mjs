// Original603 #97 exact selected coffee self-declares decaf without H1 "Decaf".
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const src='https://coffee-example.com/products/brazil-arabela';
const parse=(name,body,head='')=>extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product">'+head+'</head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>',{source_url:src});
const claim='Sourced from Brazil’s Mogiana region, this medium roast single origin decaf coffee showcases dedicated farmers’ craftsmanship.';
const method="Dekáf'd by way of Swiss Water® Process";
test('direct current self-decaf and named treatment produce Water Process in Add Coffee',()=>{
 const r=parse('Brazil Arabela','<p>'+claim+'</p><p>'+method+'</p>');
 assert.equal(r.ok,true);assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,undefined);
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
 assert.ok(r.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value===method));
});
test('method without selected current decaf identity, or identity without method, stays blank',()=>{
 for(const body of ['<p>'+method+'</p>','<p>'+claim+'</p>',
  '<p>Another coffee is decaf.</p><p>'+method+'</p>'])
  assert.equal(parse('Brazil Arabela',body).fields.decaffeination_method,undefined,body);
});
test('generic site, related products, education, historical and SEO do not provide method',()=>{
 for(const body of [
  '<p>'+claim+'</p><nav>All our coffees use Swiss Water® Process</nav>',
  '<p>'+claim+'</p><section class="product-recommendations"><h2>Other coffees</h2><p>'+method+'</p></section>',
  '<p>'+claim+'</p><section><h2>What is Swiss Water decaffeination?</h2><p>'+method+'</p></section>',
  '<p>'+claim+'</p><p>Previously '+method+'</p>',
  '<p>'+claim+'</p><p>Another coffee is decaffeinated by way of Swiss Water Process.</p>'
 ])assert.equal(parse('Brazil Arabela',body).fields.decaffeination_method,undefined,body);
 assert.equal(parse('Brazil Arabela','<p>'+claim+'</p>','<meta name="description" content="Swiss Water Process">').fields.decaffeination_method,undefined);
});
test('mixed caffeine title and contradictory current methods fail closed',()=>{
 for(const name of ['Brazil Arabela Half-Caf','Brazil Arabela Quarter-Caf'])
  assert.equal(parse(name,'<p>'+claim+'</p><p>'+method+'</p>').fields.decaffeination_method,undefined);
 const r=parse('Brazil Arabela','<p>'+claim+'</p><p>'+method+'</p><p>Decaf\'d by way of Sugar Cane Process</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
 const facts=(r.source_facts||[]).filter(f=>f.field==='decaffeination_method');
 assert.equal(facts.length,2);assert.ok(facts.every(f=>f.conflicting));
});
test('rule is generic to a different directly selected name, not URL-specific',()=>{
 assert.equal(parse('Another Selected Coffee','<p>'+claim+'</p><p>'+method+'</p>').fields.decaffeination_method,'Water Process');
});

test('real selected Shopify product info accordion current method is in summary title span, not p',()=>{
 const body='<div class="product__info-container"><h1>Brazil Arabela</h1>'+
  '<div class="product__description rte"><p>'+claim+'</p></div>'+
  '<accordion-tab><details><summary><span class="summary__title">'+
  '<span class="accordion__title">Dekáf&#39;d by way of Swiss Water® Process</span>'+
  '</span></summary><div class="accordion__content"><p>Swiss Water uses water and time.</p></div></details></accordion-tab></div>';
 const r=extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product"></head>'+
  '<body><main>'+body+'</main></body></html>',{source_url:src});
 assert.equal(r.ok,true);assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,undefined);
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});
test('accordion method from unrelated recommendation outside selected product container is rejected',()=>{
 const body='<div class="product__info-container"><h1>Brazil Arabela</h1><p>'+claim+'</p></div>'+
  '<section class="product-recommendations"><h2>Other coffees</h2><div class="product__info-container">'+
  '<details><summary><span class="accordion__title">'+method+'</span></summary></details></div></section>';
 const r=extractPublicCoffeeFacts('<main>'+body+'</main>',{source_url:src});
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('standalone accordion treatment without same-container selected self-decaf is rejected',()=>{
 const body='<div class="product__info-container"><h1>Brazil Arabela</h1>'+
  '<p>This coffee is a regular caffeinated medium roast.</p>'+
  '<details><summary><span class="accordion__title">'+method+'</span></summary></details></div>';
 const r=extractPublicCoffeeFacts('<main>'+body+'</main>',{source_url:src});
 assert.equal(r.fields.decaffeination_method,undefined);
});
