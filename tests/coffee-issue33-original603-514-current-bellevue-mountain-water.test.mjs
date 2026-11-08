import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Original frozen603 #514, current public selected source:
// https://www.lilrhodycoffee.com/products/bellevue-decaf-blend
// Source-shaped synthetic HTML: NOT a captured raw official HTML byte digest.
const sourceUrl='https://lilrhody.example/products/bellevue-decaf-blend';
const chosen='Bellevue - Decaf Blend';
const direct='Capturing the elegance of Newport, Bellevue is a single-origin mountain water decaf from Colombia that does not compromise on flavor. This versatile roast offers smooth notes of milk chocolate, cherry, and caramel.';
function selectedPage({current='Current Coffee: Colombia Hulia MWP Decaf',story=direct,related=''}={}){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+sourceUrl+'"></head><body><main><article class="product">'+
  '<h1>'+chosen+'</h1><div class="product__description"><p>'+current+'</p>'+
  '<p>'+story+'</p></div></article>'+related+'</main></body></html>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(parsed?.ok,true,JSON.stringify(parsed));
 assert.equal(parsed.fields.name,chosen,JSON.stringify(parsed.fields));
 return parsed;
}

test('original603 #514 direct exact selected Bellevue prose supplies Water Process decaffeination, not green processing',()=>{
 const result=selectedPage();
 assert.equal(result.fields.decaffeination_method,'Water Process',JSON.stringify(result.fields));
 assert.equal(result.fields.process,undefined,'No current literal green-cherry process');
});

test('a current decaf description without a named treatment stays unfilled',()=>{
 const result=selectedPage({current:'Current Coffee: Colombia decaf',story:'Bellevue is a single-origin decaf from Colombia with milk chocolate and cherry notes.'});
 assert.equal(result.fields.decaffeination_method,undefined);
});

test('a previous lot cannot donate a water decaffeination treatment',()=>{
 const result=selectedPage({current:'Current Coffee: Colombia decaf',story:'Bellevue is a single-origin decaf from Colombia. The previous lot was a mountain water decaf.'});
 assert.equal(result.fields.decaffeination_method,undefined);
});

test('different product in recommended area cannot donate method to Bellevue',()=>{
 const result=selectedPage({current:'Current Coffee: Colombia decaf',story:'Bellevue is a single-origin decaf from Colombia.',related:'<section class="product-recommendations"><h2>Other Coffees</h2><p>Newport is a single-origin mountain water decaf from Colombia.</p></section>'});
 assert.equal(result.fields.decaffeination_method,undefined);
});

test('unrelated named present coffee method is not Bellevue method',()=>{
 const result=selectedPage({current:'Current Coffee: Colombia decaf',story:'Newport is a single-origin mountain water decaf from Colombia.'});
 assert.equal(result.fields.decaffeination_method,undefined);
});

test('explicitly negated water method cannot become canonical method',()=>{
 const result=selectedPage({current:'Current Coffee: Colombia decaf',story:'Bellevue is not a mountain water decaf from Colombia.'});
 assert.equal(result.fields.decaffeination_method,undefined);
});
