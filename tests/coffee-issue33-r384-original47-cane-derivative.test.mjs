// Issue #33 R384b: source-bound selected #47 sugar-cane derivative evidence, not SEO/other coffee/green Natural.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://cascadiaroasters.com/products/colombia-decaf';
const name='COLOMBIA DECAF';
const own='Ok, it is silly to be so excited about decaf, but we are. This is not only a great decaf, but it is an outstanding coffee. The decaffeination process uses a derivative of sugar cane which does not leave a chemical horse-hair flavor and aroma in most decafs. This process removes the majority of the caffeine while retaining the flavors of origin.';
const card=(n=name,description=own,extra='',head='')=>'<html><head><meta property="og:site_name" content="Cascadia Coffee Roasters">'+head+'</head><body><main><article class="product"><h1>'+n+'</h1><div class="product__description"><p><strong>Region:</strong> Tolima Region of Colombia</p><p><strong>Process:</strong> Washed</p><p><strong>Roast:</strong> Medium Roast</p><p><strong>Tasting Notes:</strong> Orange Peel and Sugar Cane</p><div class="tabs-content"><section id="tab2"><h2>Why We Love It</h2><p>'+description+'</p></section></div></div></article></main>'+extra+'</body></html>';
const parse=(n=name,description=own,extra='',head='')=>extractPublicCoffeeFacts(card(n,description,extra,head),{source_url:url});
test('exact selected decaf own affirmative sugar-cane derivative earns Sugar Process, preserves Washed',()=>{
 const r=parse();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.decaffeination_method,'Sugar Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
 assert.notEqual(r.fields.process,'Natural');
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('tasting-only sugar cane is flavor, never proof of decaffeination chemistry',()=>{
 const r=parse(name,'This coffee tastes of Orange Peel and Sugar Cane.');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('SEO-only, unrelated sibling and storewide education must not fill selected method',()=>{
 const sentence=own;
 for(const options of [
  {description:'Medium roast, method unpublished.',head:'<meta name="description" content="'+sentence+'">'},
  {description:'Medium roast, method unpublished.',extra:'<aside class="related-products"><h2>Other Decaf</h2><p>'+sentence+'</p></aside>'},
  {description:'Medium roast, method unpublished.',extra:'<footer><p>'+sentence+'</p></footer>'}
 ]){
  const r=parse(name,options.description,options.extra||'',options.head||'');
  assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(options));
 }
});
test('nondecaf selected coffee and half-caf never borrow current cane derivative',()=>{
 for(const n of ['COLOMBIA HOUSE','HALF-CAF COLOMBIA'])assert.equal(parse(n).fields.decaffeination_method,undefined,n);
});
test('historical, different coffee, and negated selected claims fail closed',()=>{
 for(const claim of [
  'We previously sold another coffee. '+own,
  'This is not a decaf. The decaffeination process uses a derivative of sugar cane.',
  'This is our decaf. The decaffeination process does not use a derivative of sugar cane.',
  'This is our decaf. The decaffeination process uses a derivative of sugar cane only for another coffee.'
 ])assert.equal(parse(name,claim).fields.decaffeination_method,undefined,claim);
});
test('same selected full decaf opposing water-method caption remains reviewable, not chosen',()=>{
 const r=parse(name,own+'<p><strong>Decaffeination:</strong> Swiss Water Process</p>');
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r));
});
test('missing selected H1 must not grant current selected derivative evidence',()=>{
 const r=extractPublicCoffeeFacts(card().replace('<h1>'+name+'</h1>',''),{source_url:url});
 assert.equal(r.fields?.decaffeination_method,undefined,JSON.stringify(r.fields));
});
