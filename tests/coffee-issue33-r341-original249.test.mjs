import test from 'node:test';
import assert from 'node:assert/strict';
import {selected249} from '../scripts/audit/issue33-r341-original249-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/mexico-finca-santa-cruz-gesha';
const name='Mexico Finca Santa Cruz Gesha';
const own='<p>VARIETY: Gesha</p><p>PROCESS: Washed</p><p>ROAST LEVEL: Light</p><p>Producer: José “Pepe” Argüello</p><p>Origin: Chiapas, Mexico</p><p>Elevation: 1650 MASL</p><p>Tasting Notes: Yellow Pear, Chamomile, Almond, Vanilla Blossom</p>';
const page=(body=own,title=name,extra='')=>'<html><main><article><h1>'+title+'</h1><div class="product__description">'+body+'</div></article>'+extra+'</main></html>';
test('R341 direct selected H1, seven direct product facts',()=>{
 const r=selected249(page());assert.equal(r.exact,true);
 for(const k of ['ownWashed','ownVariety','ownRoast','ownProducer','ownElevation','ownFlavor','ownChiapas'])assert.equal(r[k],true,k);
});
test('R341 changed H1 is never original249 identity',()=>{
 assert.equal(selected249(page(own,'Colombia Finca Anaya Wush Wush')).exact,false);
});
test('R341 historical Natural Gesha award does not replace chosen Washed process',()=>{
 const html=page(own+'<p>2019 and 2026 Natural Gesha Cup of Excellence awards at this farm.</p>');
 assert.equal(selected249(html).historicalNaturalAwards,true);
 const p=extractPublicCoffeeFacts(html,{source_url:url});assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Natural');
});
test('R341 generic 0mg caffeine widget does not prove coffee decaffeination METHOD',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<section><h2>Caffeine</h2><p>0mg / 12oz</p></section>'),{source_url:url});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R341 unrelated footer cannot donate selected facts',()=>{
 const r=selected249(page('<p>Selected coffee has no specs.</p>',name,'<footer>'+own+'</footer>'));
 for(const k of ['ownWashed','ownVariety','ownRoast','ownProducer','ownFlavor','ownChiapas'])assert.equal(r[k],false,k);
});
test('R341 unrelated product aside cannot donate selected process or flavor',()=>{
 const r=selected249(page('<p>Chosen coffee unknown process</p>',name,'<aside>'+own+'</aside>'));
 assert.equal(r.ownWashed,false);assert.equal(r.ownFlavor,false);
});
test('R341 actual parser enables Add Coffee preview and separate Source Review',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R341 unavailable/mismatched/unrendered official source must fail closed',()=>{
 const r={number:249,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([249],[r]),[]);
 for(const bad of [{...r,status:'UNAVAILABLE'},{...r,selected_heading_identity_verified:false},
  {...r,add_coffee_ui_rendered:false},{...r,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([249],[bad]).length);
 assert.ok(requiredFocusedSourceFailures([249],[]).length);
});
