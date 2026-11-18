// #33 R288: original selected Ross Street products, no global original603 certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const names=[
 {n:556,name:'Family Tradition - Brazilian Coffee, Seibt Family Farm, Cerrado Mineiro Region',url:'https://www.rossstreetroasting.com/products/family-tradition-brazilian-coffee-seibt-family-farm-cerrado-mineiro-region'},
 {n:557,name:'Kula Peaberry - Papua New Guinea Light-Medium Roast Relationship Coffee',url:'https://www.rossstreetroasting.com/products/kula-peaberry-papua-new-guinea'}
];
const page=(name,own,other='')=>'<html><head><title>Other coffee in SEO: Decaf Jasmine</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+own+'</div></article></main><aside class="related-products">'+other+'</aside></body></html>';
const record=t=>({number:t.n,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('556/557 must both have exact official selected identity, parser and editable Add Coffee/Source Review',()=>{
 const rows=names.map(record);
 assert.deepEqual(requiredFocusedSourceFailures([556,557],rows),[]);
 for(const bad of [[rows[0]],[rows[0],rows[0]],[rows[0],{...rows[1],status:'UNAVAILABLE'}],
  [{...rows[0],selected_heading_identity_verified:false},rows[1]],
  [rows[0],{...rows[1],source_review_rendered:false}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([556,557],bad).length>0);
});
test('556 exact farm and country, historical separate geography and supplier never supply tasting or processing',()=>{
 const t=names[0];
 const markup=page(t.name,
  '<p>About Seibt Family Farm Coffee</p><p>Roast level: Medium-Dark</p><p>Origin: Seibt Family Farm, Cerrado Mineiro Region, Brazil</p><p>Elevation: 900 masl / 3000 ft</p><p>Sourcing partner: Gaúcha Specialty Coffee, West Des Moines, Iowa</p>'+
  '<p>Caroline Seibt grew up a second-generation farmer in Minas Gerais. Her family grows coffee. Matthew Kruse is a partner in Gaúcha Specialty Coffee.</p>',
  '<h2>Other natural coffee</h2><p>Blueberry, Jasmine, Swiss Water Decaf, Washed. </p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const p=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.origin||''),/brazil/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|jasmine/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('557 named estate and sourcing vendor distinct; educational Kula sorting is not proof of standard processing',()=>{
 const t=names[1];
 const markup=page(t.name,
  '<h3>Kula Peaberry at a glance</h3><p>Tasting notes: Sweet aroma, chocolate & raisin/dried fruit notes, earthy, med-heavy body, syrupy mouthfeel</p>'+
  '<p>Roast color: Light-Medium</p><p>Country: Papua New Guinea</p><p>Region: Waghi Valley</p><p>Farm: Sigri Estate</p><p>Tree variety: Predominantly Typica</p><p>Elevation: 1,500-1,600 masl</p>'+
  '<p>Sourcing: Benchmark Coffee Traders (Relationship Coffee)</p><p>Kula refers to special sorting & processing by Benchmark, not an identified washed, natural or honey process.</p>',
  '<h2>Related Brazil coffee</h2><p>Seibt Family Farm, Gaúcha Specialty, 900 masl, Swiss Water and cinnamon.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const p=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.origin||''),/papua new guinea/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/cinnamon|swiss water/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('recycled exact URL with another visible H1 cannot certify original product identity',()=>{
 for(const t of names){
  const p=extractPublicCoffeeFacts(page('Another Lot Espresso','<p>Origin: Colombia. Tasting notes: black currant.</p>'),{source_url:t.url});
  assert.equal(p.ok,true);assert.notEqual(p.fields.name,t.name);
 }
});
