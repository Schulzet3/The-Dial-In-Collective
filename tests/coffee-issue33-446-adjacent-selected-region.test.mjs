// Issue33 original603 #446: exact selected current Blue Jazz named growing
// region, two adjacent sentences and explicit measured source; no inference.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedAdjacentGrowingRegion} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Guatemala - El Scorpion';
const url='https://www.bluejazzcoffee.com/products/guatemala-el-scorpion';
const country='This is a sweet and medium-light roast offering from Guatemala.';
const measured='More specifically, a washed Caturra and Bourbon varietal grown at 1500-1700 meters above sea level from the lake Atitlan region.';
const notes='We have found flavor notes of cherry cola, lime and molasses.';
const body=[country,measured,notes].join(' ');
const fixture=(title=name,prose=body,extra='')=>
 '<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+
 title+'</h1><div class="product-description"><p>'+prose+'</p></div></article></main>'+extra+'</body></html>';
const parse=(title=name,prose=body,extra='')=>
 extractPublicCoffeeFacts(fixture(title,prose,extra),{source_url:url});
const blocks=(prose=body,title=name)=>[{tag:'h1',text:title},{tag:'p',text:prose,section:'Selected product'}];

test('adjacent exact selected measured growing region refines country and preserves fields',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,name);
 assert.equal(p.fields.origin,'Lake Atitlan, Guatemala',JSON.stringify(p));
 assert.equal(p.fields.process,'Washed');
 assert.equal(p.fields.roast_level,'Medium-Light');
 assert.match(p.fields.tasting_notes,/cherry cola/i);
 assert.match(coffeeUrlPreviewMarkup(p),/Lake Atitlan/);
});
test('pure source-bound parser yields the printed region and H1 country',()=>{
 const v=selectedAdjacentGrowingRegion(blocks(),{name,origin:'Guatemala'});
 assert.equal(v?.value,'Lake Atitlan, Guatemala');assert.match(v.quote,/1500-1700 meters/);
});
test('no invented locality from country-only or missing measured growing specification',()=>{
 for(const prose of [country,notes,country+' More specifically, these beans have balanced taste.',
   country+' More specifically, a washed variety from the lake Atitlan region.'])
 assert.equal(selectedAdjacentGrowingRegion(blocks(prose),{name,origin:'Guatemala'}),null,prose);
});
test('different country or already-specific origin is never overwritten',()=>{
 assert.equal(selectedAdjacentGrowingRegion(blocks(body.replace('from Guatemala','from Kenya')),{name,origin:'Guatemala'}),null);
 assert.equal(selectedAdjacentGrowingRegion(blocks(),{name,origin:'Antigua, Guatemala'}),null);
 assert.notEqual(parse('Kenya - El Scorpion').fields.origin,'Lake Atitlan, Kenya');
});
test('unrelated product and missing or competing selected H1 are rejected',()=>{
 assert.equal(selectedAdjacentGrowingRegion(blocks(body,'Guatemala - Other Coffee'),{name,origin:'Guatemala'}),null);
 assert.equal(selectedAdjacentGrowingRegion([{tag:'p',text:body}],{name,origin:'Guatemala'}),null);
 assert.equal(selectedAdjacentGrowingRegion([...blocks(),{tag:'h1',text:'Another Coffee'}],{name,origin:'Guatemala'}),null);
 const p=parse(name,country+' '+notes,'<aside><h1>Guatemala - Other</h1><p>'+measured+'</p></aside>');
 assert.notEqual(p.fields.origin,'Lake Atitlan, Guatemala');
});
test('historical, hypothetical, unrelated and national-general provenance fail closed',()=>{
 for(const prose of [
  country+' More specifically, a previous washed Caturra and Bourbon varietal grown at 1500-1700 meters above sea level from the lake Atitlan region.',
  country+' More specifically, another washed Caturra and Bourbon varietal grown at 1500-1700 meters above sea level from the lake Atitlan region.',
  'Previously '+country+' '+measured,
  'Our shop is in Guatemala. '+measured,
  country+' '+measured.replace('lake Atitlan','Seasonal Blend')
 ])assert.equal(selectedAdjacentGrowingRegion(blocks(prose),{name,origin:'Guatemala'}),null,prose);
});
test('unknown title-country cannot borrow a regional name or infer Guatemala',()=>{
 assert.equal(selectedAdjacentGrowingRegion(blocks(body,'El Scorpion'),{name:'El Scorpion',origin:''}),null);
});
