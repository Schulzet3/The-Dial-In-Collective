// Issue #33 R297: one selected original603 #585, not corpus certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Peru Cafe Canchaque – Natural, American';
const url='https://www.thecoffeeexchange.com/products/peru-cafe-canchaque-natural-process-american-roast-limited-offering';
const chosen='<p>Fair Trade / Organic • Canchaque • 1500-2350 meters</p>'+
 '<p>Flavor Notes: Milk Chocolate, Caramel, Vanilla, Medium Body</p>'+
 '<p>The Canchaque region of northern Piura is one of the only producers of unwashed natural process coffees in Peru.</p>'+
 '<p>American Roast: Our lightest roast, characterized by a dry surface.</p>'+
 '<p>Full City Roast: A medium/light roast, slightly darker than our American.</p>'+
 '<select><option selected>American Roast - 1 lb</option></select>';
const page=(name=title,body=chosen)=>
 '<html><head><meta property="og:site_name" content="Coffee Exchange"></head>'+
 '<body><main><article class="product"><h1>'+name+'</h1><div class="description">'+body+
 '</div></article></main><aside class="related-products"><h2>Other Ethiopian</h2>'+
 '<p>Pineapple, Dark Roast, Washed</p></aside></body></html>';
test('R297 focused acceptance requires one fetched identity-matched current source',()=>{
 const good={number:585,archived_coffee:title,status:'FETCHED',parser_ok:true,
 selected_h1:[title],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name:title},
 add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([585],[good]),[]);
 for(const invalid of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
 [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
 [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([585],invalid).length>0);
});
test('R297 selected name is exact, not a different roast variant or another coffee',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 for(const name of ['Peru Cafe Canchaque – Natural, Full City','Peru Churupampa','Ethiopia Natural'])
  assert.equal(identicalCurrentSelectedTitle(title,name,name),false);
});
test('R297 parser preserves selected natural process and own notes, editable Add Coffee and source review',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.match(String(p.fields.process||''),/natural/i);
 for(const note of ['Chocolate','Caramel','Vanilla'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/pineapple/i);
 assert.doesNotMatch(String(p.fields.process||''),/washed/i);
 assert.notEqual(p.fields.roast_level,'Dark');
 assert.ok(!p.fields.decaffeination_method);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R297 swapped selected H1 is not archived coffee identity',()=>{
 const name='Peru Cafe Canchaque – Natural, Full City';
 const p=extractPublicCoffeeFacts(page(name,
  '<p>Full City Roast: medium/light</p><p>Flavor Notes: Cocoa</p>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.name,title);
 assert.equal(identicalCurrentSelectedTitle(title,name,p.fields.name),false);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/milk chocolate|vanilla/i);
});

test('R297 stale published SEO flavor must not replace direct selected notes',()=>{
 const stale='<meta name="description" content="Flavor Notes: Honey, Malt, Candied Lemon.">'+
  '<meta property="og:description" content="Flavor Notes: Honey, Malt, Candied Lemon.">';
 const source=page().replace('<meta property="og:site_name" content="Coffee Exchange">',stale+
  '<meta property="og:site_name" content="Coffee Exchange">');
 const p=extractPublicCoffeeFacts(source,{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 for(const note of ['chocolate','caramel','vanilla'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/honey|malt|lemon/i);
 assert.ok(!p.seo_fallback_fields?.includes('tasting_notes'));
});
