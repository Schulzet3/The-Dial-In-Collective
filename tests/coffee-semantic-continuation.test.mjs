import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
import {normalizeExplicitCoffeeTastingNotes} from '../src/server/coffee-flavor-evidence.mjs';

const source_url='https://roaster.examplecoffee.com/products/current-coffee';
const parse=body=>extractPublicCoffeeFacts('<main><h1>Current Coffee</h1>'+body+'</main>',{source_url});

test('ongoing family cultivation supplies only its literal credited identity',()=>{
 for(const [sentence,producer] of [
  ['Grown on the Las Mercedes farm in northern Colombia, the Gamboa family has been cultivating coffee for sixty years, carrying on a family tradition that dates back to 1920.','Gamboa family'],
  ['Grown at the Vista farm in Peru, the Vega family have been growing coffee for three generations.','Vega family'],
  ['This coffee is grown on the Bela estate in Brazil, the Souza family has been producing coffees on their farm since 1985.','Souza family']
 ]){
  const body='<p>'+sentence+'</p>';
  assert.equal(parse(body).fields.producer,producer);
  const endpoint=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:body},shopifyProductRequest(source_url));
  assert.equal(endpoint.fields.producer,producer);
 }
});

test('ongoing-family grammar cannot create suppliers from historical, unrelated or nonfarming prose',()=>{
 for(const sentence of [
  'Another coffee comes from the Gamboa family, who have been cultivating coffee for sixty years.',
  'Last year the Gamboa family had been cultivating coffee on a different farm.',
  'The Gamboa family has not been cultivating coffee.',
  'The Gamboa family has been producing photographs of coffee.',
  'Imagine the Gamboa family has been growing coffee.',
  'For example, the Gamboa family has been cultivating coffee.',
  'Our family has been growing coffee in our appreciation for new flavors.',
  'Before this harvest, the Vega family has been cultivating coffee in Colombia.',
  'Many farmers are inspired by how the Vega family has been cultivating coffee.',
  'The Vega family has been growing coffee for generations.'
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.producer,undefined,sentence);
 // The independently stated farm can still be an existing source credit;
 // an unnamed or conditional family clause must not replace it.
 assert.notEqual(parse('<p>Grown on the Vista farm, Our family has been cultivating coffee.</p>').fields.producer,'Our family');
 assert.notEqual(parse('<p>Grown on the Vista farm, the Vega family has been cultivating coffee if the story is true.</p>').fields.producer,'Vega family');
 const ambiguous=parse('<p>Grown on the Vista farm, the Vega family has been growing coffee.</p><p>Grown on the Bela estate, the Souza family has been growing coffee.</p>');
 assert.equal(ambiguous.fields.producer,undefined);
});

test('a complete hyphenated sensory descriptor is not a dangling comparison word',()=>{
 for(const value of ['honey, lemon & lime, pear, tea-like','tea-like','plum, cherry-like']){
  assert.equal(normalizeExplicitCoffeeTastingNotes(value),value);
  for(const body of ['<p>Flavor Profile: '+value+'</p>','<h2>Flavor Profile</h2><p>'+value+'</p>']){
   assert.equal(parse(body).fields.tasting_notes,value);
   const endpoint=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:body},shopifyProductRequest(source_url));
   assert.equal(endpoint.fields.tasting_notes,value);
  }
 }
 for(const value of ['honey, lemon, like','caramel with','pear and the','coffee tastes like',
  'honey,like','tea/like','tea&like','caramel-with','pear-the'])
  assert.equal(normalizeExplicitCoffeeTastingNotes(value),'',value);
});

test('a compact sensory bouquet bullet preserves its literal list',()=>{
 const body='<p>-beautiful fruity bouquet including citrus, tropical fruits, and berries</p>';
 const expected='citrus, tropical fruits, and berries';
 assert.equal(parse(body).fields.tasting_notes,expected);
 const endpoint=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:body},shopifyProductRequest(source_url));
 assert.equal(endpoint.fields.tasting_notes,expected);
 assert.equal(parse('<li>Aromatic bouquet of rose, jasmine, and tea-like florals.</li>').fields.tasting_notes,
  'rose, jasmine, and tea-like florals');
 for(const body of [
  '<p>This gift includes a floral bouquet of roses and lilies.</p>',
  '<p>Last year this coffee had a fruity bouquet of citrus and berries.</p>',
  '<p>Not a fruity bouquet of citrus and berries.</p>',
  '<p>A floral bouquet of roses and lilies is included with your order.</p>',
  '<h2>What is a tasting profile?</h2><p>Aromatic bouquet of rose and jasmine.</p>',
  '<p>Floral bouquet of roses and lilies sold separately.</p>',
  '<h2>Optional Gift Additions</h2><p>Floral bouquet of roses and lilies.</p>',
  '<h2>Optional Gift Additions</h2><li>Aromatic bouquet of rose and jasmine.</li>',
  '<p>-Aromatic bouquet of rose and jasmine sold separately.</p>',
  '<p>-Fruity bouquet of citrus and berries included for your birthday.</p>',
  '<p>Aromatic bouquet of rose, jasmine, and tea-like florals.</p>'
 ])assert.equal(parse(body).fields.tasting_notes,undefined,body);
});

test('one explicitly additive notes statement retains both literal noun lists',()=>{
 for(const [sentence,expected] of [
  ['Bursting with notes of cranberry and lychee with additional sweet notes of caramelized sugar.','cranberry and lychee, caramelized sugar'],
  ['This coffee has notes of plum with additional notes of hibiscus.','plum, hibiscus']
 ]){
  const body='<p>'+sentence+'</p>';
  assert.equal(parse(body).fields.tasting_notes,expected);
  const endpoint=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:body},shopifyProductRequest(source_url));
  assert.equal(endpoint.fields.tasting_notes,expected);
 }
 for(const body of [
  '<p>Last year this coffee had notes of plum with additional notes of hibiscus.</p>',
  '<p>This coffee does not have notes of plum with additional notes of hibiscus.</p>',
  '<p>This coffee has notes of plum.</p><p>Another coffee has additional notes of hibiscus.</p>'
 ])assert.ok(!/hibiscus/.test(parse(body).fields.tasting_notes||''),body);
 const distinct=parse('<p>Notes: Plum</p><p>Notes: Hibiscus</p>');
 assert.equal(distinct.fields.tasting_notes,undefined);
 assert.ok(distinct.conflicts.includes('tasting_notes'));
});

test('additive notes preserve the unconditional first list when the additional flavor depends on preparation',()=>{
 for(const ending of [
  'if blended with tea',
  'when served with milk',
  'after adding tea',
  'only when mixed with tea',
  'with milk',
  'or mint'
 ]){
  const sentence='This coffee has notes of plum with additional notes of hibiscus '+ending+'.';
  const body='<p>'+sentence+'</p>';
  assert.equal(parse(body).fields.tasting_notes,'plum',sentence);
  const endpoint=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:body},shopifyProductRequest(source_url));
  assert.equal(endpoint.fields.tasting_notes,'plum',sentence);
 }
});
