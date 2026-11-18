// Issue #33 R293: original frozen #520 missing-literal case; no full-corpus certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const chosen='Ethiopia, Dry Processed - Sulladjah Coffee Beans';
const archived='Ethiopia, Dry Processed - Sulladjah';
const url='https://www.lineageroasting.com/products/copy-of-kenya-gaikundo-2';
const own='<p>Country: Ethiopia, Limu, Abana Estate</p><p>Elevation: 2100m</p><p>Processing Method: Dried In Cherry</p><p>Variety: Heirloom</p><p>Harvest Period: November - January</p><p>Tasting Notes: Caramel, Fig</p>';
const page=(ownHtml=own,other='<h2>Colombia Select Decaf</h2><p>Floral, berries, Washed, sugarcane decaf</p>',name=chosen)=>
 '<html><head><title>Unrelated old Kenya Gaikundo</title><meta name="description" content="stale Kenya floral, rose decaf"></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+ownHtml+'</div></article></main><aside class="related-products">'+other+'</aside></body></html>';

test('original520 focused acceptance fails closed for missing/unavailable/invalid selected product or UI',()=>{
 const good={number:520,archived_coffee:archived,status:'FETCHED',parser_ok:true,selected_h1:[chosen],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:chosen},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([520],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],[{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([520],bad).length>0);
});
test('exact original520 product identity accepts only literal Coffee Beans commerce suffix',()=>{
 assert.equal(identicalCurrentSelectedTitle(archived,chosen,chosen),true);
 for(const wrong of ['Ethiopia, Dry Processed - Sulladjah New Lot Coffee Beans','Colombia Select Decaf Coffee Beans','Ethiopia, Dry Processed - Other Coffee Beans'])
  assert.equal(identicalCurrentSelectedTitle(archived,wrong,wrong),false);
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[chosen]);
});
test('selected direct two flavors do not inherit old oracle floral or sibling decaf/washed',()=>{
 const parsed=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,chosen);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/floral|rose|berries/i);
 assert.doesNotMatch(String(parsed.fields.decaffeination_method||''),/sugarcane|ea/i);
 assert.doesNotMatch(String(parsed.fields.process||''),/washed/i);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:url}));
});
test('other selected product does not inherit historic Sulladjah identity or its tasting',()=>{
 const parsed=extractPublicCoffeeFacts(page('<p>Origin: Kenya</p><p>Tasting Notes: lime, lemon</p>','', 'Kenya Gaikundo Coffee Beans'),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.notEqual(parsed.fields.name,chosen);
 assert.equal(identicalCurrentSelectedTitle(archived,'Kenya Gaikundo Coffee Beans',parsed.fields.name),false);
});
