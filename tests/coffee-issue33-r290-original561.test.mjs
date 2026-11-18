// Issue #33 R290: one original selected coffee, not global 603 certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name="Peru Churupampa, City (mild) Roast, Fair Trade-Organic";
const url="https://www.rustydogcoffee.com/products/peru";
const selected=(own,other='',heading=name)=>'<html><head><title>Old unrelated Decaf Ethiopia</title></head><body><main><article class="product"><h1>'+heading+'</h1><div class="description">'+own+'</div></article></main><aside class="related-products">'+other+'</aside></body></html>';
const facts='<p>Cupping notes: Lime/Grape/Brown Sugar</p><p>Grower: Finca Churupampa</p><p>Region: Chirinos, Cajamarca, Peru</p><p>Altitude: 1,600-1,900m</p><p>Process: Washed</p><p>Certifications: Fair Trade, Organic</p>';
test('original 561 requires real selected source, current parser and editable Add Coffee/Source Review',()=>{
 const good={number:561,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([561],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,selected_heading_identity_verified:false}],[{...good,parser_ok:false}],[{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([561],bad).length>0);
});
test('own selected Peru Churupampa labeled cupping, geographic farm and washed facts survive',()=>{
 const h=selected(facts,'<h2>Related roast</h2><p>Swiss Water decaf, Blueberry, Ethiopia, Natural.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(h)),[name]);
 const p=extractPublicCoffeeFacts(h,{source_url:url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,name);
 assert.match(String(p.fields.origin||''),/peru/i);
 assert.match(String(p.fields.tasting_notes||''),/lime/i);
 assert.match(String(p.fields.tasting_notes||''),/grape/i);
 assert.match(String(p.fields.tasting_notes||''),/brown sugar/i);
 assert.match(String(p.fields.process||''),/washed/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|ethiopia|swiss water/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('historic family story does not establish each neighboring exporter as current grower',()=>{
 const h=selected(facts+'<p>The Tocto brothers provide export and marketing services to 215 neighboring farmers; Eber Tocto founded a training center.</p>',
 '<h2>Related coffee</h2><p>Other product grown by a named Ethiopian farmer.</p>');
 const p=extractPublicCoffeeFacts(h,{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.producer||''),/215 neighboring|ethiopian farmer/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/215 neighboring|training center/i);
});
test('reused Peru URL with another current selected H1 cannot inherit archived identity',()=>{
 const p=extractPublicCoffeeFacts(selected('<p>Origin: Colombia</p><p>Cupping notes: Blackberry</p>','', 'New Colombia Espresso'),{source_url:url});
 assert.equal(p.ok,true);assert.notEqual(p.fields.name,name);
});
