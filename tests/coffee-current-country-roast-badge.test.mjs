import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractRoastVisualEvidence} from '../src/server/roast-level-evidence.mjs';
const source_url='https://examplecoffee.test/products/selected';
const badge=(place,roast,cl='gld-product-variant-text-price')=>`<div class="${cl}"><span>${place}</span><span> | ${roast}</span></div>`;
const preview=body=>extractPublicCoffeeFacts(`<main><h1>Selected Coffee</h1>${body}</main>`,{source_url});

test('a selected product compact country and supported roast badge gives explicit roast level',()=>{
 for(const [place,level] of [['Colombia','Medium'],['Mexico','Medium'],['Ethiopia','Light'],['Kenya','Medium-Dark']]){
  const html=badge(place,level),result=preview(html);
  assert.equal(result.fields.roast_level,level,`${place}: ${level}`);
  assert.ok(!result.conflicts?.includes('roast_level'));
  assert.equal(extractRoastVisualEvidence(html).source,'selected_product_country_roast_badge');
 }
});
test('a product needs the exact badge role, literal origin country and complete supported roast',()=>{
 for(const body of [
  badge('12 oz','Medium'),badge('Taste','Medium'),badge('Honey','Medium'),badge('Colombia','Medium/Medium Dark'),
  badge('Colombia','Medium +'),badge('Colombia','Medium','product-variant-text-price'),
  '<div><span>Colombia</span><span> | Medium</span></div>',
  '<nav><a>Colombia | Medium</a></nav>',
  '<div class="related-products">'+badge('Mexico','Light')+'</div>'
 ])assert.equal(preview(body).fields.roast_level,undefined,body);
});
test('two distinct explicit selected roast badges stay contradictory, never forced to one level',()=>{
 const result=preview(badge('Colombia','Medium')+badge('Mexico','Dark'));
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts?.includes('roast_level')||!result.fields.roast_level);
});
