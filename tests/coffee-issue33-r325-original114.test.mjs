import test from 'node:test';
import assert from 'node:assert/strict';
import {selected114} from '../scripts/audit/issue33-r325-original114-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://elixrcoffee.com/products/wush-wush-ethiopia',name='Wush Wush, Ethiopia';
const own='The Wush Wush Ethiopian variety grows near Yirba Muda, Guji, Ethiopia. This coffee is meticulously processed at the Ana Sora washing station, which is owned by Israel Degefa. A natural process single origin coffee. Region: Guji. Variety: Heirloom. Process: Natural. We Taste: Cherry Cola / White Grape / Lime Zest.';
const fixture=(text=own,heading=name,other='')=>'<html><body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+text+'</div></article>'+other+'</main></body></html>';
test('R325 identifies exact selected original current-source heading and narrative',()=>{
 const d=selected114(fixture());assert.equal(d.exact,true);
 for(const key of ['station','owner','region','natural','notes'])assert.equal(d[key],true,key);
});
test('R325 station owner is not positive evidence for a farm producer',()=>{
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});assert.equal(p.ok,true);
 assert.equal(p.fields?.producer,undefined,'washing station owner must not be assigned as named farmer');
});
test('R325 station handling cannot turn natural green coffee into washed',()=>{
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});assert.equal(p.ok,true);
 assert.notEqual(p.fields?.process,'Washed');
});
test('R325 sibling and footer do not import source owner or sensory narrative',()=>{
 const d=selected114(fixture('Guji natural coffee',name,'<aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(d.station,false);assert.equal(d.owner,false);assert.equal(d.notes,false);
});
test('R325 changed selected heading is not frozen original coffee',()=>{
 assert.equal(selected114(fixture(own,'Other Ethiopian coffee')).exact,false);
});
test('R325 Add Coffee preview stays explicit and private Source Review renders',()=>{
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R325 required official source fail closed for unavailable and absent review',()=>{
 const good={number:114,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([114],[good]),[]);
 assert.ok(requiredFocusedSourceFailures([114],[{...good,status:'UNAVAILABLE'}]).length);
 assert.ok(requiredFocusedSourceFailures([114],[{...good,source_review_rendered:false}]).length);
});

test('R325 explicit selected Producer caption proves farmer independently of station ownership',()=>{
 const p=extractPublicCoffeeFacts(fixture(own+' <p>Producer: Israel Degefa</p>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.producer,'Israel Degefa');
});
test('R325 named producer with farm ownership is not withheld by station-only rule',()=>{
 const p=extractPublicCoffeeFacts(fixture('Producer: Luz Salazar. This farm is owned by Luz Salazar. Process: Natural. Notes: Fig.'),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.producer,'Luz Salazar');
});
test('R325 unrelated station owner does not override the coffee grower',()=>{
 const p=extractPublicCoffeeFacts(fixture('Producer: Ana Vargas. Ana Vargas grows coffee. The Ana Sora washing station is owned by Israel Degefa. Process: Natural.'),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.producer,'Ana Vargas');
});
