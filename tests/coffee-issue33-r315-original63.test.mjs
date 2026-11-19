// Issue #33 R315: original603 #63 selected Organic Sumatra direct label vs sibling Dark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://coffeetraders.com/products/organic-sumatra',name='Organic Sumatra';
const own='<p>Tasting Notes: Nutty, Spicy, Earthy</p><p>Roast: Medium</p>'+
 '<p>Sumatra, the largest island in Western Indonesia, has terroir well suited for growing coffee. Sourced from the Takengon region within the province of Aceh, this coffee is grown on small holder farms, less than a few acres.</p>'+
 '<p>Indonesian coffee is known for a processing method unique to this area known as wet-hulled.</p>'+
 '<p>Also available as a Dark Roast.</p>';
const html=(body=own,extra='',head='')=>'<html><head><meta property="og:site_name" content="Montana Coffee Traders">'+head+'</head>'+
 '<body><main><article class="product"><h1>'+name+'</h1>'+body+'</article></main>'+extra+'</body></html>';
test('R315 selected identity, direct flavor and member Add Coffee review',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,name);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
 assert.match(String(p.fields.tasting_notes||''),/nutty/i);
 assert.match(String(p.fields.tasting_notes||''),/spicy/i);
 assert.match(String(p.fields.tasting_notes||''),/earthy/i);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R315 exact selected Medium is not sibling Dark or body descriptor',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);assert.equal(p.fields.roast_level,'Medium');
 assert.ok(!(p.conflicts||[]).some(x=>String(x).includes('roast_level')));
});
test('R315 wet-hulled not silently normalized to Washed or Natural',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);assert.ok(!/^(?:Washed|Natural)$/i.test(String(p.fields.process||'')));
 assert.ok(!p.fields.decaffeination_method);
});
test('R315 exact product geographic origin cannot be merchant address or related product',()=>{
 const related='<aside class="related-products"><h3>Organic Sumatra Dark</h3><p>Dark roast, notes of chocolate, banana, blueberry and natural processed coffee from Guatemala.</p></aside>';
 const seo='<meta name="description" content="Organic Sumatra Dark roast, Guatemala, blueberry, natural">';
 const p=extractPublicCoffeeFacts(html(own,related,seo),{source_url:url});
 assert.equal(p.ok,true);assert.match(String(p.fields.origin||''),/sumatra|indonesia/i);
 assert.doesNotMatch(String(p.fields.origin||''),/guatemala|montana|whitefish/i);
 assert.equal(p.fields.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberr|banana|chocolate/i);
 assert.ok(!/^(?:Washed|Natural)$/i.test(String(p.fields.process||'')));
});
test('R315 missing/changed selected source is not a passing original case',()=>{
 assert.equal(identicalCurrentSelectedTitle(name,'Organic Sumatra Dark','Organic Sumatra Dark'),false);
 const good={number:63,archived_coffee:name,status:'FETCHED',parser_ok:true,
 selected_h1:[name],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name},
 add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([63],[good]),[]);
 for(const bad of [[],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],
 [{...good,selected_heading_identity_verified:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([63],bad).length>0);
});
