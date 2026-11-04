// Original603 #445: current selected sensory brightness must not be dropped.
// Synthetic adversarial regression, not a claim of raw official HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://www.bluejazzcoffee.com/products/guatemala-antigua';
const product=(body,aside='')=>'<html><head><link rel="canonical" href="'+url+'"></head><body><main><article class="product"><h1>Guatemala</h1><div itemprop="description">'+body+'</div></article></main>'+aside+'</body></html>';
const parse=(body,aside='')=>extractPublicCoffeeFacts(product(body,aside),{source_url:url});
const selected='Our current Guatemala offering is our favorite one created to date. In fact, we found two regional lots we love and combined them to make a single origin blend! You will find flavor notes of stone fruit with a lemony brightness.';
const heights='One of the coffees is a fully washed selection from the Lake Atitlan region grown at 1800-2000 meters above sea level. The other is a washed HueHuetenengo grown at 1500-1700 MASL.';
test('#445 selected direct printed stone fruit and lemony brightness remain together',()=>{
 const r=parse('<p>'+selected+'</p><p>'+heights+'</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.match(r.fields.tasting_notes||'',/stone fruit/i,JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/lemony brightness/i,JSON.stringify(r.fields));
 assert.equal(r.fields.elevation_m,undefined,'two component heights do not establish one whole-blend elevation');
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r.conflicts));
});
test('a different sensory adjective is retained only if the selected note prints it',()=>{
 const r=parse('<p>This coffee has tasting notes of stone fruit with a floral brightness.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.match(r.fields.tasting_notes||'',/stone fruit/i);
 assert.match(r.fields.tasting_notes||'',/floral brightness/i);
});
test('milk-qualified notes and a related coffee cannot donate selected sensory brightness',()=>{
 const conditional=parse('<p>This coffee has notes of stone fruit with a lemony brightness if served with milk.</p>');
 assert.equal(conditional.ok,true,JSON.stringify(conditional));
 assert.doesNotMatch(conditional.fields.tasting_notes||'',/lemony brightness/i);
 const related=parse('<p>Tasting Notes: Chocolate, caramel</p>',
  '<aside class="related-products"><h2>Other Coffees</h2><p>Our other coffee has notes of raspberry with a lemony brightness.</p></aside>');
 assert.equal(related.ok,true,JSON.stringify(related));
 assert.doesNotMatch(related.fields.tasting_notes||'',/lemony brightness/i);
 assert.match(related.fields.tasting_notes||'',/Chocolate/i);
});
