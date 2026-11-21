// Issue #33 R386b: current exact #52 source-bound country water-treatment wording.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://example.test/products/decaf';
const name='Decaf | Mexico';
const own='This coffee from Mexico underwent its decaffination process using the Swiss Water Process. During this process, the green coffee is hydrated to expand the beans for caffeine extraction. Once the caffeine has been removed the green coffee is re-dried and re-bagged for transport, and the GCE is filtered of its caffeine through proprietary carbon filters and recycled to be used again.';
const card=(n=name,description=own,extra='',head='')=>'<html><head><meta property="og:site_name" content="Roaster">'+head+'</head><body><main><article class="product"><h1>'+n+'</h1><div class="product__info-container"><div class="product__description"><p>'+description+'</p><p><strong>Flavor Notes:</strong> milk chocolate - raw almond - black tea</p></div></div></article></main>'+extra+'</body></html>';
const parse=(n=name,description=own,extra='',head='')=>extractPublicCoffeeFacts(card(n,description,extra,head),{source_url:url});
test('current exact selected Mexico decaf full paragraph yields Water Process, not green process',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined);
 assert.notEqual(r.fields.origin,'Colombia');
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('standard spelling and another matching chosen country qualify without hardcoded roaster',()=>{
 for(const [n,t] of [
  [name,'This coffee from Mexico underwent its decaffeination process using the Swiss Water Process.'],
  ['Decaf | Costa Rica','This coffee from Costa Rica underwent its decaffination process using the Mountain Water Process.']
 ])assert.equal(parse(n,t).fields.decaffeination_method,'Water Process',n);
});
test('wrong country, regular coffee and half-caf cannot inherit current method',()=>{
 for(const n of ['Decaf | Colombia','Regular Mexico','Half-Caf | Mexico'])
  assert.equal(parse(n).fields.decaffeination_method,undefined,n);
 assert.equal(parse(name,'This coffee from Colombia underwent its decaffination process using the Swiss Water Process.').fields.decaffeination_method,undefined);
});
test('SEO, sibling, footer and unrelated education never supply selected current method',()=>{
 for(const [body,extra,head] of [
  ['Method unpublished.','','<meta name="description" content="'+own+'">'],
  ['Method unpublished.','<aside class="related-products"><p>'+own+'</p></aside>',''],
  ['Method unpublished.','<footer><p>'+own+'</p></footer>',''],
  ['Method unpublished.','<section><h2>Decaf Process Education</h2><p>'+own+'</p></section>','']
 ])assert.equal(parse(name,body,extra,head).fields.decaffeination_method,undefined);
});
test('negated, prior, other-coffee and hypothetical claims fail closed',()=>{
 for(const t of [
  'Previously, '+own,
  'This coffee from Mexico did not undergo decaffeination using Swiss Water Process.',
  own+' This method was used for another coffee.',
  own+' This was previously the treatment for this release.',
  'Hypothetically, '+own,
  own+' rather than Sugar Process'
 ])assert.equal(parse(name,t).fields.decaffeination_method,undefined,t);
});
test('opposing directly selected Sugar Process claim withholds method',()=>{
 const r=parse(name,own+'<p><strong>Decaffeination:</strong> Sugar Cane Process</p>');
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
});
test('absent selected H1 cannot grant method',()=>{
 const html=card().replace('<h1>'+name+'</h1>','');
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.fields?.decaffeination_method,undefined);
});
