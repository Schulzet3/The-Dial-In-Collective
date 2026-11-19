import test from 'node:test';
import assert from 'node:assert/strict';
import {selected247} from '../scripts/audit/issue33-r336-original247-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/colombia-finca-anaya-wush-wush';
const name='Colombia Finca Anaya Wush Wush';
const own='<p>VARIETY: Wush Wush</p><p>PROCESS: Washed</p><p>PRODUCER: Sergio Darío Aranda Gómez</p><p>ELEVATION: 1600 MASL</p><p>TASTING NOTES: Key Lime, Jasmine, White Cranberry, Marzipan</p>';
const page=(body=own,title=name,extra='')=>'<html><main><article><h1>'+title+'</h1><div class="product__description">'+body+'</div></article>'+extra+'</main></html>';
test('R336 exact chosen H1 and source-owned product specs',()=>{
 const r=selected247(page());assert.equal(r.exact,true);
 for(const k of ['ownVariety','ownWashed','ownProducer','ownElevation','ownFlavor'])assert.equal(r[k],true,k);
});
test('R336 substituted Onyx product cannot certify original Wush Wush',()=>{
 assert.equal(selected247(page(own,'Mexico Finca Santa Cruz Gesha')).exact,false);
});
test('R336 different coffee in footer cannot lend missing producer, process or tasting notes',()=>{
 const r=selected247(page('<p>Current selected page lacks specs</p>',name,'<footer>'+own+'</footer>'));
 for(const k of ['ownVariety','ownWashed','ownProducer','ownElevation','ownFlavor'])assert.equal(r[k],false,k);
});
test('R336 selected title without product facts is never inferred farm evidence',()=>{
 const r=selected247(page('<p>Roaster sells coffee.</p>'));assert.equal(r.exact,true);
 assert.equal(r.ownProducer,false);assert.equal(r.ownWashed,false);assert.equal(r.ownFlavor,false);
});
test('R336 general 0mg caffeine widget cannot make a regular selected product decaf',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<p class="nutrition-widget">Caffeine 0mg / 12oz</p>'),{source_url:url});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R336 chosen product parser leaves human Add Coffee action and Source Review available',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R336 missing HTML, mismatched identity or absent UI is hard failure',()=>{
 const r={number:247,status:'FETCHED',archived_coffee:name,parser_ok:true,
 selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([247],[r]),[]);
 for(const bad of [{...r,status:'UNAVAILABLE'},{...r,selected_heading_identity_verified:false},
  {...r,add_coffee_ui_rendered:false},{...r,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([247],[bad]).length);
});
test('R336 case-specific probe cannot stand in for frozen all-603 manual certification',()=>{
 assert.ok(requiredFocusedSourceFailures([247],[]).length);
 assert.ok(requiredFocusedSourceFailures([247],[{number:247,status:'UNAVAILABLE'}]).length);
});
