// Issue33 original603 #191: selected Buncho station versus founder's older Girja station.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://laterzacoffee.com/products/ethiopia-sidama-buncho-honey-processed';
const selected='Buncho washing station is located in the Sidama of Ethiopia.';
const biography='His dream became a reality by setting up his first ever washing station in Girja village, less than a mile from his parents’ house with other co-founders holding a major share in 1997 and another washing station in Eltama 30kms away from Girja a year after.';
const name='Ethiopia Sidama Buncho (Honey Processed)';
const parse=(product,body,head='')=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product">'+head+'</head><body><main><article class="product"><h1>'+product+'</h1><div class="product__description">'+body+'</div></article></main></body></html>',
 {source_url:url});
test('#191 directly printed selected Buncho location outranks founder history',()=>{
 const r=parse(name,'<p>Brown sugar, pear & candied mango</p><p>'+selected+'</p><p>'+biography+'</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Sidama, Ethiopia',JSON.stringify(r.fields));
 assert.notEqual(r.fields.origin,'Girja, Ethiopia');
 assert.equal(r.fields.process,'Honey');
});
test('historical first station without current lot cannot donate origin',()=>{
 const r=parse(name,'<p>'+biography+'</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.doesNotMatch(r.fields.origin||'',/Girja/i,JSON.stringify(r.fields));
});
test('another selected coffee cannot inherit the Buncho location',()=>{
 const r=parse('Ethiopia Moonrise Honey','<p>'+selected+'</p><p>'+biography+'</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.origin,'Sidama, Ethiopia',JSON.stringify(r.fields));
 assert.doesNotMatch(r.fields.origin||'',/Girja/i);
});
test('historical SEO cannot overwrite directly selected station region',()=>{
 const r=parse(name,'<p>'+selected+'</p><p>'+biography+'</p>',
  '<title>Previous Ethiopia Girja coffee</title><meta name="description" content="Previous Ethiopia Girja coffee sold out">');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Sidama, Ethiopia',JSON.stringify(r.fields));
});
test('unrelated station must not supply region to other selected coffee',()=>{
 const r=parse('Ethiopia Sidama Honey','<p>Some other washing station is located in the Guji of Ethiopia.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.origin,'Guji, Ethiopia',JSON.stringify(r.fields));
});
