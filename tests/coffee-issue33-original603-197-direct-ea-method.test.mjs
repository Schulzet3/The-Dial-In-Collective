import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
// Current selected official original603 #197 raw HTML sha256:
// 520d5a2ac42235c722c47fcf8b72c0c0fce2c5946bc7c8a1501df10d17d85924
// Bounded synthetic cases, not a modification of the frozen603 source.
const url='https://lionrushcoffee.com/products/huila-decaf-sugarcane';
const name='HUILA DECAF — SUGARCANE PROCESS';
const method='Then the sugarcane part. The caffeine is removed with ethyl acetate — a natural compound made from fermented Colombian sugarcane, the same one found in ripe bananas. The beans are steamed to open their pores, bathed until the caffeine bonds out, then steamed again until only coffee is left. No harsh industrial solvents. The flavor stays. The caffeine doesn’t.';
const parse=(n,body)=>extractPublicCoffeeFacts('<main><h1>'+n+'</h1>'+body+'</main>',{source_url:url});
test('selected direct EA removal from sugarcane identifies Sugar Process separate from Washed',()=>{
 const r=parse(name,'<section><h2>The story behind this drop</h2><p>'+method+'</p><p>Process: Washed</p></section>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.decaffeination_method,'Sugar Process');
 assert.equal(r.fields.process,'Washed');
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&/caffeine is removed with ethyl acetate/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('selected regular and half caf cannot inherit source treatment',()=>{
 for(const n of ['Regular Huila','Huila Half-Caf'])assert.equal(parse(n,'<p>'+method+'</p>').fields.decaffeination_method,undefined,n);
});
test('past, other lot, educational and related product cannot donate method',()=>{
 for(const line of ['Previously, '+method,'Our other coffee: '+method,'The caffeine is NOT removed with ethyl acetate from sugarcane.','The caffeine is removed with ethyl acetate, not from sugarcane.']){
  assert.equal(parse(name,'<p>'+line+'</p>').fields.decaffeination_method,undefined,line);
 }
 assert.equal(parse(name,'<h2>What is sugarcane decaffeination?</h2><p>'+method+'</p>').fields.decaffeination_method,undefined);
 assert.equal(parse(name,'<section class="product-recommendations"><h2>Other coffees</h2><p>'+method+'</p></section>').fields.decaffeination_method,undefined);
});
test('EA alone, tasting sugarcane and water for processing never prove the selected method',()=>{
 for(const line of ['The caffeine is removed with ethyl acetate at the plant.','Sugarcane sweetness with caramel.','Washed with mountain water before roasting.']){
  assert.equal(parse(name,'<p>'+line+'</p>').fields.decaffeination_method,undefined,line);
 }
});
test('different current Swiss Water method alongside direct EA leaves both review-only',()=>{
 const r=parse(name,'<p>'+method+'</p><p>This coffee is decaffeinated using Swiss Water.</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
 const facts=r.source_facts.filter(f=>f.field==='decaffeination_method');
 assert.ok(facts.length>=2);
 assert.ok(facts.every(f=>f.conflicting===true));
});
