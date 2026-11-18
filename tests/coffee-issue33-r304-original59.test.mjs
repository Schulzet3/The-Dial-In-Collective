// Issue #33 R304: single original603 #59, preserve the seller's selected literal facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle,sameHandleCollectionAlternate} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Nicaragua - Pumpkin Spice- Pacamara';
const url='https://coffeeroasterlnk.com/products/nicaragua-pumpkin-spice-pacamara';
const alternate='https://coffeeroasterlnk.com/collections/coffee/products/nicaragua-pumpkin-spice-pacamara';
const selected='<p>This one needs a quick explanation, because the name sets off alarms. There is no flavoring sprayed on these beans, and nothing gets added after roasting. What happened is that Gold Mountain sealed ripe Pacamara cherries in a tank without oxygen, fermented them twice, and put real pumpkin spice in with them. The spice went in with the fruit, at the farm, weeks before the coffee ever saw a roaster. Everything you taste came in through fermentation.</p>'+
 '<p>It&#39;s the same Pacamara as our Brix Breaker and our Washed Apple, which makes it the wildest stop on the tour. Pumpkin pie and warm cinnamon, with the fruit sweetness of the varietal still sitting underneath.</p>';
function page(name=title,story=selected,metadata=''){
 return '<html><head><meta property="og:site_name" content="Coffee Roaster">'+metadata+
 '</head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+story+'</div></article></main>'+
 '<aside class="related-products"><h2>Other coffees</h2><p>Brix Breaker: papaya, blackberry, natural drying. Washed Apple: depulped, washed, peach.</p></aside>'+
 '<footer>Roasting in Lincoln, Nebraska. Browse all Nicaragua, Guatemala, Kenya and Sumatra coffees.</footer></body></html>';
}
test('R304 selected official URL alternate is strictly same-host same-product-handle',()=>{
 assert.equal(sameHandleCollectionAlternate(url,alternate),alternate);
 assert.equal(sameHandleCollectionAlternate(url,'https://coffeeroasterlnk.com/collections/coffee/products/nicaragua-brix-breaker-pacamara'),null);
 assert.equal(sameHandleCollectionAlternate(url,'https://example.org/collections/coffee/products/nicaragua-pumpkin-spice-pacamara'),null);
});
test('R304 direct current chosen identity does not turn flavor or cultivar words into growing origin',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[title]);
 assert.equal(p.fields.origin,'Nicaragua');
 assert.doesNotMatch(String(p.fields.origin||''),/pumpkin|spice|pacamara|lincoln|nebraska/i);
 assert.match(String(p.fields.variety||''),/pacamara/i);
 assert.match(String(p.fields.producer||''),/gold mountain/i);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R304 selected farm fermentation and tasting evidence is not the sibling coffee',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);
 for(const note of ['pumpkin pie','warm cinnamon'])
  assert.match(String(p.fields.tasting_notes||'').toLowerCase(),new RegExp(note));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/papaya|blackberry|peach/i);
 assert.doesNotMatch(String(p.fields.process||''),/washed|natural/i);
 assert.doesNotMatch(String(p.fields.origin||''),/guatemala|kenya|sumatra/i);
});
test('R304 unrelated SEO and catalog navigation cannot replace selected chosen facts',()=>{
 const seo='<meta name="description" content="Guatemala dark roast, washed, pineapple, strawberry">'+
 '<meta property="og:description" content="Other coffee: Sumatra dark, natural, tobacco">';
 const p=extractPublicCoffeeFacts(page(title,selected,seo),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.origin,'Nicaragua');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/pineapple|strawberry|tobacco/i);
 assert.doesNotMatch(String(p.fields.process||''),/washed|natural/i);
});
test('R304 recycled original URL with sister H1 is not certified as the old coffee',()=>{
 const changed='Nicaragua - Brix Breaker - Pacamara';
 const html=page(changed,'<p>Ripe papaya, blackberry and apple. Sun dried natural lot.</p>');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(title,changed,p.fields.name),false);
 const good={number:59,archived_coffee:title,status:'FETCHED',parser_ok:true,selected_h1:[title],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name:title},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([59],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
   [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
   [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([59],bad).length>0);
});
