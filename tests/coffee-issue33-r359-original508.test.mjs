import test from 'node:test';
import assert from 'node:assert/strict';
import {selected508,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r359-original508-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const first='<p>Notes: Red Fruit, Candy, Grapefruit</p>';
const second='<h2>Roast Details</h2><p>Roast Type: Light Roast</p><p>Country/Region: Peru Cajamarca</p>'+
 '<p>Process: Washed</p><p>Notes: Red Grape, Fruity, Sugar-Like Sweetness, Citrus Acidity</p>';
const html=(name=selectedName,body=first+second,other='')=>'<html><head><title>Avalon Light Roast - old SEO</title></head><body>'+
 '<nav>Other coffee</nav><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+body+
 '</div></article></main>'+other+'<footer>Retired Avalon</footer></body></html>';
test('R359 selected current Munsinger H1 and two distinct own Notes lists',()=>{
 const r=selected508(html());assert.equal(r.exact,true);assert.equal(r.first,true);assert.equal(r.second,true);
 assert.equal(r.light,true);assert.equal(r.origin,true);assert.equal(r.washed,true);
});
test('R359 recycled Avalon slug and SEO title cannot replace selected Munsinger',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.notEqual(norm(p.fields?.name),'avalon light roast');
});
test('R359 mismatched current selected H1 is not proof of archived chosen coffee',()=>{
 assert.equal(selected508(html('Avalon Light Roast')).exact,false);
});
test('R359 different coffee aside cannot supply a missing selected Notes list',()=>{
 const p=html(selectedName,first+second.replace(/<p>Notes: Red Grape[^<]*<\/p>/,''),
  '<aside><h2>Another coffee</h2><p>Notes: Red Grape, Fruity, Sugar-Like Sweetness, Citrus Acidity</p></aside>');
 assert.equal(selected508(p).second,false);
});
test('R359 two competing Notes lists are distinct selected claims',()=>{
 assert.equal(selected508(html(selectedName,first)).second,false);
 assert.equal(selected508(html(selectedName,second)).first,false);
});
test('R359 official source, identity and UI failures never become PASS',()=>{
 const good={number:508,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([508],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([508],[bad]).length>0);
});
test('R359 current parser preview and review remain no-save',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
