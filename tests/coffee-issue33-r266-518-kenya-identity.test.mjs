import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo';
const live_name='Kenya';
const archived_name='Embu Kenya';
const own='<p>SINGLE ORIGIN</p><p>COUNTRY /// Kenya</p><p>TASTING NOTES /// lemonade, blackberry, cranberry &amp; black tea</p><p>REGION /// Various Smallholders</p><p>PROCESS /// Washed</p><p>AUTO DELIVERY WILL ROTATE WITH DIFFERENT REGIONS BASED ON COFFEE AVAILABILITY. ROAST PROFILE AND COUNTRY WILL REMAIN THE SAME.</p>';
const html=(name=live_name,ownText=own,adjacent='')=>'<html><head><meta property="og:type" content="product"></head><body><nav>ALL COFFEE</nav><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+ownText+'</div></article></main>'+adjacent+'</body></html>';
const parse=(name,description,adjacent)=>extractPublicCoffeeFacts(html(name,description,adjacent),{source_url});
test('original #518 recycled handle does not silently certify the archived Embu Kenya coffee',()=>{
 const markup=productMarkup(html());
 assert.deepEqual(selectedProductHeadings(markup),[live_name]);
 assert.notEqual(live_name,archived_name);
 const r={number:518,status:'FETCHED',parser_ok:true,selected_h1:[live_name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,current_fields:{name:live_name},archived_coffee:archived_name,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([518],[r],{negativeIdentityNumbers:[518]}),[]);
 assert.ok(requiredFocusedSourceFailures([518],[r]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 assert.ok(requiredFocusedSourceFailures([518],[{...r,selected_heading_identity_verified:true}],{negativeIdentityNumbers:[518]}).some(x=>x.reason==='expected_changed_original_identity_not_established'));
});
test('current selected Kenya literal fields are not the historical Embu lot, and remain editable',()=>{
 const p=parse(live_name,own);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,live_name,JSON.stringify(p));
 assert.match(p.fields.origin||'',/Kenya/i,JSON.stringify(p));
 assert.match(p.fields.process||'',/Washed/i,JSON.stringify(p));
 for(const flavor of ['lemonade','blackberry','cranberry','black tea'])
  assert.ok((p.fields.tasting_notes||'').toLowerCase().includes(flavor),JSON.stringify(p));
 assert.ok(!p.fields.producer&&!p.fields.variety&&!p.fields.elevation_m&&!p.fields.decaffeination_method,JSON.stringify(p));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url}));
});
test('related old Embu and other coffee facts must not leak into selected Kenya preview',()=>{
 const side='<aside class="related-products"><h2>Related Products</h2><h3>Embu Kenya</h3><p>Gicherori, Embu County. Kibugu FCS, Gikirima Factory. SL34, SL28, 1800-1900 MASL. Peach, green apple, honey. Dark Roast.</p></aside>';
 const p=parse(live_name,own,side);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,live_name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Gicherori|Kibugu|Gikirima|SL\s?34|SL\s?28|peach|green apple|dark roast/i);
 assert.ok(!p.fields.producer&&!p.fields.variety&&!p.fields.elevation_m,JSON.stringify(p));
});
test('unpublished source values stay blank, not inferred from a stale URL handle',()=>{
 const p=parse(live_name,'<p>COUNTRY /// Kenya</p><p>REGION /// Various Smallholders</p>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,live_name);
 assert.ok(!p.fields.producer&&!p.fields.variety&&!p.fields.elevation_m&&!p.fields.decaffeination_method,JSON.stringify(p));
 assert.doesNotMatch(JSON.stringify(p.fields),/Kichwa|Tembo|Embu|Gicherori|Kibugu/i);
});
test('unavailable or old-identity seller source cannot pass a current negative identity receipt',()=>{
 const failures=requiredFocusedSourceFailures([518],[{number:518,status:'UNAVAILABLE',parser_ok:false}],{negativeIdentityNumbers:[518]});
 assert.ok(failures.some(f=>f.reason==='required_official_source_not_fetched'),JSON.stringify(failures));
 const old={number:518,status:'FETCHED',parser_ok:true,archived_coffee:archived_name,selected_h1:[archived_name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:archived_name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([518],[old],{negativeIdentityNumbers:[518]}).some(f=>f.reason==='expected_changed_original_identity_not_established'));
});
