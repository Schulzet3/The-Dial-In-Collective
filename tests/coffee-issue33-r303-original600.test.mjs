// Issue #33 R303: current selected original603 #600; no entire-corpus certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='VIETNAM LAM DONG';
const url='https://yellowstonecoffee.com/products/vietnam-lam-dong';
const own='<p>Mellow &amp; Easy-Going - Medium Roast</p>'+
 '<p>NOTES: MOCHA, CASHEW, HALVA</p>'+
 '<p>Our first Vietnamese coffee, grown by a collective of independent farmers in Lam Dong Province. Most coffee grown in Vietnam is robusta. This one is arabica.</p>'+
 '<h3>Origin</h3><p>Lam Dong, Vietnam</p>'+
 '<h3>Process</h3><p>Washed and Sun Dried</p>'+
 '<h3>Cooperative</h3><p>Dung K&#39;No Commune</p>';
function page(name=title,description=own,seo=''){
 return '<html><head><meta property="og:site_name" content="Yellowstone Coffee Roasters">'+seo+
  '</head><body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="description">'+description+'</div></article></main>'+
  '<aside class="related-products"><h2>Other coffees</h2>'+
  '<p>Kenya Blackcurrant, Dark Roast, Anaerobic.</p></aside>'+
  '<footer>Our roastery is in Bozeman, Montana. Explore French Press brewing and sustainable bags.</footer>'+
  '</body></html>';
}
test('R303 source gate demands exactly one real selected product and rendered manual Add Coffee/Source Review',()=>{
 const good={number:600,archived_coffee:title,status:'FETCHED',parser_ok:true,
  selected_h1:[title],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:title},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([600],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([600],bad).length>0);
});
test('R303 exact original identity rejects changed selected lot or unrelated coffee',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 for(const name of ['VIETNAM LAM DONG 2024','VIETNAM ROBUSTA DECAF','KENYA LAM DONG'])
  assert.equal(identicalCurrentSelectedTitle(title,name,name),false);
});
test('R303 direct selected notes and farm process are separate from origin and roastery',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,title);
 assert.equal(r.fields.roast_level,'Medium');
 assert.match(String(r.fields.tasting_notes||''),/mocha/i);
 assert.match(String(r.fields.tasting_notes||''),/cashew/i);
 assert.match(String(r.fields.tasting_notes||''),/halva/i);
 assert.match(String(r.fields.origin||''),/lam dong/i);
 assert.match(String(r.fields.origin||''),/vietnam/i);
 assert.match(String(r.fields.process||''),/washed/i);
 assert.doesNotMatch(String(r.fields.decaffeination_method||''),/water process/i);
 assert.doesNotMatch(String(r.fields.elevation_m||''),/bozeman/i);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('R303 adjacent SEO and sibling coffee do not override chosen sensory or process',()=>{
 const seo='<meta name="description" content="Kenya Blackcurrant, Dark Roast, Anaerobic">'+
  '<meta property="og:description" content="Another coffee: pineapple and jasmine">';
 const r=extractPublicCoffeeFacts(page(title,own,seo),{source_url:url});
 assert.equal(r.ok,true);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/blackcurrant|pineapple|jasmine/i);
 assert.doesNotMatch(String(r.fields.process||''),/anaerobic/i);
 assert.notEqual(r.fields.roast_level,'Dark');
});
test('R303 a recycled original URL displaying another product is not certified',()=>{
 const other='KENYA LAM DONG DECAF';
 const r=extractPublicCoffeeFacts(page(other,'<p>NOTES: PINEAPPLE</p><p>Dark Roast</p>'),{source_url:url});
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.name,title);
 assert.equal(identicalCurrentSelectedTitle(title,other,r.fields.name),false);
});
