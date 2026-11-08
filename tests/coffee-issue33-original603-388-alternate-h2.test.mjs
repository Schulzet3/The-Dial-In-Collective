import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProductHeadings,selectedProductFormH2} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {sameHandleCollectionAlternate,identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
const original='https://topecacoffee.com/products/costa-rica-las-lajas-honey';
const alternate='https://topecacoffee.com/collections/coffee/products/costa-rica-las-lajas-honey';
const title='Costa Rica Las Lajas Honey';
const body='This is a remarkably clean honey process coffee, with sparkling complex acidity and a honey graham cracker finish.';
const form=(t=title,description=body,klass='product-form')=>
 '<form class="'+klass+'"><div class="product-form--block"><h2>'+t+'</h2>'+
 '</div><div class="product-form--block--description"><h3>'+description+'</h3></div></form>';
test('guarded same-handle official collection alternate with selected purchased H2 and direct description',()=>{
 assert.equal(sameHandleCollectionAlternate(original,alternate),alternate);
 const html='<main>'+form()+'<section class="faq"><h2>Frequently Asked Questions</h2></section></main>';
 assert.deepEqual(selectedProductHeadings(html),[]);
 assert.deepEqual(selectedProductFormH2(html),[title]);
 assert.equal(identicalCurrentSelectedTitle(title,selectedProductFormH2(html)[0],title),true);
 assert.equal(identicalCurrentSelectedTitle('Other Coffee',selectedProductFormH2(html)[0],title),false);
});
test('different host, product handle, ambiguous form H2, absent description, unrelated form and real H1 fail closed',()=>{
 for(const bad of ['https://othercoffee.com/collections/coffee/products/costa-rica-las-lajas-honey',
   'https://topecacoffee.com/collections/coffee/products/another-coffee'])
  assert.equal(sameHandleCollectionAlternate(original,bad),null);
 for(const html of [
  '<main><h2>'+title+'</h2><h3>'+body+'</h3></main>',
  '<main>'+form(title,body,'other-form')+'</main>',
  '<main>'+form(title,'short')+'</main>',
  '<main>'+form(title,body).replace('</form>','<h2>Another Coffee</h2></form>')+'</main>',
  '<main><h1>Other Coffee</h1>'+form()+'</main>',
  '<main><section class="related-products">'+form()+'</section></main>'.replace('class="product-form"','class="related-form"')
 ])assert.deepEqual(selectedProductFormH2(html),[],html.slice(0,200));
});
