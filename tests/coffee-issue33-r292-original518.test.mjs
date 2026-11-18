// Issue #33 R292: one selected original603 #518, not 603-case certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Embu Kenya';
const url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo';
const own='<p>REGION /// Gicherori, Embu County</p><p>PRODUCER /// Kibugu FCS, Gikirima Factory</p><p>COUNTRY /// Kenya</p><p>TASTING NOTES /// peach, black tea, green apple, honey</p><p>PROCESS /// Washed</p><p>VARIETY /// SL 34, SL 28</p><p>ALTITUDE MASL /// 1800-1900</p>';
const page=(body=own,related='',heading=name)=>'<html><head><title>Other outdated Colombia microlot</title><meta name="description" content="Old unrelated Colombia strawberry decaf"></head><body><main><article class="product"><h1>'+heading+'</h1><div class="description">'+body+'</div></article></main><aside class="related-products">'+related+'</aside></body></html>';

test('original518 source acceptance rejects missing duplicate inaccessible or unverified identity and UI',()=>{
 const good={number:518,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([518],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],[{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([518],bad).length>0);
});
test('chosen Embu product direct facts win over stale SEO and related product',()=>{
 const html=page(own,'<h2>Guji Ethiopia- Organic</h2><p>Natural, blackberry preserves, earl grey, Hambela Washing Station</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[name]);
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,name);
 assert.match(String(parsed.fields.origin||''),/kenya/i);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/blackberry preserves|earl grey|strawberry/i);
 assert.doesNotMatch(String(parsed.fields.producer||''),/hambela|wilder garcia/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:url}));
});
test('current selected factory and cooperative do not imply a uniquely named farmer or 2026 harvest',()=>{
 const html=page(own+'<p>Gikirima is one of five factories operated by Kibugu Farmers Cooperative Society, serving smallholder farmers.</p>',
  '<h2>Gold Medal Global Coffee Awards 2026</h2><p>Wilder Garcia Geisha producer</p>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.doesNotMatch(String(parsed.fields.producer||''),/wilder garcia|named individual farmer/i);
 assert.doesNotMatch(String(parsed.fields.release_label||''),/2026|gold medal/i);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/wilder garcia|gold medal/i);
});
test('recycled Kenya slug does not force archived Embu identity onto changed current selected H1',()=>{
 const parsed=extractPublicCoffeeFacts(page('<p>Origin: Colombia</p><p>Tasting notes: citrus</p>','', 'New Colombia Estate'),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.notEqual(parsed.fields.name,name);
});
