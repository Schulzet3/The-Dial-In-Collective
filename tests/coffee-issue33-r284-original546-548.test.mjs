// R284 current primary selected-source focused tests; no 603-wide certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:546,name:'Venezuela',url:'https://www.readingcoffee.com/products/venezuela-finca-berlin-single-origin-coffee'},
 {number:547,name:'Burundi Kibingo',url:'https://www.realdope.coffee/products/burundi-kibingo'},
 {number:548,name:'Rwanda Isimbi (S.O.P)',url:'https://www.realdope.coffee/products/rawandan-isimni'}
];
const page=(name,own,sibling='')=>'<html><head><title>Unrelated coffee SEO mango decaf</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+own+'</div></article></main>'+sibling+'</body></html>';
const rec=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('546/547/548 require every selected identity and explicit editable Add Coffee and Source Review',()=>{
 const r=targets.map(rec);
 assert.deepEqual(requiredFocusedSourceFailures([546,547,548],r),[]);
 for(const bad of [r.slice(0,2),[r[0],r[1],r[1]],[r[0],{...r[1],status:'UNAVAILABLE'},r[2]],[r[0],r[1],{...r[2],selected_heading_identity_verified:false}],[{...r[0],source_review_rendered:false},r[1],r[2]],[r[0],{...r[1],add_coffee_ui_rendered:false},r[2]]])
  assert.ok(requiredFocusedSourceFailures([546,547,548],bad).length>0);
});
test('546 Venezuela own selected literal notes and producer do not inherit generic chips or unrelated decaf',()=>{
 const t=targets[0];
 const own='<p>Sourced from Finca Berlin in Táchira State, producer Alfredo Rojas. Process: Anaerobic Honey. Variety: Monte Claro. Roast Level: Medium Roast.</p>'+
 '<h2>Tasting Notes</h2><p>Fresh Coffee Cherry, Dried Cascara, Mellow Cocoa, Warm Spice.</p>'+
 '<p>Harvest: September - January. Region: Junín Municipality, Táchira State. Elevation: ~1100 MASL.</p>';
 const html=page(t.name,own,'<aside class="related-products">Other coffee: strawberry, mango, Swiss Water decaf. Flavors: Sweet and Sugary.</aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/mango|strawberry|sweet and sugary/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('547 Burundi and 548 Rwanda have separate direct flavor text; buyer reviews are not extra source',()=>{
 for(const [i,words] of [[1,'Gently tart aroma, mellow cocoa, smooth finish'],[2,'Cocoa, jasmine, juicy fruit, chocolate, nutty finish']]){
  const t=targets[i],html=page(t.name,'<p>Origin: '+(i===1?'Burundi (Kibingo)':'Rwanda (Isimbi)')+'. Roast: Medium. Tasting notes: '+words+'.</p>',
   '<aside class="related-products">Other coffee: Ethiopian Dripp, caramel, mango, Swiss Water decaf. Customer says fruity and smooth.</aside>');
  assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
  const p=extractPublicCoffeeFacts(html,{source_url:t.url});
  assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
  assert.doesNotMatch(String(p.fields.tasting_notes||''),/caramel|mango|swiss water/i);
  assert.ok(!p.fields.decaffeination_method);
  assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
 }
});
test('a source URL slug cannot certify a replaced selected product title',()=>{
 for(const t of targets){
  const p=extractPublicCoffeeFacts(page('Different Coffee','<p>Tasting notes: mango and papaya. Roast: Medium.</p>'),{source_url:t.url});
  assert.equal(p.ok,true);assert.notEqual(p.fields.name,t.name);
 }
});
