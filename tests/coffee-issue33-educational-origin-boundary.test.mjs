// Issue #33: educational geography labels inside the selected wrapper are
// review-only, not proof about the selected current coffee's growing place.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roaster.example/products/current';
function parse(name,description){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+url+'"></head><body><main><article class="product">'+
  '<h1>'+name+'</h1><div itemprop="description">'+description+
  '</div></article></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result;
}

test('educational Origin example alone cannot become the selected geographic Origin',()=>{
 const result=parse('Selected Coffee','<h2>What is origin?</h2>'+
  '<p>Origin: Brazil (Mountain Water Processed)</p>');
 assert.equal(result.fields.origin,undefined);
 assert.equal((result.conflicts||[]).includes('origin'),false);
});

test('educational country and region examples cannot conflict with later selected specs',()=>{
 const result=parse('Selected Coffee','<h2>Origin Explained</h2>'+
  '<p>Country: Brazil</p><p>Region: Cerrado</p>'+
  '<h3>Example</h3><li>Origin: Brazil (Mountain Water Processed)</li>'+
  '<h2>Product Details</h2><p>Origin: Guatemala</p><p>Process: Washed</p>');
 assert.equal(result.fields.origin,'Guatemala');
 assert.equal(result.fields.process,'Washed');
 assert.equal((result.conflicts||[]).includes('origin'),false);
});

test('1951 current selected Guatemala Origin remains authoritative after a teaching heading',()=>{
 const result=parse('Guatemala ASOPCE','<h2>What is origin?</h2>'+
  '<p>Origin: Brazil (Mountain Water Processed)</p>'+
  '<h2>Product Details</h2><p>Origin: 100% Guatemala, washed.</p>'+
  '<p>Process: Washed</p><p>Roast: Medium</p>');
 assert.equal(result.fields.name,'Guatemala ASOPCE');
 assert.equal(result.fields.origin,'Guatemala');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.roast_level,'Medium');
 assert.equal((result.conflicts||[]).includes('origin'),false);
});

test('Brewpoint current selected decaf Origin remains independent of educational country example',()=>{
 const result=parse('The Alchemist: Decaf Medium Roast',
  '<h2>What is origin?</h2><p>Origin: Colombia</p>'+
  '<h2>Coffee Details</h2><p>Origin: Brazil (Mountain Water Processed)</p>'+
  '<p>Roast: Medium</p><p>Tasting Notes: Chocolate, Graham Cracker</p>');
 assert.equal(result.fields.origin,'Brazil');
 assert.equal(result.fields.roast_level,'Medium');
 assert.equal((result.conflicts||[]).includes('origin'),false);
});

test('unscoped product labels without educational headings are unchanged',()=>{
 const result=parse('Selected Coffee','<h2>Product Details</h2>'+
  '<p>Origin: Brazil</p><p>Roast: Medium</p>');
 assert.equal(result.fields.origin,'Brazil');
 assert.equal(result.fields.roast_level,'Medium');
});
