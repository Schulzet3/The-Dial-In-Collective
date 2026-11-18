// Issue #33 R298: focused original603 #588, not 603-case semantic certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const title='The Pleasant';
const url='https://www.unlockedcoffee.com/products/the-pleasant';
const chosen=[
 '<p>Our favorite Colombia varietal "Chiroso" creates a pleasant cup.</p>',
 '<p>Tasting: Floral, green tea, stone fruit, honey</p>',
 '<p>Region Colombia Antioquia</p>',
 '<p>24 hour cherry fermentation</p>',
 '<p>Process: Washed</p>',
 '<p>Varietal Chiroso</p>',
 '<p>What is special about this varietal?</p>',
 '<p>The Chistoso varietal is a hybrid developed in Colombia. Chistoso has its own flavor profile.</p>'
].join('');
function page(name=title,body=chosen,seo=''){
 return '<html><head>'+seo+'<meta property="og:site_name" content="Unlocked Coffee"></head>'+
 '<body><main><article class="product"><h1>'+name+'</h1><div class="description">'+body+
 '</div></article></main><aside class="related-products"><h2>Another coffee</h2>'+
 '<p>Honduras Gesha: Tropical Citrus, Anaerobic, Dark Roast</p></aside></body></html>';
}
test('R298 requires one actual fetched selected source, identity, Add Coffee and source review',()=>{
 const good={number:588,archived_coffee:title,status:'FETCHED',parser_ok:true,
  selected_h1:[title],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:title},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([588],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([588],bad).length>0);
});
test('R298 selected H1 must not silently accept a neighboring lot or another product',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 for(const other of ['The Pleasant - Gesha 2025','Honey Sky','The Pleasant Decaf'])
  assert.equal(identicalCurrentSelectedTitle(title,other,other),false);
});
test('R298 own explicit region, washed, Chiroso and four tasting notes outrank varietal education',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.match(String(p.fields.origin||''),/Antioquia.*Colombia/i);
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.variety||''),/Chiroso/i);
 assert.doesNotMatch(String(p.fields.variety||''),/Chistoso/i);
 for(const note of ['Floral','Green Tea','Stone Fruit','Honey'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/tropical citrus/i);
});
test('R298 varietal education/fermentation does not invent chosen process, grower or roast',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.process,'Washed');
 assert.ok(!p.fields.producer,'varietal generalities do not name this lot farmer');
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(!p.fields.release_label);
 assert.ok(!p.fields.roast_level,'no selected roast published in focused source');
});
test('R298 unrelated sidebar and hostile SEO do not replace the current selected product',()=>{
 const seo='<meta name="description" content="Other coffee: Gesha, tropical citrus, anaerobic, dark roast">'+
 '<meta property="og:description" content="Other coffee: Honduras Gesha">';
 const p=extractPublicCoffeeFacts(page(title,chosen,seo),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.equal(p.fields.process,'Washed');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/tropical citrus|gesha/i);
 assert.doesNotMatch(String(p.fields.variety||''),/gesha|chistoso/i);
 assert.ok(!(p.seo_fallback_fields||[]).includes('tasting_notes'));
});
test('R298 member can review or edit; source parsing never saves a coffee automatically',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});


test('R298 bare region guard rejects two conflicting selected labels and unrelated historic/education',()=>{
 const disagreement=extractPublicCoffeeFacts(page(title,chosen+'<p>Region Colombia Cauca</p>'),{source_url:url});
 assert.equal(disagreement.ok,true);
 assert.notEqual(disagreement.fields.origin,'Antioquia, Colombia');
 const historic=extractPublicCoffeeFacts(page(title,chosen.replace('<p>Region Colombia Antioquia</p>',
  '<p>Previously Region Colombia Antioquia</p>')),{source_url:url});
 assert.equal(historic.ok,true);
 assert.notEqual(historic.fields.origin,'Antioquia, Colombia');
 const unrecognized=extractPublicCoffeeFacts(page(title,chosen.replace('<p>Region Colombia Antioquia</p>',
  '<p>Region Marshmallow Antioquia</p>')),{source_url:url});
 assert.notEqual(unrecognized.fields.origin,'Antioquia, Colombia');
});
