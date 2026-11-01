// Issue #33: exact current official #3/#35 selected Origin captions mix place and process.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://roaster.example/products/selected';
function parse(name,body){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+url+'"></head><body><main><article class="product">'+
  '<h1>'+name+'</h1><div itemprop="description">'+body+
  '</div></article></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,name);
 return result;
}

test('1951 selected Guatemala ASOPCE Origin strips only process and percentage',()=>{
 const raw='100% Guatemala, washed.';
 const data=parse('Guatemala ASOPCE','<p>Roast: Medium</p><p>Origin: '+raw+
  '</p><p>Process: Washed</p><p>Tasting Notes: Brown Sugar, Praline, Caramelized Orange</p>');
 assert.equal(data.fields.origin,'Guatemala');
 assert.equal(data.fields.process,'Washed');
 assert.equal(data.fields.roast_level,'Medium');
 assert.ok(data.source_facts.some(f=>f.field==='origin'&&f.value.includes(raw)));
 assert.ok(coffeeUrlPreviewMarkup(data).includes('Guatemala'));
});

test('Brewpoint selected Alchemist decaf Origin keeps Brazil, not water method',()=>{
 const raw='Brazil (Mountain Water Processed)';
 const data=parse('The Alchemist: Decaf Medium Roast','<p>Origin: '+raw+
  '</p><p>Roast: Medium</p><p>Tasting Notes: Chocolate, Graham Cracker</p>');
 assert.equal(data.fields.origin,'Brazil');
 assert.equal(data.fields.roast_level,'Medium');
 assert.ok(data.source_facts.some(f=>f.field==='origin'&&f.value.includes(raw)));
 assert.ok(coffeeUrlPreviewMarkup(data).includes('Brazil'));
});

test('equivalent direct country and clean process-qualified Origin do not conflict',()=>{
 const data=parse('Guatemala ASOPCE','<p>Origin: 100% Guatemala, washed.</p>'+
  '<p>Country: Guatemala</p><p>Process: Washed</p>');
 assert.equal(data.fields.origin,'Guatemala');
 assert.equal((data.conflicts||[]).includes('origin'),false);
});

test('bounded process suffix variants normalize only a known complete country',()=>{
 for(const [raw,expected] of [
  ['100% Ethiopia, natural.','Ethiopia'],
  ['100% Costa Rica, honey processed','Costa Rica'],
  ['100% Papua New Guinea, fully washed','Papua New Guinea'],
  ['Colombia (Swiss Water Process)','Colombia']
 ]){
  const data=parse('Selected Coffee','<p>Origin: '+raw+'</p>');
  assert.equal(data.fields.origin,expected,raw);
 }
});

test('region, multiple countries and unmatched qualifiers are never collapsed',()=>{
 for(const raw of [
  '100% Guatemala, washed and natural',
  '100% Guatemala, Colombia',
  'Brazil (Mountain Water Processed), Colombia',
  'Brazil (Mountain Waterfall Reserve)',
  'Cauca, Colombia (Mountain Water Processed)',
  'Brazil (Mountain Water Processed) / Peru'
 ]){
  const data=parse('Selected Coffee','<p>Origin: '+raw+'</p>');
  assert.notEqual(data.fields.origin,'Guatemala',raw);
  assert.notEqual(data.fields.origin,'Brazil',raw);
  assert.notEqual(data.fields.origin,'Colombia',raw);
 }
});

test('two incompatible selected producing countries remain review conflicts',()=>{
 const data=parse('Selected Coffee','<p>Origin: 100% Guatemala, washed.</p>'+
  '<p>Origin: Brazil (Mountain Water Processed)</p>');
 assert.ok(data.conflicts.includes('origin'));
 assert.equal(data.fields.origin,undefined);
});

test('unselected product recommendation cannot donate process-qualified Origin',()=>{
 const data=parse('Selected Coffee','<p>Roast: Medium</p>'+
  '<section class="product-recommendations"><h3>Other Coffee</h3>'+
  '<p>Origin: Brazil (Mountain Water Processed)</p></section>');
 assert.equal(data.fields.origin,undefined);
});
