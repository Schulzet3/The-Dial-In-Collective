// #33 R374 red-first: original603 #41 current selected decaf sugarcane must not become green Natural.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {selectedShopifyPageFlyH3Identity} from '../scripts/audit/issue33-shopify-pagefly-h3.mjs';
import {selected41,selected41DirectBody} from '../scripts/audit/issue33-r374-original41-check.mjs';
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

test('PageFly H3 must be tracker/product-id/cart-form exact; recommendation/SEO/wrong product never qualifies',()=>{
 const id='5039969009700',url='https://brickhouseroasters.com/products/descafeinado';
 const tracker='<script id="__st">var __st={"p":"product","rtyp":"product","rid":5039969009700,"pageurl":"brickhouseroasters.com/products/descafeinado"};</script>';
 const form=(title=name,nid=id,href='')=>'<div data-pf-type="ProductBox" data-product-id="'+nid+'"><form id="product_form_'+nid+'" class="pf-product-form" action="/cart/add"><input name="form_type" value="product"><input name="product-id" value="'+nid+'"><h3 data-pf-type="ProductTitle" data-product-type="title" data-product-id="'+nid+'"'+(href?' data-href="'+href+'"':'')+'>'+title+'</h3></form></div>';
 const page=(hero,tail='',tr=tracker)=>'<html><head><meta property="og:title" content="Descafeinado Decaf Coffee, Colombia"></head><body>'+tr+hero+tail+'</body></html>';
 const args={source_url:url,expected_name:name,parsed_name:'Descafeinado Decaf Coffee, Colombia'};
 const valid=page(form(name),form('Related Coffee','3456789','/products/related-coffee'));
 assert.equal(selectedShopifyPageFlyH3Identity(valid,args)?.selected_title,name);
 for(const bad of [
  page(form('Wrong Coffee')),
  page(form(name,id,'/products/descafeinado')),
  page(form(name,'7777777')),
  page(form(name),form(name)),
  page(form(name),'',''),
  page(form(name),'','<script id="__st">var __st={"p":"product","rtyp":"product","rid":8,"pageurl":"brickhouseroasters.com/products/descafeinado"};</script>'),
 ])assert.equal(selectedShopifyPageFlyH3Identity(bad,args),null,'unverified purchase identity');
 assert.equal(selectedShopifyPageFlyH3Identity(valid,{...args,parsed_name:'Different Coffee'}),null);
 assert.equal(selectedShopifyPageFlyH3Identity(valid,{...args,source_url:'https://another.example/products/descafeinado'}),null);
});

test('PageFly H3 current selected exact product own paragraph feeds method without an H1; excludes sibling caffeine text',()=>{
 const id='5039969009700';
 const tracker='<script id="__st">var __st={"p":"product","rtyp":"product","rid":5039969009700,"pageurl":"brickhouseroasters.com/products/descafeinado"};</script>';
 const page=(paragraph='',other='')=>'<html><head><meta property="og:title" content="Descafeinado Decaf Coffee, Colombia"><meta name="description" content="Roast info"></head><body>'+tracker+
 '<div data-pf-type="ProductBox" data-product-id="'+id+'"><form id="product_form_'+id+'" class="pf-product-form" action="/cart/add"><input name="form_type" value="product"><input name="product-id" value="'+id+'"><h3 data-pf-type="ProductTitle" data-product-type="title" data-product-id="'+id+'">Descafeinado</h3><p>'+paragraph+'</p></form></div>'+
 '<div data-pf-type="ProductList2"><div data-pf-type="ProductBox" data-product-id="333"><form id="product_form_333" class="pf-product-form" action="/cart/add"><h3 data-pf-type="ProductTitle" data-product-type="title" data-product-id="333" data-href="/products/other">Other Coffee</h3><p>'+other+'</p></form></div></div></body></html>';
 const chosen=extractPublicCoffeeFacts(page(cane),{source_url:url});
 assert.equal(chosen.ok,true);
 assert.equal(chosen.fields.decaffeination_method,'Sugar Process');
 assert.notEqual(chosen.fields.process,'Natural');
 const missing=extractPublicCoffeeFacts(page('Dark-roasted coffee.',cane),{source_url:url});
 assert.equal(missing.fields.decaffeination_method,undefined,'related sibling own cane method must not transfer');
 const wrongPage=extractPublicCoffeeFacts(page(cane),{source_url:'https://coffee.example/products/other'});
 assert.equal(wrongPage.fields.decaffeination_method,undefined,'unmatched source URL must not claim current method');
});

test('N508-119 exact diagnostic scrub excludes nonproduct header/navigation and keeps selected description',()=>{
 const injected='We’ve stripped this bean of its caffeine content through a natural sugar cane process';
 for(const tag of ['header','nav','footer','aside','script','style','noscript']){
  const contaminated='<'+tag+' class="wrapper"><p>'+injected+'</p></'+tag+'><p>Selected description unavailable.</p>';
  const onlySelected=selected41DirectBody(contaminated);
  assert.doesNotMatch(onlySelected,/stripped this bean/i,tag+' unrelated field must be removed as one element');
  assert.match(onlySelected,/Selected description unavailable/i,'selected body retained');
 }
 assert.match(selected41DirectBody('<article><p>'+injected+'</p></article>'),/stripped this bean/i,
  'current own product paragraph must remain eligible');
 const current=selected41(html(),name);
 assert.equal(current.identity,true);
 assert.equal(current.currentCaneRemoval,true,'real selected own method must be retained');
 const leaked=selected41(html(name,'Dark Colombian coffee, method unpublished.','<header>'+injected+'</header>'),name);
 assert.equal(leaked.currentCaneRemoval,false,'unrelated header cannot be taken as current own treatment');
});
