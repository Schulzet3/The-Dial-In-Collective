// Issue #33 R295: original603 #554 ROC2 Organic Mexican, not a 603-row certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCurrentInlineShopifyRoastTag} from '../src/server/coffee-current-inline-shopify-product.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Organic Mexican';
const url='https://www.roc2.com/products/organic-mexican';
const description='A well-balanced lighter roast with molasses, caramel, and lemongrass tasting notes. Sourced from organic Mexican farms, this single-origin coffee is exceptionally smooth and bright, offering a clean, sweet finish.';
const page=(selectedName=name,text=description)=>'<html><head><title>Light Roast Ethiopian Coffee</title>'+
 '<meta property="og:site_name" content="ROC²">'+
 '<meta name="description" content="Other coffee: strawberry, vanilla, natural process, light roast"></head>'+
 '<body><main><article class="product"><h1>'+selectedName+'</h1><div class="description"><p>'+text+
 '</p></div></article></main><aside class="related-products"><h2>Organic Ethiopian</h2>'+
 '<p>Light roast; tasting notes: blueberry, rose. Producer: Other Farmer; Process: Natural.</p>'+
 '</aside></body></html>';

test('R295 focused official-source acceptance fails closed on missing, duplicate, inaccessible, no parser or no review',()=>{
 const good={number:554,archived_coffee:name,status:'FETCHED',parser_ok:true,
  selected_h1:[name],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([554],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,source_review_rendered:false}],[{...good,add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([554],bad).length>0);
});

test('R295 selected exact Organic Mexican H1 cannot be replaced by sibling or historical SEO',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[name]);
 assert.equal(identicalCurrentSelectedTitle(name,name,name),true);
 for(const other of ['Organic Honduran','Organic Ethiopian','Organic Mexican 2027 Lot'])
  assert.equal(identicalCurrentSelectedTitle(name,other,other),false);
});

test('R295 actual parser keeps three direct selected notes; comparative lighter is not categorical Light',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,name);
 for(const x of ['molasses','caramel','lemongrass'])
  assert.match(String(r.fields.tasting_notes||''),new RegExp(x,'i'));
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/strawberry|vanilla|blueberry|rose/i);
 assert.equal(r.fields.roast_level,undefined,'a relative lighter roast does not certify exact Light');
 assert.equal(r.fields.decaffeination_method,undefined);
 assert.doesNotMatch(String(r.fields.producer||''),/other farmer/i);
 assert.doesNotMatch(String(r.fields.process||''),/natural/i);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});

test('R295 a changed selected product identity or sibling Light cannot certify original Organic Mexican',()=>{
 const other='Organic Honduran';
 const r=extractPublicCoffeeFacts(page(other,'Light Roast. Notes: Chocolate and Honey. Origin: Honduras.'),{source_url:url});
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.name,name);
 assert.equal(identicalCurrentSelectedTitle(name,other,r.fields.name),false);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/molasses|lemongrass/i);
});

const selectedInline=(overrides={})=>'<script id="subscription-helper">var _RSConfig = _RSConfig || {}; '+
 '_RSConfig.product = '+JSON.stringify({
  id:8051397984330,title:name,handle:'organic-mexican',vendor:'ROC²',
  tags:['Molasses','Caramel','Lemongrass','Light Roast','Mexican Coffee'],
  ...overrides
 })+'; </script>';

test('R295 selected exact Shopify subscription Product tag recovers categorical Light independent of relative description',()=>{
 const raw=page()+selectedInline();
 assert.deepEqual(selectedCurrentInlineShopifyRoastTag(raw,{name,roaster:'ROC²',source_url:url}),
  {value:'Light',source:'exact_selected_shopify_inline_product_roast_taxonomy'});
 const r=extractPublicCoffeeFacts(raw,{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.roast_level,'Light');
 for(const note of ['molasses','caramel','lemongrass'])
  assert.match(String(r.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/blueberry|rose|strawberry/i);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});

test('R295 Shopify roast taxonomy fails closed on stale SKU, seller, contradictory labels or generic categories',()=>{
 const selected=(html,source=url)=>selectedCurrentInlineShopifyRoastTag(html,{name,roaster:'ROC²',source_url:source});
 for(const changed of [
  {title:'Organic Honduran'}, {handle:'organic-honduran'}, {vendor:'Other Coffee'},
  {tags:['Light','Mexican Coffee']},
  {tags:['Lighter Roast','Mexican Coffee']},
  {tags:['Light Roast','Dark Roast']},
  {tags:['Coffee Light Roast','Mexican Coffee']}
 ])assert.equal(selected(page()+selectedInline(changed)),null,JSON.stringify(changed));
 assert.equal(selected(page()+selectedInline(), 'https://www.roc2.com/products/organic-honduran'),null);
 assert.equal(selected(page()+selectedInline()+selectedInline()),null,'duplicate matching assignments ambiguous');
 assert.equal(selected(page()+'<aside class="related-products">'+selectedInline({title:'Organic Honduran',handle:'organic-honduran'})+'</aside>'),null);
 const medium=selected(page()+selectedInline({tags:['Medium-Light Roast','Mexican Coffee']}));
 assert.equal(medium?.value,'Medium-Light','do not misclassify Medium-Light Roast as Light');
});
