// Issue #33 original603 #287: source-selected region versus producer role.
// Bounded source-backed synthetic HTML, not a substitute for official live replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roadmapcoffeeworks.com/products/mexico-cesmach';
const name='Mexico Angel Albino Corzo';
const quote='Angel Albino Corzo is the region in Chiapas state, not the producer.';
const enc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function selected({product=name,story=quote,related=''}={}){
 const html='<html><head><meta property="og:type" content="product"/>'+
  '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:product,url,brand:'Roadmap CoffeeWorks'})+
  '</script></head><body><main><article class="product"><h1>'+enc(product)+'</h1>'+
  '<div class="product__description"><p><strong>Farm:</strong> FFESICH Cooperative</p>'+
  '<p><strong>Region:</strong> Chiapas</p><p><strong>Production Method:</strong> Washed</p>'+
  '<p><strong>Roast Level:</strong> Medium</p>'+
  (story?'<p>'+enc(story)+'</p>':'')+'</div></article>'+
  (related?'<section><h2>Other Coffees</h2><p>'+enc(related)+'</p></section>':'')+
  '</main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('exact selected H1 region is origin, NOT producer',()=>{
 const r=selected();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.origin,'Angel Albino Corzo, Chiapas, Mexico',JSON.stringify(r.fields));
 assert.equal(r.fields.producer,'FFESICH Cooperative');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.roast_level,'Medium');
 assert.ok(!r.conflicts?.includes('origin'),JSON.stringify(r.conflicts));
});
test('unpublished finer region remains blank without direct clause',()=>{
 const r=selected({story:''});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Chiapas, Mexico',JSON.stringify(r.fields));
});
test('producer statement cannot be reinterpreted as region',()=>{
 const r=selected({story:'Angel Albino Corzo is the producer in Chiapas state, not the region.'});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Chiapas, Mexico',JSON.stringify(r.fields));
});
test('unselected named product in a story cannot donate its region',()=>{
 const r=selected({product:'Mexico Sierra Bella'});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Chiapas, Mexico',JSON.stringify(r.fields));
});
test('related-coffee region is not selected product evidence',()=>{
 const r=selected({story:'',related:quote});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Chiapas, Mexico',JSON.stringify(r.fields));
});
