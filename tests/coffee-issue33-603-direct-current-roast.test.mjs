import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.examplecoffee.com/products/ethiopia-yirgacheffe';
const story='A classic single-origin cup from the birthplace of coffee, our meticulously sourced Ethiopia Yirgacheffe Mamo Kacha is roasted light to highlight its explosive aroma, sweet floral and citrus notes, and distinctively herbal, tea-like body.';
const page=(name,html,meta='')=>'<html><head>'+meta+'</head><body><main><h1>'+name+'</h1><div itemprop="description">'+html+'</div></main></body></html>';
const parse=(name,body,meta='')=>extractPublicCoffeeFacts(page(name,body,meta),{source_url:url});
test('original captured O.Henry literal selected current roast supplies Light and Add Coffee preview',()=>{
 const r=parse('Ethiopia Yirgacheffe','<p>'+story+'</p>');
 assert.equal(r.ok,true);assert.equal(r.fields.roast_level,'Light');
 assert.match(coffeeUrlPreviewMarkup(r),/Light/);
});
test('current Product JSON with matching selected identity preserves direct Light',()=>{
 const product={'@context':'https://schema.org','@type':'Product',name:'Ethiopia Yirgacheffe',url,description:story};
 const json='<script type="application/ld+json">'+JSON.stringify(product)+'</script>';
 assert.equal(parse('Ethiopia Yirgacheffe','<p>'+story+'</p>',json).fields.roast_level,'Light');
});
test('unrelated, historic, generic, educational and relative roasts cannot be inferred',()=>{
 const cases=[
  ['Kenya Coffee',story],
  ['Ethiopia Yirgacheffe','Our previous Ethiopia Yirgacheffe Mamo Kacha is roasted light.'],
  ['Ethiopia Yirgacheffe','Typically Ethiopia Yirgacheffe is roasted light for pour-over.'],
  ['Ethiopia Yirgacheffe','Many roasters roast light.'],
  ['Ethiopia Yirgacheffe','Our Ethiopia Yirgacheffe is roasted lighter than our house blend.']
 ];
 for(const [name,copy] of cases)assert.notEqual(parse(name,'<p>'+copy+'</p>').fields.roast_level,'Light',copy);
 assert.notEqual(parse('Ethiopia Yirgacheffe','<h2>What is coffee?</h2><p>'+story+'</p>').fields.roast_level,'Light');
});
test('two incompatible explicit current roast tiers cannot be resolved by source order',()=>{
 const r=parse('Ethiopia Yirgacheffe','<p>Our Ethiopia Yirgacheffe is roasted light.</p><p>Our Ethiopia Yirgacheffe is roasted dark.</p>');
 assert.equal(r.fields.roast_level,undefined);
});
