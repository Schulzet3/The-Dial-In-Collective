import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

test('44 North selected Honduras COMSA Decaf keeps decaffeination separate from unpublished primary processing',()=>{
 const html=`<!doctype html><html><head>
 <title>Decaf - Honduras COMSA – 44 North Coffee</title>
 <meta property="og:site_name" content="44 North Coffee"></head><body>
 <main><article class="product">
 <h1>Decaf - Honduras COMSA</h1>
 <p>Our decaf offering is a water-processed (non-chemical) medium-dark roast rotating seasonally between 3 decaf options: Decaf Peru (winter-spring), Decaf Honduras (spring-summer), and Decaf Mexico (fall-winter).</p>
 <p>Tasting notes: Rich body with aroma of lemongrass and notes of warm peach.</p>
 <p>Roast level: Medium</p>
 <p>Location: Municipality of La Encarnación in the Ocotepeque department in Honduras near the border of El Salvador.</p>
 <p>Farmer Partner: COMSA</p>
 <p>Decaffeination method: Water process (non-chemical).</p>
 </article></main></body></html>`;
 const result=extractPublicCoffeeFacts(html,{source_url:'https://44northcoffee.com/products/honduras-decaf'});
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Water Process');
 assert.equal(result.fields.process,undefined,'Published water decaffeination must never be used as cherry processing');
 assert.notEqual(result.fields.origin,'Mexico','Do not override explicitly selected Honduras product with generic fall-winter schedule');
});

test('44 North generic rotation is informational, not proof of a primary processing method',()=>{
 const result=extractPublicCoffeeFacts(
  '<main><h1>Decaf - Honduras COMSA</h1><p>Decaf Peru (winter-spring), Decaf Honduras (spring-summer), Decaf Mexico (fall-winter).</p></main>',
  {source_url:'https://44northcoffee.com/products/honduras-decaf'});
 assert.equal(result.fields.process,undefined);
 assert.equal(result.fields.decaffeination_method,undefined);
});
