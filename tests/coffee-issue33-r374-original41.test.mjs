// #33 R374 red-first: original603 #41 current selected decaf sugarcane must not become green Natural.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://brickhouseroasters.com/products/descafeinado';
const name='Descafeinado';
const cane='We’ve stripped this bean of its caffeine content through a natural sugar cane process, leaving only the rich flavor of the dark-roasted columbian bean.';
const html=(title=name,description=cane,extra='')=>'<html><head><meta property="og:site_name" content="Brickhouse Coffee Co."></head><body><main><article class="product"><h1>'+title+'</h1><div class="product__description"><p>'+description+'</p><section><h2>BEAN PROFILE</h2><h3>Country of Origin</h3><p>Colombia</p><h3>Processing Method</h3><p>Sugan Cane</p></section></div></article></main>'+extra+'</body></html>';
const parsed=(title=name,description=cane,extra='')=>extractPublicCoffeeFacts(html(title,description,extra),{source_url:url});
test('selected full decaf own affirmative caffeine-removal sentence identifies Sugar Process, not green Natural',()=>{
 const r=parsed();
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.decaffeination_method,'Sugar Process');
 assert.notEqual(r.fields.process,'Natural','natural sugar-cane decaffeination is NOT green Natural');
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('seller typo Sugan Cane alone is NOT an inferred sugar decaffeination treatment',()=>{
 const r=parsed(name,'A dark roasted Colombian coffee with distinctive flavor.');
 assert.equal(r.fields.decaffeination_method,undefined);
 assert.notEqual(r.fields.process,'Natural');
});
test('no transfer from sibling or SEO decaf description to the selected ordinary coffee',()=>{
 const r=parsed('House Espresso','Rich Colombian coffee, freshly roasted.','<aside class="related-products"><h3>Descafeinado</h3><p>'+cane+'</p></aside>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('generic roaster education does not establish a selected decaf method',()=>{
 const r=parsed(name,'Dark roasted Colombian decaf.','<aside><h2>Education</h2><p>'+cane+'</p></aside>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('explicitly negated current sugar-cane method must remain blank',()=>{
 const r=parsed(name,'This coffee is not decaffeinated using sugar cane; method is undisclosed.');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('partial-caffeine selected title must not become fully decaffeinated',()=>{
 const r=parsed('Half-Caf Colombia',cane);
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('required official source access/H1/parser/no-save UI stays fail-closed',()=>{
 const good={number:41,status:'FETCHED',archived_coffee:name,parser_ok:true,
  selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([41],[good]),[]);
 for(const diff of [{status:'UNAVAILABLE'},{parser_ok:false},{selected_heading_identity_verified:false},
  {add_coffee_ui_rendered:false},{source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([41],[{...good,...diff}]).length>0);
});

test('Spanish descafeinado is explicit full-decaf identity, but regular Spanish coffee cannot inherit method',()=>{
 const selected=parsed(name);
 assert.equal(selected.fields.decaffeination_method,'Sugar Process');
 const regular=parsed('Colombia Tueste Oscuro',cane);
 assert.equal(regular.fields.decaffeination_method,undefined);
});
