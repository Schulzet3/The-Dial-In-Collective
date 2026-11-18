// Issue #33 R299 selected original603 #603, not automated full corpus certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Nicaragua Segovia, 1 lb (16 oz)';
const url='https://zekescoffee.com/products/nicaragua-segovia-1-lb-16-oz';
const own='<p>Over 2,300 small-scale farmers have joined together to create the Central Multiple Service Cooperative, better known as PRODECOOP.</p>'+
 '<p>The initial coffee processing takes place on the individual farms. Sun-drying and final processing takes place at the coop’s dry mill, Las Segovias, located in the town of Palacaguina.</p>'+
 '<p>PRODECOOP carefully supervises all phases of coffee production and processing to ensure strict quality control.</p>'+
 '<p>Full-bodied and low acidity with notes of almond, cocoa and caramel.</p>';
function page(name=title,description=own,seo=''){
 return '<html><head><meta property="og:site_name" content="Zeke&#39;s Coffee">'+seo+'</head>'+
 '<body><main><article class="product"><h1>'+name+'</h1><div class="description">'+description+
 '</div></article></main><aside class="related-products"><h2>Other coffees</h2>'+
 '<p>Colombia Gesha: Blueberry, Anaerobic, Dark Roast.</p></aside></body></html>';
}
test('R299 requires one real selected matching original603 source and Add Coffee/Source Review',()=>{
 const good={number:603,archived_coffee:title,status:'FETCHED',parser_ok:true,
  selected_h1:[title],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:title},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([603],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([603],bad).length>0);
});
test('R299 selected title exact, no stale lot/other coffee equivalence',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 for(const name of ['Nicaragua Segovia, 2024 harvest','Nicaragua Segovia Decaf','Kenya Segovia'])
  assert.equal(identicalCurrentSelectedTitle(title,name,name),false);
});
test('R299 dry-mill Palacaguina is not farm origin',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,title);
 assert.doesNotMatch(String(r.fields.origin||''),/palacaguina/i,
  'a cooperative dry-mill city cannot be auto-identified as farm region');
 assert.doesNotMatch(String(r.fields.producer||''),/las segovias/i,
  'the dry mill is not the farmer or cooperative');
});
test('R299 selected sensory survives unrelated coffee sidebar and SEO',()=>{
 const seo='<meta name="description" content="Another coffee: Blueberry Anaerobic Dark Roast">'+
  '<meta property="og:description" content="Another coffee, Tropical Citrus, Gesha">';
 const r=extractPublicCoffeeFacts(page(title,own,seo),{source_url:url});
 assert.equal(r.ok,true);
 for(const n of ['almond','cocoa','caramel'])
  assert.match(String(r.fields.tasting_notes||''),new RegExp(n,'i'));
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/blueberry|tropical citrus|gesha/i);
 assert.ok(!r.seo_fallback_fields?.includes('tasting_notes'));
});
test('R299 drying/certification narrative does not invent process, variety, decaf or roast',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.ok(!r.fields.decaffeination_method&&!r.fields.roast_level&&!r.fields.release_label);
 assert.ok(!r.fields.variety);
 assert.notEqual(r.fields.process,'Natural','sun-drying at dry mill is not necessarily natural fermentation');
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('R299 foreign selected H1 does not inherit original Segovia claims',()=>{
 const other='Kenya Coffee 2025';
 const r=extractPublicCoffeeFacts(page(other,'<p>Flavors: Tropical Fruit and Guava.</p>'),{source_url:url});
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.name,title);
 assert.equal(identicalCurrentSelectedTitle(title,other,r.fields.name),false);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/almond|caramel/i);
});
