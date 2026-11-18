// Issue #33 R305: original603 #60 Tanzania Peaberry, selected seller only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle,sameHandleCollectionAlternate} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const title='Tanzania Peaberry';
const original='https://coffeeroasterlnk.com/products/tanzania-peaberry';
const alternate='https://coffeeroasterlnk.com/collections/coffee/products/tanzania-peaberry';
const description='Experience our Tanzania Peaberry coffee, sourced from the fertile slopes of Mount Kilimanjaro and Mount Meru. This peaberry develops as a single round bean within the coffee cherry. Our medium roast highlights bright acidity and medium body, with notes of lemon, peach, and black tea. Grown at elevations between 1,000 and 1,700 meters, these beans support Tanzanian smallholder farmers.';
function html(name=title,addition='',extra=''){
 return '<html><head><meta property="og:site_name" content="Coffee Roaster">'+extra+'</head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="description">'+
 '<p>Current Lot: Peaberry Washed</p><p>Roast Level:</p>'+
 '<p>Flavor Notes: Citrus, Syrupy, Caramel</p><h2>ABOUT THIS COFFEE</h2><p>'+description+'</p>'+
 addition+'</div></article></main>'+
 '<aside class="related-products"><h2>Colombia</h2><p>Orange, brown sugar and roasted almond; Huila, Colombia; medium roast</p></aside>'+
 '<footer>Roasted in Lincoln, Nebraska. Shop Ethiopia, Burundi, Colombia and Sumatra.</footer></body></html>';
}
test('R305 same selected original product handle only, never another coffee or host',()=>{
 assert.equal(sameHandleCollectionAlternate(original,alternate),alternate);
 assert.equal(sameHandleCollectionAlternate(original,'https://coffeeroasterlnk.com/collections/coffee/products/colombia-medium'),null);
 assert.equal(sameHandleCollectionAlternate(original,'https://example.org/collections/coffee/products/tanzania-peaberry'),null);
});
test('R305 selected H1 is exact and member Add Coffee and Source Review remain explicit',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:original});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[title]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:original})?.type,'coffee_source_review');
});
test('R305 direct selected Tanzania provenance excludes roastery and other coffees',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:original});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/Tanzania/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Lincoln|Nebraska|Colombia|Huila|Ethiopia|Burundi|Sumatra/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/brown sugar|roasted almond|tobacco/i);
});
test('R305 selected merchant facts resist unrelated SEO and sibling descriptions',()=>{
 const seo='<meta name="description" content="Colombia Huila dark roast, natural, orange, chocolate and tobacco">'+
 '<meta property="og:description" content="Related Kenya anaerobic Gesha, strawberry">';
 const p=extractPublicCoffeeFacts(html(title,'',seo),{source_url:original});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.doesNotMatch(String(p.fields.origin||''),/Huila|Colombia|Kenya/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/tobacco|strawberry|brown sugar/i);
 assert.doesNotMatch(String(p.fields.process||''),/natural|anaerobic/i);
});
test('R305 changed H1 or unavailable source is NEVER accepted as original selected identity',()=>{
 const changed='Colombia - Huila Palestina Blend';
 const p=extractPublicCoffeeFacts(html(changed),{source_url:original});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(title,changed,p.fields.name),false);
 const good={number:60,archived_coffee:title,status:'FETCHED',parser_ok:true,selected_h1:[title],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name:title},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([60],[good]),[]);
 for(const invalid of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
   [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
   [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
   assert.ok(requiredFocusedSourceFailures([60],invalid).length>0);
});
