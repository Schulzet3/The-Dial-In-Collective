import test from 'node:test';
import assert from 'node:assert/strict';
import {selected297,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r348-original297-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const notes='<h2>Flavor Notes</h2><p>Soft berry brightness</p><p>Smooth milk-chocolate body</p><p>Toasted sugar warmth</p><p>Cozy, lingering finish</p>';
const own='<div class="product__description">'+notes+'<h2>Roast Level</h2><p>Medium</p></div>';
const html=(h1=selectedName,body=own,extras='')=>'<html><head><title>Other Coffee Dark Natural</title></head><body><nav>Unrelated Roast Level: Dark</nav><main><article class="product"><h1>'+h1+'</h1>'+body+'</article></main>'+extras+'<footer>Other bean Process Washed Roast Dark</footer></body></html>';
test('R348 exact current selected product own four flavor phrases and roast',()=>{
 const p=selected297(html());
 assert.equal(p.exact,true);
 assert.deepEqual(p.direct_flavor_words,[true,true,true,true]);
 assert.equal(p.direct_roast,true);
});
test('R348 a different product H1 is NOT Wildhaven',()=>{
 assert.equal(selected297(html('Unrelated Coffee')).exact,false);
});
test('R348 sibling, navigation, and SEO cannot invent chosen-product tasting notes',()=>{
 const h=html(selectedName,'<div class="product__description">No flavor notes published.</div>','<aside>'+own+'</aside>');
 const v=selected297(h);
 assert.deepEqual(v.direct_flavor_words,[false,false,false,false]);
 assert.equal(v.direct_roast,false);
});
test('R348 seller word Light in flavor context is NOT a roast designation',()=>{
 const p=selected297(html(selectedName,'<p>Light berry sweetness. Soft cocoa.</p>'));
 assert.equal(p.direct_roast,false);
});
test('R348 real parser renders member review snapshot but does not save coffee',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);
 assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R348 hard selected official source gates fail closed on unavailable/identity/UI problems',()=>{
 const good={number:297,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([297],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}]){
   assert.ok(requiredFocusedSourceFailures([297],[bad]).length>0);
 }
});
