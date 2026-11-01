import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://beanstockcoffee.com/products/ethiopia-ayla-bombe-g1-natural';
const chelchele='This coffee comes from the Chelchele washing station, which is in the village of Chelchele, district Kochere, Yirgacheffe.';
const ayla='From the Ayla Washing Station, which serves the nearly 375 small farmers in the village of Bombe in Sidama, comes this delightfully balanced natural with notes of raspberry, stone fruit and toffee.';
const parse=(name,description)=>extractPublicCoffeeFacts(
 '<html><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description"><p>'+description+'</p></div></article></main></body></html>',
 {source_url:url}
);
test('selected Chelchele station retains literal village, district and region',()=>{
 const result=parse('New!! Ethiopia Chelchele G1 Natural',chelchele);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
 assert.match(coffeeUrlPreviewMarkup(result),/Kochere/);
});
test('selected Ayla station retains literal village and region despite reused URL',()=>{
 const result=parse('Ethiopia Ayla Bombe G1 Natural',ayla);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.origin,'Bombe, Sidama, Ethiopia');
 assert.match(coffeeUrlPreviewMarkup(result),/Sidama/);
});
test('other selected coffee, other station and missing printed country do not inherit exact locality',()=>{
 for(const [name,description] of [
  ['Ethiopia Aurora G1 Natural',chelchele],
  ['Ethiopia Chelchele G1 Natural',ayla],
  ['Ayla Bombe G1 Natural',ayla]
 ]){
  const result=parse(name,description);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.notEqual(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
  assert.notEqual(result.fields.origin,'Bombe, Sidama, Ethiopia');
 }
});
test('past, generic and unrelated station stories do not donate selected lot geography',()=>{
 for(const description of [
  'Previously, '+chelchele,
  'For example, '+chelchele,
  'Other coffees are sourced from the Chelchele washing station, which is in the village of Chelchele, district Kochere, Yirgacheffe.',
  'Typically, '+ayla
 ]){
  const result=parse('Ethiopia Chelchele G1 Natural',description);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.notEqual(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia',description);
 }
});
test('different-country station sentence cannot invent selected Ethiopian village',()=>{
 for(const description of [
  'This coffee comes from the Chelchele washing station, which is in the village of Chelchele, district Kochere, Colombia.',
  'From the Ayla Washing Station, which serves the nearly 375 small farmers in the village of Bombe in Colombia, comes this natural coffee.'
 ]){
  const result=parse('Ethiopia Chelchele G1 Natural',description);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.notEqual(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
  assert.notEqual(result.fields.origin,'Bombe, Sidama, Ethiopia');
 }
});
test('unrelated generic washing-station guidance leaves only the published country',()=>{
 const result=parse('Ethiopia Natural G1','Washing stations serve small farmers from many different areas.');
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.origin,'Ethiopia');
});

test('fresh official November 1 selected Chelchele kebele and district wording is source-bound',()=>{
 const published='This coffee comes from the Chelchele washing station, which is in the kebele, or village, of Chelchele, in the words, or district, of Kochere, in the Yirgacheffe region.';
 const result=parse('Ethiopia Chelchele G1 Natural',published);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
 assert.match(coffeeUrlPreviewMarkup(result),/Kochere/);
 const other=parse('Ethiopia Ayla Bombe G1 Natural',published);
 assert.notEqual(other.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
});
