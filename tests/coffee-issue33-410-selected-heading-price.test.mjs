// Issue33 original603 #410: commerce price adjacent to exact selected H1 is not the coffee's name.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCoffeeNameWithoutPrice} from '../src/server/coffee-product-identity.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://whiterhinocoffee.com/products/ethiopia-kayon-mountain';
const title='Ethiopia Kayon Mountain';
const html=(h1,structured='')=>'<html><head><meta property="og:type" content="product">'+
 (structured?'<script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'Product',name:structured,url})+'</script>':'')+
 '</head><body><main><article class="product"><h1>'+h1+'</h1>'+
 '<p>Roast: Light</p><p>Origin: Oromia, Guji, Shakiso, Ethiopia</p>'+
 '<p>Process: Washed</p><p>Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle</p>'+
 '</article></main></body></html>';
const parse=(h1,structured='')=>extractPublicCoffeeFacts(html(h1,structured),{source_url:url});

test('actual current selected H1 shape strips terminal joined $22.00 from coffee identity and Add Coffee',()=>{
 const r=parse(title+'$22.00');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.match(coffeeUrlPreviewMarkup(r),/Ethiopia Kayon Mountain/);
 assert.doesNotMatch(coffeeUrlPreviewMarkup(r),/Kayon Mountain\s*\$22/);
});
test('nested money and selected same-page JSON-LD never overwrite exact coffee title',()=>{
 for(const h1 of [title+'<small>$22.00</small>',title+'<span class="price">$22.00</span>',title+' — $22.00']){
  const r=parse(h1,title+'$22.00');
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.fields.name,title);
 }
});
test('numeric lot, edition number and internal currency remain in genuine selected name',()=>{
 for(const name of ['Lot 22 – Ethiopia','The Dollar $22 Espresso','2026 Reserve #22','Finca $23 Farm'])
  assert.equal(selectedCoffeeNameWithoutPrice(name),name);
 assert.equal(selectedCoffeeNameWithoutPrice(title+'$22.00'),title);
 assert.equal(selectedCoffeeNameWithoutPrice(title+' — $22.00 USD'),title);
});
test('a different same-route coffee identity is not created from price or other products',()=>{
 const r=parse('Another Coffee$18.00');
 assert.equal(r.fields.name,'Another Coffee');
 assert.notEqual(r.fields.name,title);
 assert.equal(selectedCoffeeNameWithoutPrice('Other Coffee$18.00'),'Other Coffee');
});
test('a price-only string cannot be manufactured into a selected coffee name',()=>{
 assert.equal(selectedCoffeeNameWithoutPrice('$22.00'),'$22.00');
 assert.equal(selectedCoffeeNameWithoutPrice(''),'');
});
