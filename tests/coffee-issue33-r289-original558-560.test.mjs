// Issue #33 R289: original selected-source positive and hostile regressions. Not global 603 certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const cases=[
 {n:558,name:'Divine Inspiration - Nicaraguan Light-Medium Roast Relationship Coffee',
  url:'https://www.rossstreetroasting.com/products/nicaragua-divine-inspiration-relationship-coffee'},
 {n:560,name:'Guatemala La Huerta, City (mild) Roast, Direct Trade',
  url:'https://www.rustydogcoffee.com/products/guatemala'}
];
const page=(name,own,sibling='')=>'<html><head><title>Other coffee SEO: Decaf Blueberry</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+own+'</div></article></main><aside class="related-products">'+sibling+'</aside></body></html>';
const record=t=>({number:t.n,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('558/560 require actual selected identity, raw fetch, parser, Add Coffee and Source Review',()=>{
 const rows=cases.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([558,560],rows),[]);
 for(const bad of [[rows[0]], [rows[0],rows[0]], [rows[0],{...rows[1],status:'UNAVAILABLE'}],
   [{...rows[0],selected_heading_identity_verified:false},rows[1]],
   [rows[0],{...rows[1],source_review_rendered:false}],
   [rows[0],{...rows[1],add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([558,560],bad).length>0);
});
test('558 own current coffee facts, old harvest and sourcing partner are not another farm or flavor',()=>{
 const t=cases[0];
 const html=page(t.name,
  '<p>Sept 2024 Update: Fresh Crop back In Stock!</p><h3>Divine Inspiration at a glance</h3>'+
  '<p>Flavor notes: Chocolate, spiced apple, nutty</p><p>Roast level: Light-Medium</p>'+
  '<p>Origin: Nicaragua, Jinotega region</p><p>Farms: Smallholder farms in the region</p>'+
  '<p>Processing method: Washed</p><p>Current harvest: 2023-24 (Landed Sept 24)</p>'+
  '<p>Sourcing: Gold Mountain Coffee Growers (Direct Trade)</p>',
  '<h2>Related decaf Espresso</h2><p>Swiss Water, Jasmine, blueberry, Ethiopia.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.origin||''),/nicaragua/i);
 assert.match(String(p.fields.tasting_notes||''),/chocolate/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|jasmine/i);
 assert.doesNotMatch(String(p.fields.producer||''),/gold mountain/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('560 exact current farm/region/own cupping, not generic /guatemala slug or family-history speculation',()=>{
 const t=cases[1];
 const html=page(t.name,
  '<p>Cupping notes: Orange Blossom, Pecan, Honey</p><p>Farm: Vides 58</p>'+
  '<p>Region: Huehuetenango, Guatemala</p><p>Altitude: 1,550m+</p>'+
  '<p>Process: Washed</p><p>Certifications: Direct Trade</p>'+
  '<p>Vides 58 is a third-generation coffee-producing family founded in 1958 by Dr. Jorge Vides.</p>',
  '<h2>Related Colombia coffee</h2><p>Natural cherry berry roast, decaf Swiss Water.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.origin||''),/guatemala/i);
 assert.match(String(p.fields.tasting_notes||''),/orange blossom/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/cherry|berry|swiss water/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('same original URL recycled for different selected H1 cannot inherit archived coffee or flavor',()=>{
 for(const t of cases){
  const p=extractPublicCoffeeFacts(page('Completely Different Espresso','<p>Origin: Colombia</p><p>Flavor notes: Black Currant</p>'),{source_url:t.url});
  assert.equal(p.ok,true);assert.notEqual(p.fields.name,t.name);
 }
});
