import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeJson,publicCheckoutTemplate} from '../scripts/audit/coffee-public-json-sanitizer.mjs';
const url='https://nomadcoffee.es/products/centroamericano-natural-anaerobico';
const cart='https://nomadcoffee.es/cart/{variant_id}:{quantity}';
test('public JSON-LD offer cart template survives without changing other published facts',()=>{
 const source={name:'Selected Coffee',hasVariant:[{name:'250g',offers:{price:25.5,
   availability:'https://schema.org/InStock',checkoutPageURLTemplate:cart}}]};
 assert.deepEqual(JSON.parse(sanitizeJson(source,url)),source);
});
test('a session token, customer email, and account checkout are never copied to a fixture',()=>{
 const secret={checkoutPageURLTemplate:'https://nomadcoffee.es/checkout/customer_token?secret=abc',
  customerEmail:'private@example.com',sessionToken:'private',cartSecret:'do-not-copy',price:25.5};
 assert.deepEqual(JSON.parse(sanitizeJson(secret,url)),{price:25.5});
});
test('checkout templates must be HTTPS, same-roaster, bounded, and limited to a public cart',()=>{
 assert.equal(publicCheckoutTemplate(cart,url),true);
 for(const bad of ['http://nomadcoffee.es/cart/123','https://evil.example/cart/123',
   'https://nomadcoffee.es/checkout/123','https://nomadcoffee.es/cart/123?token=secret',
   'https://nomadcoffee.es/cart/123#private','https://user:password@nomadcoffee.es/cart/123',
   'https://nomadcoffee.es/cart/'+('x'.repeat(620))]){
   assert.equal(publicCheckoutTemplate(bad,url),false,bad);
 }
});
test('unrelated public variant metadata survives while sensitive nested fields are stripped',()=>{
 const data={variants:[{sku:'AB-1',offers:{price:12,checkoutPageURLTemplate:cart,
  customer:{email:'x@example.com'},authorization:'private',session:'private'}}]};
 assert.deepEqual(JSON.parse(sanitizeJson(data,url)),{variants:[{sku:'AB-1',offers:{price:12,checkoutPageURLTemplate:cart}}]});
});
