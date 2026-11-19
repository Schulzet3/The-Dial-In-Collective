import test from 'node:test';
import assert from 'node:assert/strict';
import {selected111} from '../scripts/audit/issue33-r324-original111-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://eastpole.coffee/products/granosacielo',name='Granos A Cielo';
const spec='PRODUCER Hazel Arias and Nelsyn Yoseles | ORIGIN Tarrazú, Costa Rica | PROCESS Washed | NOTES Mandarin Orange, Chocolate, Brown sugar';
const story='Granos al Cielo is a project led by Hazel Arias and Nelsyn Hernández.';
const fixture=(own=spec+' '+story,heading=name,other='')=>'<html><body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+own+'</div></article>'+other+'</main></body></html>';
test('R324 current selected product has competing seller producer names',()=>{
 const d=selected111(fixture());assert.equal(d.exact,true);assert.equal(d.directProducer,true);assert.equal(d.narrativeProducer,true);
});
test('R324 sibling and footer do not create selected contradiction',()=>{
 const d=selected111(fixture(spec,name,'<aside>'+story+'</aside><footer>'+story+'</footer>'));
 assert.equal(d.directProducer,true);assert.equal(d.narrativeProducer,false);
});
test('R324 menu does not provide selected labeled producer',()=>{
 const d=selected111(fixture(story,name,'<nav>'+spec+'</nav><aside>'+spec+'</aside>'));
 assert.equal(d.narrativeProducer,true);assert.equal(d.directProducer,false);
});
test('R324 changed current H1 is not the frozen product',()=>{
 assert.equal(selected111(fixture(spec+' '+story,'Another coffee')).exact,false);
});
test('R324 Add Coffee remains explicit preview plus private Source Review',()=>{
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R324 public source missing or review invisible fails closed',()=>{
 const good={number:111,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([111],[good]),[]);
 assert.ok(requiredFocusedSourceFailures([111],[{...good,status:'UNAVAILABLE'}]).length>0);
 assert.ok(requiredFocusedSourceFailures([111],[{...good,source_review_rendered:false}]).length>0);
});
