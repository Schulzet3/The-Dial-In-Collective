// Original603 #603: distinguish the cooperative dry mill from growing farms.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProcessingSiteNotFarmOrigin as correct} from '../src/server/coffee-processing-site-origin-guard.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Nicaragua Segovia, 1 lb (16 oz)';
const url='https://zekescoffee.com/products/nicaragua-segovia-1-lb-16-oz';
const mill='Sun-drying and final processing takes place at the coop’s dry mill, Las Segovias, located in the town of Palacaguina.';
const blocks=(s=mill,n=name)=>[{tag:'h1',text:n},{tag:'p',text:s,section:'Description'}];
const current=(extra='',h1=name)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+h1+'</h1><div class="product-description"><p>Over 2,300 farmers contribute to the PRODECOOP cooperative.</p><p>The initial coffee processing takes place on individual farms.</p><p>'+mill+'</p><p>Full-bodied with notes of almond, cocoa and caramel.</p>'+extra+'</div></article></main></body></html>';
test('selected mill town is not a farm-growing origin; country remains source supported',()=>{
 const found=correct({name,origin:'Palacaguina, Nicaragua',blocks:blocks()});
 assert.equal(found?.country,'Nicaragua');
 assert.equal(found?.town,'Palacaguina');
 assert.match(found.quote,/dry mill/);
});
test('selected product parser and Add Coffee do not promote a processing town',()=>{
 const q=extractPublicCoffeeFacts(current(),{source_url:url});
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.notEqual(q.fields.origin,'Palacaguina, Nicaragua',JSON.stringify(q));
 assert.ok(coffeeUrlPreviewMarkup(q));
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url:url}));
});
test('direct selected growing or labeled origin overrides mill inference',()=>{
 for(const s of [
  mill+' Farmers grow this coffee in Palacaguina.',
  mill+' Region: Palacaguina.',
  mill+' Location: Palacaguina, Nicaragua.'
 ])assert.equal(correct({name,origin:'Palacaguina, Nicaragua',blocks:blocks(s)}),null,s);
});
test('historical, hypothetical and unrelated source cannot displace a farm origin',()=>{
 for(const s of [
  mill.replace('takes place','previously took place'),
  mill.replace('located','might be located'),
  'The coop’s main office is in Palacaguina.',
  'Our warehouse and delivery hub is located in the town of Palacaguina.'
 ])assert.equal(correct({name,origin:'Palacaguina, Nicaragua',blocks:blocks(s)}),null,s);
 assert.equal(correct({name,origin:'Palacaguina, Nicaragua',blocks:blocks(mill,'Another coffee')}),null);
 assert.equal(correct({name,origin:'Palacaguina, Nicaragua',blocks:blocks(mill,'Colombia Segovia')}),null);
});
test('related, educational and ambiguous multiple mill references cannot leak',()=>{
 assert.equal(correct({name,origin:'Palacaguina, Nicaragua',
  blocks:[{tag:'h1',text:name},{tag:'p',text:mill,section:'Related products'}]}),null);
 assert.equal(correct({name,origin:'Palacaguina, Nicaragua',
  blocks:[{tag:'h1',text:name},{tag:'p',text:mill,educational:true}]}),null);
 assert.equal(correct({name,origin:'Palacaguina, Nicaragua',
  blocks:[{tag:'h1',text:name},{tag:'p',text:mill},{tag:'p',text:mill}]}),null);
 assert.equal(correct({name,origin:'Palacaguina, Colombia',blocks:blocks()}),null);
});
