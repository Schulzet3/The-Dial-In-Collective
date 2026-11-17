import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://www.limacoffeeroasters.com/products/wilder-garcia-geisha-microlot';
const chosen='Wilder Garcia Geisha - Microlot';
const facts='<p>PRODUCER /// Wilder Garcia</p><p>REGION /// Cajamarca, Peru</p><p>TASTING NOTES /// Green grape, honeysuckle, coconut water &amp; orange blossom</p><p>PROCESS /// Washed</p><p>VARIETY /// Geisha</p><p>MASL /// 1800</p>';
const page=(description=facts,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><nav>Shop all coffees</nav><main><article class="product"><h1>'+chosen+'</h1><div class="product__description">'+description+'</div></article></main>'+extra+'</body></html>';
const parse=(description=facts,extra='')=>extractPublicCoffeeFacts(page(description,extra),{source_url:url});
test('original #519 selected H1 and exact-source identity guard require the current product',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[chosen]);
 const row={number:519,status:'FETCHED',parser_ok:true,archived_coffee:chosen,current_fields:{name:chosen},selected_h1:[chosen],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([519],[row]),[]);
 assert.ok(requiredFocusedSourceFailures([519],[{...row,current_fields:{name:'Other Microlot'},selected_h1:['Other Microlot'],selected_heading_identity_verified:false}]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
test('own labeled selected Geisha profile preserves farm, process, origin, cultivar and sensory notes',()=>{
 const p=parse();
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen,JSON.stringify(p));
 assert.match(p.fields.producer||'',/Wilder Garcia/i,JSON.stringify(p));
 assert.match(p.fields.origin||'',/Cajamarca.*Peru/i,JSON.stringify(p));
 assert.match(p.fields.process||'',/Washed/i,JSON.stringify(p));
 assert.match(p.fields.variety||'',/Geisha/i,JSON.stringify(p));
 assert.match(String(p.fields.elevation_m||''),/1800/i,JSON.stringify(p));
 for(const flavor of ['green grape','honeysuckle','coconut water','orange blossom'])assert.ok((p.fields.tasting_notes||'').toLowerCase().includes(flavor),JSON.stringify(p));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('seller award date and generic microlot education do not turn into a harvest/release date or tasting notes',()=>{
 const marketing='<p>GOLD WINNER - FILTER WASHED PROCESS CATEGORY - 2026 GLOBAL COFFEE AWARDS</p><p>MICROLOT COLLECTION, 8oz box</p><p>Our Microlots are coffees intentionally selected and are unique in flavor and processes.</p>';
 const p=parse(facts+marketing);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(p.fields.tasting_notes||'',/gold winner|awards|8oz box|collection/i);
 assert.doesNotMatch(String(p.fields.release_label||''),/2026 GLOBAL COFFEE AWARDS/i);
});
test('adjacent seller product and nav notes cannot contaminate selected Wilder Garcia',()=>{
 const adjacent='<aside class="related-products"><h2>Don Alvaro Blandon</h2><p>TASTING NOTES /// papaya, cranberry, maple, toffee</p><p>PRODUCER /// Don Alvaro</p><p>REGION /// Nicaragua</p></aside>';
 const p=parse(facts,adjacent);
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen,JSON.stringify(p));
 assert.doesNotMatch(JSON.stringify(p.fields),/papaya|cranberry|Don Alvaro|Nicaragua/i,JSON.stringify(p));
});
test('unchanged URL handle does not certify a changed current product or unavailable source',()=>{
 const wrong={number:519,status:'FETCHED',parser_ok:true,archived_coffee:chosen,current_fields:{name:'Another Geisha'},selected_h1:['Another Geisha'],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([519],[wrong]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 assert.ok(requiredFocusedSourceFailures([519],[{number:519,status:'UNAVAILABLE',parser_ok:false}]).some(x=>x.reason==='required_official_source_not_fetched'));
});
