// Issue #33 R302: original603 #591 exact selected Vail decaf, not global certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Decaf Ethiopian Yirgacheffe SW';
const url='https://www.vailcoffee.com/products/reserve-coffee-4';
const own='<p>LIGHT ROAST</p>'+
 '<p>Grower: Oromia Coffee Farmers Cooperative</p>'+
 '<p>Variety: Indigenous heirloom</p>'+
 '<p>Region: Oromia Region, Ethiopia</p>'+
 '<p>Profile: Sweet Dark Berries, Jasmine, Hint of Cocoa</p>'+
 '<p>Altitude: 1550-2200 masl</p>'+
 '<p>Process: Full natural & dried on raised beds</p>'+
 '<p>Certifications: Decaf, Fair Trade, Organic</p>'+
 '<p>Ethiopia FTO Natural Yirgacheffe Swiss Water Process Decaf is sourced from Oromia.</p>';
function page(name=title,description=own,seo=''){
 return '<html><head><meta property="og:site_name" content="Vail Mountain Coffee &amp; Tea">'+seo+'</head>'+
  '<body><main><article class="product"><h1>'+name+'</h1><div class="description">'+description+
  '</div></article></main><aside class="related-products"><h2>Other coffees</h2>'+
  '<p>Kenya Blackcurrant, Dark Roast, Washed.</p></aside>'+
  '<footer>All our coffees are roasted at 8,000 feet in Colorado.</footer></body></html>';
}
test('R302 requires one actual selected public H1/parser/Add Coffee and source-review',()=>{
 const good={number:591,archived_coffee:title,status:'FETCHED',parser_ok:true,
  selected_h1:[title],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:title},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([591],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([591],bad).length>0);
});
test('R302 chosen identity cannot be replaced by another decaf or reused URL lot',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 for(const other of ['Decaf Ethiopian Yirgacheffe Natural 2024','Ethiopia Yirgacheffe Caffeinated','Kenya Decaf'])
  assert.equal(identicalCurrentSelectedTitle(title,other,other),false);
});
test('R302 independent farm processing and Swiss Water decaffeination facts are distinct',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,title);
 assert.notEqual(r.fields.process,'Washed');
 assert.doesNotMatch(String(r.fields.process||''),/swiss\s+water/i);
 assert.notEqual(r.fields.decaffeination_method,'Natural');
 assert.doesNotMatch(String(r.fields.elevation_m||''),/8000/i);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('R302 selected own notes cannot inherit unrelated page SEO and sibling flavors',()=>{
 const seo='<meta name="description" content="Kenya Blackcurrant, Dark Roast, Washed">'+
  '<meta property="og:description" content="Another coffee: pineapple and cocoa nibs">';
 const r=extractPublicCoffeeFacts(page(title,own,seo),{source_url:url});
 assert.equal(r.ok,true);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/blackcurrant|pineapple|cocoa nibs/i);
 assert.doesNotMatch(String(r.fields.process||''),/washed/i);
 assert.doesNotMatch(String(r.fields.elevation_m||''),/8000/i);
});
test('R302 changed H1 does not certify original source despite identical URL',()=>{
 const other='Kenya Caffeinated Natural';
 const r=extractPublicCoffeeFacts(page(other,
  '<p>Profile: Blackcurrant, Pineapple</p><p>Process: Washed</p>'),{source_url:url});
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.name,title);
 assert.equal(identicalCurrentSelectedTitle(title,other,r.fields.name),false);
});
