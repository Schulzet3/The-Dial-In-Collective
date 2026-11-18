// Issue #33 R296: one original603 source #489, not all-coffee certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Rwanda - Sholi Cooperative - Washed';
const url='https://www.ghosttowncoffee.com/products/rwanda-sholi-coop-natural-copy';
const selected='<p>Abateraninkunga ba Sholi ("Sholi") means "Mutual Assistance".</p>'+
 '<p>This Coop is located in the Muhanga District, and nearly half its members are women.</p>'+
 '<p>Tasting Notes: Baker&#39;s Chocolate, Raspberry, Toasted Coconut, Vanilla</p>'+
 '<p>Altitude: 1800-2000 masl</p><p>Varietal: Bourbon</p>'+
 '<p>Process: Washed</p><p>Farm/Region: Muganga District, Southern Province</p>';
const page=(title=name,description=selected)=>
 '<html><head><title>Related Natural Rwanda</title><meta property="og:site_name" content="Ghost Town Coffee Roasters">'+
 '<meta name="description" content="Related other coffee: tropical banana, natural, medium roast"></head>'+
 '<body><main><article class="product"><h1>'+title+'</h1><div class="description">'+description+
 '</div></article></main><aside class="related-products"><h2>Different Rwanda - Natural</h2>'+
 '<p>Tasting Notes: Pineapple, Banana. Producer: Other Farmer. Process: Natural.</p></aside></body></html>';

test('R296 focused acceptance requires a fetched identity-matched parsed current selected source',()=>{
 const good={number:489,archived_coffee:name,status:'FETCHED',parser_ok:true,
  selected_h1:[name],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([489],[good]),[]);
 for(const invalid of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([489],invalid).length>0);
});

test('R296 exact selected Washed H1 not recycled natural-copy slug or another coffee',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[name]);
 assert.equal(identicalCurrentSelectedTitle(name,name,name),true);
 for(const other of ['Rwanda - Sholi Cooperative - Natural','Different Rwanda - Natural','Rwanda 2027 Lot'])
  assert.equal(identicalCurrentSelectedTitle(name,other,other),false);
});

test('R296 parser uses selected labeled washed and sensory text, excluding sibling SEO and URL slug',()=>{
 const result=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,name);
 for(const note of ['chocolate','raspberry','coconut','vanilla'])
  assert.match(String(result.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(result.fields.tasting_notes||''),/banana|pineapple/i);
 assert.match(String(result.fields.process||''),/washed/i);
 assert.doesNotMatch(String(result.fields.process||''),/natural/i);
 assert.doesNotMatch(String(result.fields.producer||''),/other farmer/i);
 assert.ok(!result.fields.decaffeination_method);
 assert.ok(!result.fields.roast_level);
 assert.match(coffeeUrlPreviewMarkup(result),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...result,source_url:url})?.type,'coffee_source_review');
});

test('R296 original Sholi is not certified when current exact selected H1 changes',()=>{
 const other='Rwanda - Different Estate Natural';
 const result=extractPublicCoffeeFacts(page(other,
  '<p>Tasting Notes: Pineapple and Blueberry</p><p>Process: Natural</p>'),{source_url:url});
 assert.equal(result.ok,true);
 assert.notEqual(result.fields.name,name);
 assert.equal(identicalCurrentSelectedTitle(name,other,result.fields.name),false);
 assert.doesNotMatch(String(result.fields.tasting_notes||''),/chocolate|raspberry|coconut|vanilla/i);
});

test('R296 two printed district spellings are not independent proof of a single current district',()=>{
 const shown=productMarkup(page());
 assert.match(shown,/Muhanga District/i);
 assert.match(shown,/Muganga District/i);
 assert.notEqual('Muhanga District','Muganga District');
 assert.doesNotMatch(String(extractPublicCoffeeFacts(page(),{source_url:url}).fields.tasting_notes||''),
  /Muhanga|Muganga/i,'place context is not a taste note');
});
