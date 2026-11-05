// Issue #33 original603 #361: direct current named-source Sugarcane decaf prose.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://subterracoffee.com/products/decaf-colombia-sugarcane-medium-roast';
const selected='decaf colombia sugarcane medium roast';
const livePhrase='-a medium roast version of our hit sugarcane decaf Colombia decaf. '
 + '-delicious rich chocolatey Colombia made with the sugarcane decaffeination process. '
 + '-rich decaf roast with loads of cocoa, nut, and browned sugar notes.';
const make=(name=selected,description=livePhrase,extra='')=>
 extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product"></head><body>'
  + '<main><article class="product"><h1>'+name+'</h1>'
  + '<div class="product__description"><p>'+description+'</p></div></article>'+extra+'</main>'
  + '</body></html>',{source_url:url});

test('#361 selected current named Colombia made with sugarcane decaffeination is Sugar Process, not green processing',()=>{
 const r=make();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Sugar Process',JSON.stringify(r.fields));
 assert.equal(r.fields.roast_level,'Medium',JSON.stringify(r.fields));
 assert.notEqual(r.fields.process,'Natural',JSON.stringify(r.fields));
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/i);
});

test('#361 different named source coffee must not donate selected method',()=>{
 const r=make('decaf colombia medium roast',
  'Peru made with the sugarcane decaffeination process. Selected Colombian decaf is bright.');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
});

test('#361 nondecaf and halfcaf selected H1 never gain a method from nearby sugarcane decaf prose',()=>{
 for(const name of ['colombia medium roast','colombia half-caf roast']){
  const r=make(name,'Colombia made with the sugarcane decaffeination process.');
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 }
});

test('#361 historical and unrelated-product decaf processes do not count as selected current method',()=>{
 for(const phrase of [
  'Previously Colombia made with the sugarcane decaffeination process.',
  'Our other coffee Colombia made with the sugarcane decaffeination process.'
 ]){
  const r=make('decaf colombia medium roast',phrase);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 }
});

test('#361 sugarcane taste alone is not decaffeination-method evidence',()=>{
 const r=make('decaf colombia medium roast','The coffee has sugarcane and chocolate tasting notes.');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
});

test('#361 incompatible current named Water/Sugar decaf claims remain blank',()=>{
 const r=make('decaf colombia medium roast',
  'Colombia made with the sugarcane decaffeination process. '
  +'Colombia made with the swiss water decaffeination process.');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
});
