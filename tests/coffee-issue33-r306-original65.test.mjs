// Issue #33 R306: exact original603 #65 Night Vision Kenya, selected-product only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='NIGHT VISION - MEDIUM ROAST - KENYA';
const url='https://combatcoffeetea.com/products/night-vision-medium-roast-kenya';
const own='<p>Mt. Kenya southern slopes are home to small coffee shambas, or gardens. Shambas are nurtured by smallholder farmers, who deliver ripe cherries to their cooperative pulping factories. This coffee comes from Embu, Kirinyaga and Nyeri counties; farmers work together in co-ops.</p><p>Flavors: Cocoa, Fruity, Sweet</p><p>Processing: Hand Picked, Washed</p><p>Varieties: SL 28 and SL 34</p><p>Location: Kiambu</p><p>Elevation: 5577ft</p>';
const html=(name=title,extra='',suffix='')=>'<html><head><meta property="og:site_name" content="Combat Coffee">'+extra+'</head><body><main><article class="product"><h1>'+name+'</h1>'+own+'</article></main>'+suffix+'</body></html>';
test('R306 selected own product H1 and member explicit review',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[title]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R306 selected current Kenya source over retailer or global country lists',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/Kenya|Kiambu/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Nebraska|Brazil|Colombia|Sumatra/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|licorice|tobacco/i);
});
test('R306 selected direct sensory and washed process cannot take sibling notes',()=>{
 const sibling='<aside class="related-products"><h2>White Knuckles Sumatra</h2><p>Natural, Blueberry, Licorice, Dark roast, Huila Colombia</p></aside>';
 const p=extractPublicCoffeeFacts(html(title,'',sibling),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|licorice/i);
 assert.doesNotMatch(String(p.fields.process||''),/natural/i);
});
test('R306 unrelated SEO or merchant footer cannot rewrite selected origin/roast',()=>{
 const seo='<meta name="description" content="Brazil dark roast natural, tobacco and licorice"><meta property="og:description" content="Colombia Gesha blueberry">';
 const p=extractPublicCoffeeFacts(html(title,seo,'<footer>Our roasting warehouse in Lincoln Nebraska. Other Sumatra coffees.</footer>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.origin||''),/Brazil|Colombia|Lincoln|Nebraska|Sumatra/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/tobacco|licorice|blueberry/i);
});
test('R306 changed selected identity / unavailable source fail closed',()=>{
 const changed='WHITE KNUCKLES - DARK ROAST - SUMATRA';
 const p=extractPublicCoffeeFacts(html(changed),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(title,changed,p.fields.name),false);
 const good={number:65,archived_coffee:title,status:'FETCHED',parser_ok:true,selected_h1:[title],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name:title},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([65],[good]),[]);
 for(const invalid of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([65],invalid).length>0);
});
