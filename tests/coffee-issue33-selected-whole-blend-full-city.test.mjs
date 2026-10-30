// Issue33 original603 #469: WHOLE blend's roast is not components' roast.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedDirectProductCredits} from '../src/server/coffee-direct-product-prose.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Breakfast Blend',url='https://www.creativecoffees.com/product/breakfast-blend/';
const current='A smooth Central and South American Blend. Full City Roast, 100% Arabica Coffee. Perfect for any time of day.';
const components='A blend of Central & South American Coffees, balanced with City Roast & Full City Roast beans. Medium body and high acidity makes this a perfect all day coffee.';
const clean=s=>String(s||'').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
const page=(n,body)=>'<html><body><main><article class="product"><h1>'+n+'</h1><div itemprop="description">'+body+'</div></article></main></body></html>';
const direct=(n,body)=>selectedDirectProductCredits(page(n,body),{name:n,clean});
const parse=(n,body)=>extractPublicCoffeeFacts(page(n,body),{source_url:url});
test('selected whole Breakfast Blend standalone Full City maps Medium-Dark and Add Coffee',()=>{
 const d=direct(name,'<p>'+current+'</p>');
 assert.equal(d.roast_level,'Medium-Dark');
 const p=parse(name,'<p>'+current+'</p>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,'Medium-Dark');
 assert.match(coffeeUrlPreviewMarkup(p),/Medium-Dark/);
});
test('City and Full City roasted beans are components, not an entire House Blend roast',()=>{
 const d=direct('House Blend','<p>'+components+'</p>');
 assert.equal(d.roast_level,undefined);
 const p=parse('House Blend','<p>'+components+'</p>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,undefined);
});
test('nonblend selected coffee cannot borrow another blend roast caption',()=>{
 assert.equal(direct('Brazil Oberon','<p>'+current+'</p>').roast_level,undefined);
});
test('competing, related, education and other-coffees headings cannot donate roast',()=>{
 for(const body of [
 '<h1>Competing Coffee</h1><p>'+current+'</p>',
 '<h2>Related Products</h2><p>'+current+'</p>',
 '<h2>Roast Levels Explained</h2><p>'+current+'</p>',
 '<h2>Other Coffees</h2><p>'+current+'</p>'
 ])assert.equal(direct(name,body).roast_level,undefined,body.slice(0,60));
});
test('historical, optional, compound and competing roast statements are withheld',()=>{
 for(const copy of [
 'Our previous Central American Blend. Full City Roast, 100% Arabica Coffee.',
 'A smooth blend. Full City Roast and Medium Roast are offered.',
 'A smooth blend. City Roast & Full City Roast beans.',
 'A smooth blend. Full City Roast, with another coffee roasted dark.',
 'A smooth blend. Full City Roast, with prior roast choices.'
 ])assert.equal(direct(name,'<p>'+copy+'</p>').roast_level,undefined,copy);
});
test('conflicting selected Light roast and Full City roast both withheld',()=>{
 assert.equal(direct(name,'<p>Breakfast Blend is roasted light.</p><p>'+current+'</p>').roast_level,undefined);
});
test('grind selector and unrelated nav banner do not donate Medium or Full City',()=>{
 const body='<nav><p>Full City Roast</p></nav><label>Grind</label><select name="grind"><option selected>Medium</option></select>';
 assert.equal(direct(name,body).roast_level,undefined);
});
test('different selected product H1 fails closed',()=>{
 const html=page(name,'<h1>Different Blend</h1><p>'+current+'</p>');
 assert.deepEqual(selectedDirectProductCredits(html,{name,clean}),{});
});
