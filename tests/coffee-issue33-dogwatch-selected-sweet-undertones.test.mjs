// Issue #33 original frozen603 #19: selected official DogWatch sensory paragraph.
// Synthetic adversarial fixtures; official HTTPS current bytes require separate CI verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const sourceUrl='https://blackdogcoffee.net/product/dogwatch-dark-blend-2';
const selected='In response to those of you who prefer a dark roasted coffee, we have developed a proprietary blend of beans that produce a pleasantly surprising dark, smoky chocolate flavor with earth notes balanced by high sweet undertones and a smooth full body.';
function page(description,aside=''){
 return '<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+sourceUrl+'"></head><body>'+
  '<main><article class="product"><h1>DogWatch Dark Blend</h1><section class="woocommerce-Tabs-panel--description"><h2>Description</h2>'+
  description+'</section></article></main>'+aside+'</body></html>';
}
function parse(body,aside=''){
 return extractPublicCoffeeFacts(page(body,aside),{source_url:sourceUrl});
}
test('#19 direct selected flavor / earth / high sweet undertones are one bounded flavor claim',()=>{
 const r=parse('<p>Our signature blend!</p><p>'+selected+'</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.match(r.fields.tasting_notes||'',/smoky chocolate/i,JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/earth/i,JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/high sweet undertones/i,JSON.stringify(r.fields));
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r.conflicts));
});
test('#19 unrelated other coffee and milk-qualified notes must not supply undertones',()=>{
 const related=parse('<p>Our signature dark-roasted blend, with no printed notes on this card.</p>',
  '<aside class="related-products"><h2>Other Coffees</h2><p>'+selected+'</p></aside>');
 assert.equal(related.ok,true,JSON.stringify(related));
 assert.doesNotMatch(related.fields.tasting_notes||'',/high sweet undertones/i);
 const conditional=parse('<p>When served with milk, this coffee develops smoky chocolate flavor with earth notes balanced by high sweet undertones and a smooth full body.</p>');
 assert.equal(conditional.ok,true,JSON.stringify(conditional));
 assert.doesNotMatch(conditional.fields.tasting_notes||'',/high sweet undertones/i);
});
