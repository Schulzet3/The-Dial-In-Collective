// Issue #33 R311: original603 #63 Organic Sumatra, selected-product source only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Organic Sumatra';
const url='https://coffeetraders.com/products/organic-sumatra';
const direct='<p>Tasting Notes: Nutty, Spicy, Earthy</p><p>Roast: Medium</p><p>Sourced from the Takengon region within Aceh province in Sumatra, Indonesia, grown by smallholder farms.</p><p>Coffee in Indonesia is often wet-hulled, a regional processing tradition.</p><p>Also available as a Dark Roast.</p>';
const html=(name=title,seo='',tail='')=>'<html><head><meta property="og:site_name" content="Montana Coffee Traders">'+seo+'</head><body><main><article class="product"><h1>'+name+'</h1>'+direct+'</article></main>'+tail+'</body></html>';
test('R311 selected H1 and explicit Add Coffee / Source Review remain separate',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[title]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R311 direct roast Medium is not replaced by link to sibling Dark',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields.roast_level||''),/Dark/i);
});
test('R311 direct sensory beats related dark-coffee flavor and process',()=>{
 const sibling='<aside class="related-products"><h2>Organic Sumatra Dark</h2><p>Dark roast, Blueberry, Licorice, Natural, Colombia</p></aside>';
 const p=extractPublicCoffeeFacts(html(title,'',sibling),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Licorice/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Colombia/i);
 assert.doesNotMatch(String(p.fields.process||''),/Natural/i);
});
test('R311 generic global SEO and Whitefish roastery cannot replace selected farm',()=>{
 const seo='<meta name="description" content="Brazil natural coffee, blueberry and caramel"><meta property="og:description" content="Colombia dark roast">';
 const p=extractPublicCoffeeFacts(html(title,seo,'<footer>Montana Coffee Traders roastery Whitefish, Montana. Ethiopia coffee coming soon.</footer>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.origin||''),/Brazil|Colombia|Whitefish|Montana|Ethiopia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Caramel/i);
});
test('R311 changed product identity, failed source and duplicated capture fail closed',()=>{
 const changed='Organic Sumatra Dark';
 const p=extractPublicCoffeeFacts(html(changed),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(title,changed,p.fields.name),false);
 const good={number:63,archived_coffee:title,status:'FETCHED',parser_ok:true,selected_h1:[title],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name:title},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([63],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([63],bad).length>0);
});
