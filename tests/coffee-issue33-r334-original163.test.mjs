import test from 'node:test';
import assert from 'node:assert/strict';
import {selected163} from '../scripts/audit/issue33-r334-original163-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://ironcladcoffee.com/products/decaf-colombia-las-montanas';
const name='Decaf Colombia Las Montanas';
const details='<p>The Colombia Las Montanas EA Natural Decaf is decaffeinated using Ethyl Acetate (EA), also commonly referred to as "sugarcane process decaf."</p><p>Department: Caldas</p><p>Country: Colombia</p><p>Altitude: 1,600 meters above sea level</p><p>Variety: Typica, Castillo</p><p>Process: Washed</p><p>Roast Profile: Medium</p><p>Flavor Notes: Lemon, Cherry, Balanced</p>';
const page=(body=details,h=name,outside='')=>'<html><main><article class="product"><h1>'+h+'</h1><div class="product__description">'+body+'</div></article>'+outside+'</main></html>';
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});
test('R334 selected current own product identifies both distinct caffeine and green process captions',()=>{
 const v=selected163(page());assert.equal(v.exact,true);
 for(const k of ['selectedEA','ownCaldas','ownColombia','ownElevation','ownVariety','ownWashed','ownMedium','ownFlavor'])assert.equal(v[k],true,k);
});
test('R334 changed same URL coffee title is NOT original selected identity',()=>{assert.equal(selected163(page(details,'Decaf Costa Rica Another Lot')).exact,false)});
test('R334 unrelated navigation, aside and footer cannot become own source',()=>{
 const v=selected163(page('<p>Shipping only</p>',name,'<aside>'+details+'</aside><footer>'+details+'</footer>'));
 assert.equal(v.selectedEA,false);assert.equal(v.ownWashed,false);assert.equal(v.ownFlavor,false);
});
test('R334 selected green washed coffee does not use EA as green processing',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.equal(p.fields?.process,'Washed');
});
test('R334 directly printed selected sugarcane EA method is distinct from washed green processing',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.equal(p.fields?.decaffeination_method,'Sugar Process');
});
test('R334 title decaf without described method does not fabricate EA or Swiss Water',()=>{
 const p=parse(page('<p>Department: Caldas</p><p>Process: Washed</p><p>Roast Profile: Medium</p>'));
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R334 another merchant coffee in footer cannot promote its decaf method',()=>{
 const p=parse(page('<p>Department: Caldas</p><p>Process: Washed</p>',name,'<footer><h2>Brazil Swiss Water Decaf</h2><p>Swiss Water Process</p></footer>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.decaffeination_method,'Water Process');
});
test('R334 no independent named producer or lot is fabricated',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.ok(!p.fields?.producer);assert.ok(!p.fields?.release_label);
});
test('R334 Add Coffee and Source Review render without implied save',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R334 official missing HTML or wrong selected H1 and UI fail closed',()=>{
 const ok={number:163,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([163],[ok]),[]);
 for(const b of [{...ok,status:'UNAVAILABLE'},{...ok,selected_heading_identity_verified:false},
  {...ok,add_coffee_ui_rendered:false},{...ok,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([163],[b]).length);
});
