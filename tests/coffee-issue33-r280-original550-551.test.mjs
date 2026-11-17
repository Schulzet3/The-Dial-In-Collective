import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:550,name:'Ethiopia Natural Kembata Grade 1 (GP)',url:'https://www.roasted-beans.com/products/ethiopia-natural-kembata-grade-1-gp'},
 {number:551,name:'Uganda Organic',url:'https://www.roasted-beans.com/products/uganda-organic'}
];
const page=(name,own,other='')=>'<html><head><title>Other coffee mango, medium roast</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+own+'</div></article></main>'+other+'</body></html>';
const record=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('550/551 official selected identities require BOTH current parser and editable review',()=>{
 const rows=targets.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([550,551],rows),[]);
 for(const bad of [[rows[0]],[rows[0],rows[0]],[rows[0],{...rows[1],status:'UNAVAILABLE'}],
  [rows[0],{...rows[1],selected_heading_identity_verified:false}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}],
  [rows[0],{...rows[1],source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([550,551],bad).length>0);
});
test('550 exact current Natural milling is not replaced by prose about a wet mill or generic wash',()=>{
 const t=targets[0],own='<p>Elevation: 2100 m. Varietals: Ethiopian Heirloom. Milling Process: Natural. Drying Process: Raised beds.</p>'+
 '<p>This particular farm is located in Durame Village of Kembata, Ethiopia. Farmers incorporate a 36-48 hour fermentation process in the wet mill, but cherries that are unwashed spend 15-21 days drying. The resulting cup has notes of blueberry and strawberry.</p>';
 const html=page(t.name,own,'<aside class="related-products"><h2>Other coffee</h2><p>Washed, Kenya, mango, decaf Swiss Water, 1950 masl.</p></aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const r=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,t.name);
 assert.doesNotMatch(String(r.fields.process||''),/^Washed$/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/mango/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('551 own Uganda flavor notes, direct Fully Washed versus unrelated Bugisu history',()=>{
 const t=targets[1],own='<p>Flavor Notes- Dark Chocolate, Raisins, Vanilla</p>'+
 '<p>Elevation: 1300 to 2000 meters. Varietals: Bourbon, Kenya SL14, Kenya SL28. Milling Process: Fully Washed. Drying Process: Patio Drying.</p>'+
 '<p>Bugisu cooperative history, the Sipi Falls Coffee Project and Kawacom as an exporter describe regional sourcing, not a named individual farm or grower.</p>';
 const html=page(t.name,own,'<aside class="related-products"><p>Rwanda: strawberry, natural, German Water decaf, Red Bourbon.</p></aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const r=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,t.name);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/strawberry/i);
 assert.doesNotMatch(String(r.fields.producer||''),/Kawacom|Bugisu Cooperative Union/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('selected H1 and user Add Coffee remain unaffected by an unrelated SEO or alternate bean',()=>{
 for(const t of targets){
  const r=extractPublicCoffeeFacts(page('Other Roasted Coffee','<p>Dark chocolate and caramel</p>'),{source_url:t.url});
  assert.equal(r.ok,true);assert.notEqual(r.fields.name,t.name);
 }
});