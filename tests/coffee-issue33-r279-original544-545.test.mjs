import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:544,archived:'Chai Cheesecake Fall Season Premium Flavored Coffee',current:'Chai Cheesecake — Fall Coffee',url:'https://www.readingcoffee.com/products/chai-cheesecake-fall-season-premium-flavored-coffee'},
 {number:545,archived:"It's Bourbon & Bacon, Hon! Fall Season Premium Flavored Coffee",current:"It's Bourbon & Bacon, Hon! — Fall Coffee",url:'https://www.readingcoffee.com/products/its-bourbon-bacon-hon-fall-season-premium-flavored-coffee'}
];
const row=t=>({number:t.number,archived_coffee:t.archived,status:'FETCHED',parser_ok:true,selected_h1:[t.current],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,current_fields:{name:t.current},original_product_not_certified:true,current_identity_exception:'CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS',add_coffee_ui_rendered:true,source_review_rendered:true});
const page=(name,description,other='')=>'<html><head><title>Old seasonal coffee SEO title: dark roast mango</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description"><p>'+description+'</p></div></article></main>'+other+'</body></html>';

test('original 544/545 changed selected H1s are explicit NEGATIVE identity evidence, not archived coffee certification',()=>{
 const rows=targets.map(row);
 assert.deepEqual(requiredFocusedSourceFailures([544,545],rows,{negativeIdentityNumbers:[544,545]}),[]);
 assert.ok(requiredFocusedSourceFailures([544,545],rows).length>0);
 for(const wrong of [[rows[0]], [rows[0],rows[0]], [rows[0],{...rows[1],selected_heading_identity_verified:true}],
  [rows[0],{...rows[1],current_fields:{name:rows[1].archived_coffee}}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}],
  [rows[0],{...rows[1],source_review_rendered:false}]])
   assert.ok(requiredFocusedSourceFailures([544,545],wrong,{negativeIdentityNumbers:[544,545]}).length>0);
});

test('historical titles are not silently treated as current chosen 2026 seasonal identity',()=>{
 for(const t of targets){
  assert.equal(identicalCurrentSelectedTitle(t.archived,t.current,t.current),false);
  assert.equal(identicalCurrentSelectedTitle(t.current,t.current,t.current),true);
  assert.deepEqual(selectedProductHeadings(productMarkup(page(t.current,'Medium roast seasonal flavored coffee'))),[t.current]);
  assert.equal(identicalCurrentSelectedTitle(t.archived,t.archived,t.current),false);
 }
});

test('selected chai-cheesecake spice prose is not evidence for a sibling coffee, decaf method or changed original identity',()=>{
 const t=targets[0];
 const html=page(t.current,'This medium roast is flavored with chai cheesecake, cinnamon, cardamom, ginger and cloves. Optional decaf can be special ordered.',
   '<aside class="related-products"><h2>Other coffee</h2><p>Guatemala mango raspberry natural 1900m Swiss Water decaf</p></aside>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,t.current);
 assert.notEqual(parsed.fields.name,t.archived);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/mango|raspberry/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:t.url}));
});

test('selected Bourbon & Bacon flavor description does not prove real ingredients, a default decaf, or sibling flavors',()=>{
 const t=targets[1];
 const html=page(t.current,'Medium roast with oaky bourbon-like and smoky bacon-like flavors. Available as regular or decaf on special order.',
   '<aside class="related-products">Other espresso: mango, raspberry, Swiss Water, Colombia.</aside>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,t.current);
 assert.notEqual(parsed.fields.name,t.archived);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/mango|raspberry/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:t.url}));
});
