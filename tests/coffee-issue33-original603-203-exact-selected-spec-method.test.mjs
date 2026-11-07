import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
// Source #203 current exact selected official raw html sha256:
// a3c287051152d634a569ae98ff49c9f5e33653e711ce2cd8f133b53bec0d806b
// Synthetic selected BR spec structure only; frozen oracle remains untouched.
const url='https://lostsockroasters.com/products/madre-laura-decaf-10oz';
const parse=(name,body,head='')=>extractPublicCoffeeFacts('<html><head>'+head+'</head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>',{source_url:url});
const spec=(method='Sugarcane')=>'<p style="white-space: pre-wrap;">'+
 '<strong>Process:</strong><span> Washed</span><br>'+
 '<span style="white-space: pre-wrap;"><b>Decaffeination</b></span>'+
 '<b style="white-space: pre-wrap;">: </b>'+method+'</p>';

test('selected decaf caption Sugarcane supplies Sugar Process separate from washed green coffee',()=>{
 const r=parse('DECAF, Colombia 10oz',spec());
 assert.equal(r.ok,true);
 assert.equal(r.fields.decaffeination_method,'Sugar Process');
 assert.equal(r.fields.process,'Washed');
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&/Sugarcane/.test(f.value)));
});

for(const [s,expected] of [['Swiss Water','Water Process'],['CO2 decaffeination','Carbon Dioxide (CO2)']]){
 test('selected explicit current decaf label '+s,()=>{
  const r=parse('Colombia Decaf',spec(s));
  assert.equal(r.fields.decaffeination_method,expected);
  assert.equal(r.fields.process,'Washed');
 });
}
test('regular and half-caf titles cannot receive this treatment',()=>{
 for(const n of ['Regular Colombia','Half-Caf Colombia'])
  assert.equal(parse(n,spec()).fields.decaffeination_method,undefined,n);
});
test('unselected SEO, related products, bare washing and flavor do not supply a method',()=>{
 const n='Colombia Decaf';
 assert.equal(parse(n,'<p>Process: Washed</p>','<meta name="description" content="Decaffeination: Sugarcane">').fields.decaffeination_method,undefined);
 assert.equal(parse(n,'<section class="product-recommendations"><h2>Other coffees</h2>'+spec()+'</section>').fields.decaffeination_method,undefined);
 assert.equal(parse(n,'<p>Process: Washed</p><p>Sugarcane sweetness.</p>').fields.decaffeination_method,undefined);
});
test('contradictory current printed decaffeination labels withhold autofill',()=>{
 const r=parse('Colombia Decaf',spec('Sugarcane')+spec('Swiss Water'));
 assert.equal(r.fields.decaffeination_method,undefined);
 const raw=r.source_facts.map(f=>String(f.value||'')).join(' ');
 assert.match(raw,/Sugarcane/);assert.match(raw,/Swiss Water/);
});
test('contradictory selected direct decaf prose and spec withhold autofill',()=>{
 const r=parse('Colombia Decaf',spec('Sugarcane')+'<p>This coffee is decaffeinated using Swiss Water.</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
