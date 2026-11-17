import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const names=[{number:553,name:'Organic Honduras',url:'https://www.roc2.com/products/organic-honduras'},
 {number:555,name:'Organic Timor',url:'https://www.roc2.com/products/organic-timor'}];
const html=(name,description,other='')=>'<html><head><title>Organic Mexican lighter roast - other source</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description"><p>'+description+'</p></div></article></main><aside class="related-products">'+other+'</aside></body></html>';
const record=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('553/555 require two real selected H1s plus actual editable Add Coffee and Source Review',()=>{
 const rows=names.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([553,555],rows),[]);
 for(const bad of [[rows[0]],[rows[0],rows[0]],[rows[0],{...rows[1],status:'UNAVAILABLE'}],
   [rows[0],{...rows[1],selected_heading_identity_verified:false}],
   [rows[0],{...rows[1],add_coffee_ui_rendered:false}],
   [rows[0],{...rows[1],source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([553,555],bad).length>0);
});
test('553 directly selected Honduras medium roast and own three sensory notes, no sibling transfer',()=>{
 const t=names[0],source='A sweet medium roast with a hint of honey, caramel, and chocolate. Sourced from the high-altitude farms of Honduras, this organic single-origin bean is exceptionally smooth and well-rounded.';
 const markup=html(t.name,source,'<h2>Organic Timor</h2><p>Fresh pineapple, orange juice, raw sugar, Washed, 1900m, Swiss Water decaf.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const r=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,t.name);
 for(const x of ['honey','caramel','chocolate'])assert.match(String(r.fields.tasting_notes||''),new RegExp(x,'i'));
 assert.equal(r.fields.roast_level,'Medium');assert.match(String(r.fields.origin||''),/Honduras/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/pineapple|orange juice|raw sugar/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('555 Timor direct tasting includes raw sugar finish, not only the leading pineapple and orange',()=>{
 const t=names[1],source='Sourced from the highlands of Timor, this single-origin medium roast offers a bright, clean cup with natural sweetness. Lively notes of pineapple and fresh orange juice lead the way, balanced by a smooth finish of raw sugar. A well-rounded, vibrant coffee.';
 const markup=html(t.name,source,'<h2>Organic Honduras</h2><p>Honey, caramel, chocolate, Dark roast, Natural, Kenya.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const r=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,t.name);
 for(const x of ['pineapple','orange juice','raw sugar'])assert.match(String(r.fields.tasting_notes||''),new RegExp(x,'i'));
 assert.equal(r.fields.roast_level,'Medium');assert.match(String(r.fields.origin||''),/Timor/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/honey|caramel|chocolate/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('old merchant SEO or different selected H1 cannot establish the registered coffee identity',()=>{
 for(const t of names){
  const r=extractPublicCoffeeFacts(html('Organic Mexican','A lighter roast with molasses, caramel and lemongrass notes.'),{source_url:t.url});
  assert.equal(r.ok,true);assert.notEqual(r.fields.name,t.name);
 }
});
