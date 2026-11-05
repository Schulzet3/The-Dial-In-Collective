// Issue33 original603 #554 / #590: selected-roast semantic boundary tests; synthetic, not live source proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const roc='https://www.roc2.com/products/organic-mexican',vail='https://www.vailcoffee.com/products/reserve-coffee-3';
const parse=(url,name,description,extra='')=>extractPublicCoffeeFacts('<html><head><link rel="canonical" href="'+url+'"></head><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description">'+description+'</div></article></main>'+extra+'</body></html>',{source_url:url});
test('#554 relative lighter roast is not an absolute selected Light',()=>{
 const r=parse(roc,'Organic Mexican','<p>A well-balanced lighter roast with molasses, caramel, and lemongrass tasting notes. Sourced from organic Mexican farms.</p>');
 assert.equal(r.ok,true,JSON.stringify(r)); assert.equal(r.fields.roast_level,undefined,JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/molasses/i);
});
test('#590 medium smooth body and FAQ do not assign whole-product roast',()=>{
 const r=parse(vail,'Honduras Finca Quebrada Onda - HONEY','<p>Grower: Isaac Mejia</p><p>Region: Montecillos, La Paz, Honduras</p><p>Process: Honey</p><p>Body: medium smooth</p><p>Flavor: cocoa, praline, mellow fresh citrus acidity</p>','<section class="faq"><p>Lighter roasts are great for pour-overs. Darker roasts like our Bridge Street Blend are great for drip.</p></section>');
 assert.equal(r.ok,true,JSON.stringify(r)); assert.equal(r.fields.roast_level,undefined,JSON.stringify(r.fields)); assert.equal(r.fields.process,'Honey',JSON.stringify(r.fields));
});
test('explicit current Roast: Light is still available',()=>{
 const r=parse(roc,'Organic Mexican','<p>Roast: Light</p><p>Notes: molasses, caramel and lemongrass</p>');
 assert.equal(r.ok,true,JSON.stringify(r)); assert.equal(r.fields.roast_level,'Light',JSON.stringify(r.fields));
});
test('different related coffee Dark roast is not the selected roast',()=>{
 const r=parse(vail,'Honduras Finca Quebrada Onda - HONEY','<p>Process: Honey</p><p>Body: medium smooth</p>','<aside class="related-products"><h2>Related coffees</h2><p>Bridge Street Blend: Dark roast</p></aside>');
 assert.equal(r.ok,true,JSON.stringify(r)); assert.equal(r.fields.roast_level,undefined,JSON.stringify(r.fields));
});
