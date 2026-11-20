import test from 'node:test';
import assert from 'node:assert/strict';
import {selected509,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r360-original509-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const first='<p>Notes: Dark Chocolate, Cooked Cranberry, Tobacco</p>';
const second='<h2>Roast Details</h2><p>Roast Type: Dark Roast</p><p>Country/Region: Mexico Cristal</p>'+
 '<p>Process: Washed</p><p>Notes: Dark Chocolate, Cooked Cranberry, Tobacco</p>';
const html=(name=selectedName,body=first+second,other='')=>'<html><head><title>Kraken Dark Roast - old SEO</title></head><body>'+
 '<nav>Other coffee</nav><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+body+
 '</div></article></main>'+other+'<footer>Retired Kraken</footer></body></html>';
test('R360 selected current St Germain H1 and two matching direct Notes captions',()=>{
 const r=selected509(html());assert.equal(r.exact,true);assert.equal(r.first,true);assert.equal(r.second,true);
 assert.equal(r.dark,true);assert.equal(r.origin,true);assert.equal(r.washed,true);
});
test('R360 recycled Kraken slug and SEO title cannot replace selected St Germain',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.notEqual(norm(p.fields?.name),'kraken dark roast');
});
test('R360 mismatched current selected H1 is not proof of archived chosen coffee',()=>{
 assert.equal(selected509(html('Kraken Dark Roast')).exact,false);
});
test('R360 different coffee aside cannot supply a missing selected Notes list',()=>{
 const p=html(selectedName,first+second.replace(/<p>Notes: Dark Chocolate[^<]*<\/p>/,''),
  '<aside><h2>Another coffee</h2><p>Notes: Dark Chocolate, Cooked Cranberry, Tobacco</p></aside>');
 assert.equal(selected509(p).second,false);
});
test('R360 duplicate Notes captions require two selected instances',()=>{
 assert.equal(selected509(html(selectedName,first)).second,false);
 assert.equal(selected509(html(selectedName,second)).first,true);
});
test('R360 official source, identity and UI failures never become PASS',()=>{
 const good={number:509,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([509],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([509],[bad]).length>0);
});
test('R360 current parser preview and review remain no-save',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
