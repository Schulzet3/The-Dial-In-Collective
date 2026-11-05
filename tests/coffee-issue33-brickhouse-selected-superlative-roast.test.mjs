// Issue #33 original603 #40 selected Brickhouse current product; specific
// superlative roast evidence is not a generic category, unrelated card, or prior lot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://brickhouseroasters.com/products/black-certified-organic-coffee';
const statement="Prepare to savor the satisfaction of our darkest, yet purest, roast yet.";
const details='<section><h2>BEAN PROFILE</h2><p>Country of Origin: Honduras</p><p>Region: Lempira</p><p>Producer: Flor del Cafe</p><p>Elevation: 1650 MASL</p><p>Processing Method: Washed</p><p>Drying Method: Patio – Dried</p><p>Harvest: October – March</p></section>';
const page=(prose,other='',name='Black')=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div itemprop="description"><p>'+prose+'</p>'+details+'</div></article>'+other+'</main></body></html>';
const parse=(prose,other='',name='Black')=>extractPublicCoffeeFacts(page(prose,other,name),{source_url:url});
test('selected current Brickhouse Black superlative roast prints an explicit Dark claim',()=>{
 const r=parse(statement);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Black');
 assert.equal(r.fields.roast_level,'Dark',JSON.stringify(r));
 assert.equal(r.fields.process,'Washed');
 assert.match(r.fields.origin||'',/Lempira.*Honduras/);
 assert.equal(r.fields.producer,'Flor del Cafe');
 assert.ok(!r.conflicts?.includes('roast_level'));
 assert.match(coffeeUrlPreviewMarkup(r),/Dark/);
});
test('generic selected darkest roast yet works without a roaster URL special case',()=>{
 const r=extractPublicCoffeeFacts(page('This is our darkest roast yet.'),{source_url:'https://another.example/products/black'});
 assert.equal(r.ok,true);
 assert.equal(r.fields.roast_level,'Dark');
});
test('selected current superlative is not donated by unrelated product card or a generic roast scale',()=>{
 const unrelated='<aside class="related-products"><h2>Other Roasts You Will Love</h2><p>Our darkest, yet purest, roast yet.</p></aside>';
 const r=parse('We roast every product to order.',unrelated);
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.roast_level,'Dark',JSON.stringify(r.fields));
});
test('past/other coffee superlatives do not define the selected roast',()=>{
 for(const prose of ['Our previous coffee was our darkest roast yet.',
  'Another coffee is our darkest roast yet.',
  'Our former blend was our darkest roast yet.']){
  const r=parse(prose);
  assert.equal(r.ok,true);
  assert.notEqual(r.fields.roast_level,'Dark',prose+' '+JSON.stringify(r.fields));
 }
});
test('flavor language and roast category navigation never create a Dark roast claim',()=>{
 const r=parse('Black cherry, darkest chocolate, and roast peanut flavors.',
 '<nav><a href="/collections/dark-roast">Dark Roast</a></nav>');
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.roast_level,'Dark');
});
test('conflicting explicit selected roast claims are not silently resolved from superlative',()=>{
 const r=parse(statement+' Roast Level: Medium.');
 assert.equal(r.ok,true);
 assert.ok(r.fields.roast_level!=='Dark'||r.conflicts?.includes('roast_level'),JSON.stringify(r));
});
