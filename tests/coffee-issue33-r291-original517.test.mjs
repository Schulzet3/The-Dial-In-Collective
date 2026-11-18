// Issue #33 R291: one distinct original source (#517), never global 603 certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Guji Ethiopia- Organic';
const url='https://www.limacoffeeroasters.com/products/ethiopia-guji';
const own='<p>REGION /// Uraga, Guji Zone, Oromia</p><p>PRODUCER /// Kuri Mountain, Hambela Washing Station</p><p>COUNTRY /// Ethiopia</p><p>TASTING NOTES /// blackberry preserves, candied orange, earl grey</p><p>PROCESS /// Natural</p><p>VARIETY /// Heirloom varieties</p><p>ALTITUDE MASL /// 2100-2200</p>';
const page=(body=own,related='',heading=name)=>'<html><head><title>Unrelated older Kenya decaf</title><meta name="description" content="Old Kenya espresso lemon"></head><body><main><article class="product"><h1>'+heading+'</h1><div class="description">'+body+'</div></article></main><aside class="related-products">'+related+'</aside></body></html>';

test('original517 source acceptance fails closed on unavailable, changed identity, skipped UI or duplicate',()=>{
 const good={number:517,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([517],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],[{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([517],bad).length>0);
});
test('exact selected labeled Guji facts stay bound to chosen H1, not related coffee',()=>{
 const html=page(own,'<h2>Other coffee</h2><p>Decaf Mexico; strawberry jam; honey processed.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[name]);
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,name);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/strawberry jam|decaf mexico/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:url}));
});
test('selected direct notes and processing never require a fabricated harvest year',()=>{
 const html=page(own+'<p>Harvested between October and January. Kuri Mountain Coffee works with out-grower farmers.</p>',
  '<h2>Gold Medal Global Coffee Awards 2026</h2><p>Wilder Garcia Geisha producer</p>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/wilder garcia|gold medal/i);
 assert.doesNotMatch(String(parsed.fields.producer||''),/wilder garcia/i);
 assert.doesNotMatch(String(parsed.fields.release_label||''),/2026|gold medal/i);
});
test('recycled selected URL never forces archived Guji identity onto different current H1',()=>{
 const parsed=extractPublicCoffeeFacts(page('<p>Origin: Colombia</p><p>Tasting notes: plum, citrus</p>','', 'Current Colombia Estate'),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.notEqual(parsed.fields.name,name);
});
