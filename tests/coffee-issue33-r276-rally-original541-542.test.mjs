import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const cases=[
 {n:541,name:'Costa Rica Las Lajas',url:'https://www.rallycoffee.co/products/costa-rica-las-lajas',body:'Las Lajas is produced by Oscar and Francisca Chacón in Costa Rica. Perla Negra is a natural-process coffee.'},
 {n:542,name:'Ethiopia Refisa',url:'https://www.rallycoffee.co/products/ethiopia-refisa',body:'Ethiopia Refisa is a washed coffee from West Arsi, Ethiopia, processed at the Testi West Arsi Washing Station. The station works with around 850 smallholder farmers.'}
];
const html=(n,body,extra='')=>'<html><head><title>Unrelated coffee, dark roast mango</title></head><body><main><article class="product"><h1>'+n+'</h1><div class="description">'+body+'</div></article></main>'+extra+'</body></html>';
const record=c=>({number:c.n,archived_coffee:c.name,status:'FETCHED',parser_ok:true,selected_h1:[c.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:c.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('missing, duplicated, unavailable or altered identity cannot masquerade as certified',()=>{
 const rows=cases.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([541,542],rows),[]);
 assert.ok(requiredFocusedSourceFailures([541,542],[rows[0]]).length);
 assert.ok(requiredFocusedSourceFailures([541,542],[rows[0],rows[0]]).length);
 for(const change of [{status:'UNAVAILABLE'},{parser_ok:false},{selected_heading_identity_verified:false},{source_review_rendered:false},{add_coffee_ui_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([541,542],[rows[0],{...rows[1],...change}]).length);
});
test('selected H1, no sibling flavor, real Add Coffee and review, no path-only identity',()=>{
 for(const c of cases){
  const page=html(c.name,c.body,'<aside class="related-products">Colombia dark roast, mango, Swiss Water, 1900m</aside>');
  assert.deepEqual(selectedProductHeadings(productMarkup(page)),[c.name]);
  const r=extractPublicCoffeeFacts(page,{source_url:c.url});
  assert.equal(r.ok,true);assert.equal(r.fields.name,c.name);
  assert.doesNotMatch(String(r.fields.tasting_notes||''),/mango/i);
  assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...r,source_url:c.url}));
  const wrong=extractPublicCoffeeFacts(html('Different Selected Coffee',c.body),{source_url:c.url});
  assert.equal(wrong.ok,true);assert.notEqual(wrong.fields.name,c.name);
 }
});
test('selected washing station is not a named Refisa farmer or decaf process',()=>{
 const c=cases[1],r=extractPublicCoffeeFacts(html(c.name,c.body),{source_url:c.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,c.name);
 assert.doesNotMatch(String(r.fields.producer||''),/Testi.*Station/i);
 assert.ok(!r.fields.decaffeination_method);
});