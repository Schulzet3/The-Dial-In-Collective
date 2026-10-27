import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyProductRequest,extractShopifyAjaxData} from '../src/server/coffee-shopify-ajax.mjs';
const url='https://example.org/products/test-coffee';
const request=shopifyProductRequest(url);
const chosen=tags=>extractShopifyAjaxData({title:'Test Coffee',handle:'test-coffee',description:'<p>Current coffee.</p>',tags},request);
test('compound Medium Light Roast is one complete source tag, not an invented Light Roast',()=>{
 const v=chosen(['Medium Light Roast']);
 assert.equal(v.fields.roast_level,'Medium-Light');
 assert.ok(!v.conflicts?.includes('roast_level'));
});
test('whole literal selected roast category tags retain seven supported tiers',()=>{
 for(const [tag,expected] of [['Light Roast','Light'],['Medium Roast','Medium'],['Dark Roast','Dark'],['Medium Dark Roast','Medium-Dark'],['Light Medium Roast','Medium-Light'],['Very Light Roast','Very Light'],['Ultra Light Roast','Ultra Light']]){
  assert.equal(chosen([tag]).fields.roast_level,expected,tag);
 }
});
test('generic category phrases, partial suffix and marketing tails cannot create roast evidence',()=>{
 for(const tag of ['Super Light Roast','Floral Light Roast','Medium Light Roast Sale','Dark Roast Option','Dark Roast Coffee Subscription','The Ultra Light Roast','Medium-Light Roast Specials']){
  assert.equal(chosen([tag]).fields.roast_level,undefined,tag);
 }
});
test('multiple contradictory whole roast tags remain withheld',()=>{
 const v=chosen(['Light Roast','Dark Roast']);
 assert.equal(v.fields.roast_level,undefined);
 assert.ok(v.conflicts?.includes('roast_level'));
});
test('explicit product-prefixed Coffee_ tags still contradict an independently different roast',()=>{
 const v=extractShopifyAjaxData({title:'Test Coffee',handle:'test-coffee',description:'<p>Roast Level: Medium</p>',tags:['Coffee_Light Roast']},request);
 assert.equal(v.fields.roast_level,undefined);
 assert.ok(v.conflicts?.includes('roast_level'));
});
test('simultaneous broad and specific roast evidence cannot silently bypass a genuine conflict',()=>{
 const v=extractShopifyAjaxData({title:'Test Coffee',handle:'test-coffee',description:'<p>Roast Level: Medium</p>',
  tags:['Coffee_Light Roast','Consumer Product','medium-roast']},request);
 assert.equal(v.fields.roast_level,undefined,'conflicting same-product roast facts must be withheld');
 assert.ok(v.conflicts?.includes('roast_level'),'explicit conflict must be presented to review');
 const inconsistent=extractShopifyAjaxData({title:'Test Coffee',handle:'test-coffee',
  description:'<p>Current coffee.</p>',tags:['Coffee_Light Roast','medium-roast']},request);
 assert.equal(inconsistent.fields.roast_level,undefined,'ambiguous tags alone do not fabricate a roast');
});
test('product identity mismatch is never rescued by a roast tag',()=>{
 const v=extractShopifyAjaxData({title:'Other',handle:'not-test-coffee',tags:['Medium Light Roast']},request);
 assert.equal(v,null);
});
