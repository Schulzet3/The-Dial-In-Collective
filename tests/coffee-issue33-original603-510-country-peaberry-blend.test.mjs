import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Original frozen603 #510; current official selected H1 and literal captions:
// https://www.kindercoffeelab.com/products/redwall-medium-roast
// The historic "redwall" URL slug is NOT the currently chosen product title.
const url='https://kinder.example/products/redwall-medium-roast';
function selectedPage(country,extra=''){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+url+'"></head><body><main><article>'+
  '<h1>Wobegon Medium Roast</h1><p>Notes: Nutty, Cocoa, Spices, Citrus</p>'+
  '<h2>Roast Details</h2><p>Roast Type: Medium Roast</p>'+
  '<p>Country: '+country+'</p><p>Process: Washed</p>'+extra+
  '</article></main></body></html>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed?.ok,true,JSON.stringify(parsed));
 return parsed;
}

test('original603 #510: explicit Country caption excludes Peaberry Southern Blend product descriptor',()=>{
 const parsed=selectedPage('Tanzania Peaberry Southern Blend');
 assert.equal(parsed.fields.origin,'Tanzania',JSON.stringify(parsed.fields));
 assert.equal(parsed.fields.name,'Wobegon Medium Roast');
 assert.equal(parsed.fields.roast_level,'Medium');
 assert.equal(parsed.fields.process,'Washed');
});

test('a bare published Country remains untouched, while a nonblend locality is never stripped',()=>{
 assert.equal(selectedPage('Tanzania').fields.origin,'Tanzania');
 assert.notEqual(selectedPage('Tanzania Peaberry Southern Valley').fields.origin,'Tanzania');
});

test('multiple printed countries and different component names cannot be silently reduced',()=>{
 for(const caption of [
  'Tanzania Kenya Peaberry Southern Blend',
  'Tanzania, Kenya Peaberry Southern Blend',
  'Tanzania Peaberry Southern Blend, Kenya',
  'Tanzania Peaberry Southern Highlands'
 ]){
  assert.notEqual(selectedPage(caption).fields.origin,'Tanzania',caption);
 }
});

test('a related-product Country caption cannot donate a selected origin',()=>{
 const html='<html><head><meta property="og:type" content="product"></head><body><main>'+
  '<h1>Wobegon Medium Roast</h1><p>Notes: Nutty, Cocoa</p>'+
  '<section class="product-recommendations"><h2>Other Coffee</h2>'+
  '<p>Country: Tanzania Peaberry Southern Blend</p></section></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result?.ok,true,JSON.stringify(result));
 assert.notEqual(result.fields.origin,'Tanzania');
});
