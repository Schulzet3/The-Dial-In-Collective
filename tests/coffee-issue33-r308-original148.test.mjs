// Issue #33 R308: selected original603 #148 source taxonomy / related coffee negatives.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://highpointroasters.com/product/breakfast-blend';
const title='Breakfast Blend';
const own='<h2>Description</h2><p>A blend of Central and South Americas. Medium body with mild acidity. A great house coffee.</p>';
const page=(product=own,related='')=>'<html><head><title>Breakfast Blend - High Point Coffee Roasters</title>'+
 '<meta property="og:site_name" content="High Point Coffee Roasters"></head><body><main><article class="product"><h1>'+
 title+'</h1><div class="woocommerce-Tabs-panel">'+product+'</div></article></main>'+related+'</body></html>';

test('R308 actual selected H1 preserves identity, preview and explicit source review',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R308 medium BODY is not a published Medium ROAST category',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level||'', '');
 assert.equal((p.conflicts||[]).includes('roast_level'),false);
});
test('R308 mild acidity is not an exact named tasting-note list',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.tasting_notes||'','');
 assert.equal(p.fields.decaffeination_method||'','');
});
test('R308 other coffee related card cannot donate coffee identity, Zambia origin or dark roast',()=>{
 const unrelated='<aside class="related-products"><h2>Zambia Lupili</h2>'+
  '<p>Notes: Pineapple, Hibiscus. Dark roast. Natural process. 1800 masl.</p></aside>';
 const p=extractPublicCoffeeFacts(page(own,unrelated),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.doesNotMatch(String(p.fields.origin||''),/Zambia|Malawi|Kenya/i);
 assert.doesNotMatch(String(p.fields.roast_level||''),/Dark|Medium/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Pineapple|Hibiscus/i);
 assert.equal(p.fields.process||'','');
});
test('R308 roastery location and nonspecific blend must not become specific growing country',()=>{
 const footer='<footer>High Point Coffee Roasters, New Albany, Mississippi 38652</footer>';
 const p=extractPublicCoffeeFacts(page(own,footer),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.origin||''),/Mississippi|United States|Zambia|Brazil|Peru|Colombia/i);
 assert.equal(p.fields.variety||'','');
 assert.equal(p.fields.producer||'','');
});
