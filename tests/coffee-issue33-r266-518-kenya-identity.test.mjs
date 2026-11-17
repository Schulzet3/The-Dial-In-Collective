import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo';
const chosenName='Embu Kenya';
const selectedDescription='<p>SINGLE ORIGIN</p><p>REGION /// Gicherori, Embu County</p><p>PRODUCER /// Kibugu FCS, Gikirima Factory</p><p>COUNTRY /// Kenya</p><p>TASTING NOTES /// peach, black tea, green apple, honey</p><p>PROCESS /// Washed</p><p>VARIETY /// SL 34, SL 28</p><p>ALTITUDE MASL /// 1800-1900</p>';
const html=(name=chosenName,description=selectedDescription,adjacent='')=>'<html><head><meta property="og:type" content="product"></head><body><nav>All coffees</nav><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+description+'</div></article></main>'+adjacent+'</body></html>';
const parse=(name=chosenName,description=selectedDescription,adjacent='')=>extractPublicCoffeeFacts(html(name,description,adjacent),{source_url});
test('exact original #518 official current selected H1 remains Embu Kenya rather than stale index Kenya',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[chosenName]);
 const r={number:518,status:'FETCHED',parser_ok:true,selected_h1:[chosenName],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:chosenName},archived_coffee:chosenName,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([518],[r]),[]);
 assert.ok(requiredFocusedSourceFailures([518],[r],{negativeIdentityNumbers:[518]}).some(x=>x.reason==='expected_changed_original_identity_not_established'));
});
test('actual selected Embu literal profile preserves only own origin, grower, process, cultivar and flavors',()=>{
 const p=parse();
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosenName,JSON.stringify(p));
 assert.match(p.fields.origin||'',/Gicherori.*Embu.*Kenya/i,JSON.stringify(p));
 assert.match(p.fields.producer||'',/Kibugu FCS.*Gikirima Factory/i,JSON.stringify(p));
 assert.match(p.fields.process||'',/Washed/i,JSON.stringify(p));
 for(const v of ['peach','black tea','green apple','honey'])assert.ok((p.fields.tasting_notes||'').toLowerCase().includes(v),JSON.stringify(p));
 assert.match(p.fields.variety||'',/SL\s?34.*SL\s?28/i,JSON.stringify(p));
 assert.match(String(p.fields.elevation_m||''),/1800\s*-\s*1900/i,JSON.stringify(p));
 assert.ok(!p.fields.decaffeination_method&&!p.fields.release_label,JSON.stringify(p));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url}));
});
test('related seasonal Kenya search result cannot replace chosen Embu fields',()=>{
 const unrelated='<aside class="related-products"><h2>Kenya</h2><p>REGION /// Various Smallholders. TASTING NOTES /// lemonade, blackberry, cranberry, black tea. COUNTRY /// Kenya. PROCESS /// Washed.</p></aside>';
 const p=parse(chosenName,selectedDescription,unrelated);
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosenName);
 assert.doesNotMatch(JSON.stringify(p.fields),/lemonade|blackberry|cranberry|various smallholders/i,JSON.stringify(p));
});
test('old URL handle or old archive facts never alone make a changed currently selected Kenya the same original',()=>{
 const row={number:518,status:'FETCHED',parser_ok:true,archived_coffee:chosenName,current_fields:{name:'Kenya'},selected_h1:['Kenya'],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([518],[row]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 assert.deepEqual(requiredFocusedSourceFailures([518],[row],{negativeIdentityNumbers:[518]}),[]);
 const r=parse('Kenya','<p>COUNTRY /// Kenya</p><p>REGION /// Various Smallholders</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Kenya',JSON.stringify(r));
 assert.doesNotMatch(JSON.stringify(r.fields),/Gicherori|Kibugu|Gikirima|Embu County|peach|green apple/i);
});
test('unavailable official source or spoofed selected heading cannot produce valid positive certification',()=>{
 assert.ok(requiredFocusedSourceFailures([518],[{number:518,status:'UNAVAILABLE',parser_ok:false}]).some(x=>x.reason==='required_official_source_not_fetched'));
 const wrong={number:518,status:'FETCHED',parser_ok:true,archived_coffee:chosenName,current_fields:{name:'Kenya'},selected_h1:['Kenya'],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([518],[wrong]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
