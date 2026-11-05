import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Finca La Unica - Washed Honduras';
const url='https://subliminalcoffee.com/products/finca-la-unica-washed-honduras';
function parse({title=name,field='Region',region='Copan',opposite='',related=''}={}){
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
  '<main><article class="product"><h1>'+title+'</h1>'+
  '<div class="product__description"><h2>Coffee Info</h2>'+
  '<p><strong>'+field+':</strong> '+region+'</p><p><strong>Process:</strong> Washed</p>'+
  (opposite?'<p><strong>Country:</strong> '+opposite+'</p>':'')+
  '</div></article>'+related+'</main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('exact selected farm H1 Honduras plus directly labeled Region Copan in Add Coffee',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);assert.equal(r.fields.origin,'Copan, Honduras',JSON.stringify(r));
 assert.equal(r.fields.process,'Washed');
 assert.match(coffeeUrlPreviewMarkup(r),/Copan, Honduras/);
 assert.ok(!r.conflicts?.includes('origin'));
});
test('no country from a farm name, roast, missing title or non-country suffix',()=>{
 for(const title of ['Finca La Unica','Finca La Unica - Dark Honduras',
  'Finca La Unica - Washed','Finca La Unica - Washed Blend',
  'Finca La Unica - Washed Guatemala']){
  const r=parse({title});assert.equal(r.ok,true,JSON.stringify(r));
  assert.notEqual(r.fields.origin,'Copan, Honduras',title);
 }
});
test('unselected region, country, or unrelated facts are not region witnesses',()=>{
 for(const field of ['Producer','Farm','Origin','Marketing']){
  const r=parse({field});assert.notEqual(r.fields.origin,'Copan, Honduras',field);
 }
 for(const region of ['Guatemala','Copan, Honduras','Copan, Guatemala']){
  const r=parse({region});assert.notEqual(r.fields.origin,'Copan, Honduras',region);
 }
});
test('an opposing directly labeled Country prevents unconditional country promotion',()=>{
 const r=parse({opposite:'Guatemala'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.origin,'Copan, Honduras');
});
test('unrelated related coffee cannot contribute the H1 country',()=>{
 const related='<section class="product-recommendations"><h3>Finca Other - Washed Honduras</h3><p>Region: Copan</p></section>';
 const r=parse({title:'Finca La Unica',related});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.origin,'Copan, Honduras');
});
