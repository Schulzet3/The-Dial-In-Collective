// Issue #33 R289: selected literal source and hostile misattribution, not 603-wide certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:138,name:'Red Bourbon DECAF',url:'https://gnosiscoffee.com/products/red-bourbon-decaf'},
 {number:484,name:'Colombia Community Harvest',url:'https://www.fazendacoffee.com/products/colombia-antioquia'}
];
const page=(name,description,other='')=>'<html><head><title>SEO: another Ethiopia natural coffee with grapefruit</title></head>'+
 '<body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+description+
 '</div></article></main><aside class="related-products">'+other+'</aside></body></html>';
const record=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,
 selected_h1:[t.name],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name:t.name},
 add_coffee_ui_rendered:true,source_review_rendered:true});
test('138/484 fail closed on absent, duplicated, replaced or noneditable original-selected sources',()=>{
 const valid=targets.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([138,484],valid),[]);
 for(const bad of [[valid[0]],[valid[1],valid[1]],
  [{...valid[0],status:'UNAVAILABLE'},valid[1]],
  [valid[0],{...valid[1],selected_heading_identity_verified:false}],
  [valid[0],{...valid[1],source_review_rendered:false}],
  [{...valid[0],add_coffee_ui_rendered:false},valid[1]]])
  assert.ok(requiredFocusedSourceFailures([138,484],bad).length>0);
});
test('138 selected five literal tastes remain distinct from decaf method and unrelated product SEO',()=>{
 const t=targets[0];
 const html=page(t.name,
  '<p>Producer: Wilton Benítez and Paraíso 92</p><p>Variety: Red Bourbon</p>'+
  '<p>Decaffeination: Sugarcane (EA)</p><p>Roast Level: Light</p>'+
  '<p>Tasting Notes: Bergamot, Red Fruit, Cola, Peach, Caramel. Sweet, Bright, Syrupy.</p>'+
  '<p>The cup opens with bright bergamot and juicy red fruit, followed by ripe peach and classic cola sweetness. A smooth caramel finish.</p>',
  '<h2>Another coffee</h2><p>Blueberry, grapefruit and Guji; Swiss Water decaf.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,t.name);
 const n=String(p.fields.tasting_notes||'').toLowerCase();
 for(const word of ['bergamot','red fruit','cola','peach','caramel'])
  assert.ok(n.includes(word),'must preserve selected literal '+word);
 assert.doesNotMatch(n,/blueberry|grapefruit|swiss water/);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('484 current same-product cooperative is not evidence of named farmer or Huila farm',()=>{
 const t=targets[1];
 const html=page(t.name,
  '<p>Medium Roast</p><p>Tasting Notes: Caramel, Citrus, Cocoa</p>'+
  '<p>COMMUNITY HARVEST is layered with a warm, earthy depth, with milk chocolate and toasted nuts.</p>'+
  '<p>Crafted through the care and dedication of a farmers’ cooperative.</p>'+
  '<p>Our sourcing partner runs a coffee growers education program.</p>',
  '<h2>Other Colombian coffee</h2><p>Huila, washed Gesha, Finca El Paraiso, 1900 masl, imported from Antioquia.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,t.name);
 assert.doesNotMatch(String(p.fields.producer||''),/Huila|El Paraiso|Gesha/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Huila|Antioquia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Gesha|El Paraiso/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('recycled selected URL with a different current H1 cannot certify the archived identity',()=>{
 for(const t of targets){
  const p=extractPublicCoffeeFacts(page('Different Current Harvest',
    '<p>Tasting Notes: Raspberry, Maple, Swiss Water.</p>'),{source_url:t.url});
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.name,t.name);
 }
});
