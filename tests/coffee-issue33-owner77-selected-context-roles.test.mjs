import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCoffeeContextRoles} from '../src/server/coffee-selected-context-roles.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const clean=(s,max=6001)=>String(s).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const roles=(name,html)=>selectedCoffeeContextRoles(html,{name,clean});
const asPage=(name,body)=>'<main><h1>'+name+'</h1>'+body+'</main>';
test('selected actual origin-named Flavor sentence extracts its complete literal aroma and cup list',()=>{
 const body='<p>Ethiopia Flavor: Richly sweet, roast-rounded. Dark chocolate, gardenia, gently scorched cedar, red plum, hazelnut in aroma and cup. Sweet finish with creaminess.</p>';
 const r=extractPublicCoffeeFacts(asPage('Ethiopia Yirgacheffe',body),{source_url:'https://example-coffee.test/products/ethiopia'});
 assert.equal(r.ok,true);assert.equal(r.fields.tasting_notes,'Dark chocolate, gardenia, gently scorched cedar, red plum, hazelnut');
 assert.equal(roles('Kenya Coffee',asPage('Kenya Coffee',body)).tasting_notes,undefined);
});
test('selected current producer-plus-locality under its own header requires producer contextual corroboration',()=>{
 for(const [name,credit,story] of [
  ['Bressani Family Washed Sidra','Bressani Family','They grow it toward the top of the Bressani Family farm.'],
  ['Volcán Atitlán Guatemala','Giorgio Bressani','Giorgio is a third-generation coffee producer working his family farm.']
 ]){
  const body='<section><h2>'+name+'</h2><ul><li>'+credit+', San Jerónimo Guatemala</li></ul><p>'+story+'</p></section>';
  const got=extractPublicCoffeeFacts(asPage(name,body),{source_url:'https://example-coffee.test/products/coffee'});
  assert.equal(got.ok,true);assert.equal(got.fields.producer,credit);
  assert.equal(roles(name,asPage(name,'<h2>Related Coffee</h2><ul><li>'+credit+', San Jerónimo Guatemala</li></ul><p>'+story+'</p>')).producer,undefined);
 }
});
test('unrelated card, identity mismatch, plain geographic text, and third-party farm cannot assign producer',()=>{
 const name='Volcán Atitlán Guatemala',list='<li>Giorgio Bressani, San Jerónimo Guatemala</li>';
 for(const body of [
  '<h2>Other Coffee</h2>'+list+'<p>Giorgio is a coffee producer and farm owner.</p>',
  '<h2>'+name+'</h2>'+list,
  '<h2>'+name+'</h2>'+list+'<p>A different coffee has farmers in Guatemala.</p>'
 ])assert.equal(roles(name,asPage(name,body)).producer,undefined);
});
test('literal Micro-Lot applies to exact selected origin details only, not promotional collection',()=>{
 const main=asPage('Venezuela','<h2>Origin Details</h2><ul><li>Lot: Microlot</li></ul>');
 const r=extractPublicCoffeeFacts(main,{source_url:'https://example-coffee.test/products/venezuela'});
 assert.equal(r.fields.release_label,'Micro-Lot');
 assert.equal(roles('Venezuela',asPage('Venezuela','<h2>Shop our best sellers!</h2><ul><li>Lot: Microlot</li></ul>')).release_label,undefined);
 assert.equal(roles('Venezuela',asPage('Venezuela','<h2>Origin Details</h2><p>This is a lovely microlot.</p>')).release_label,undefined);
});
test('only selected first-lot main harvest may create a season detail, not an invented release year',()=>{
 const prose='This is the first of three Pink Bourbon lots from the main harvest at Finca Costa Rica, the grower’s farm. The farm still has a defined main harvest season that runs from May to August, with this first lot coming from the early and peak portions of the harvest.';
 const r=extractPublicCoffeeFacts(asPage('Faver Ninco - Colombia','<p>'+prose+'</p>'),{source_url:'https://example-coffee.test/products/faver'});
 assert.equal(r.roaster_details?.harvest_season,'May–August');assert.equal(r.fields.release_label,undefined);
 const bad=prose.replace('main harvest season','other farm harvest season');
 assert.equal(roles('Faver Ninco - Colombia',asPage('Faver Ninco - Colombia','<p>'+bad+'</p>')).harvest_season,undefined);
});
