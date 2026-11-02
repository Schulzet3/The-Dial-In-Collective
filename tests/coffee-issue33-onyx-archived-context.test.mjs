// Issue #33: bounded synthetic adversarial fixtures grounded in the current
// official Onyx Agaro Yukro G1 page (archived on 2026-11-02).
// NOT a live raw-HTML capture or all603 / hosted member acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://onyxcoffeelab.com/products/ethiopia-agaro-yukro-g1';
const selected=(body,extra='')=>'<html><head><meta property="og:type" content="product">'+
 '<link rel="canonical" href="'+url+'"><title>Ethiopia Agaro Yukro G1 – Onyx Coffee Lab</title>'+
 '</head><body><main><article class="product"><p>This product is archived.</p>'+
 '<h1>Ethiopia Agaro Yukro G1</h1>'+body+'</article>'+extra+'</main></body></html>';
const specs='<p>Origin: Ethiopia</p><p>Process Method: Washed</p>'+
 '<p>Roast Level: Ultra Light</p>'+
 '<p>Tasting Notes: Apricot, Barley Tea, Bergamot, Caramel</p>'+
 '<p>Produced by smallholder farmers in Wanja Kersa, in the Agaro region.</p>'+
 '<p>Washed at Yukro washing station; sourced through importer Red Fox Coffee.</p>';

test('#248 archived selected lot retains its direct process and rejects educational caffeine/harvest as product facts',()=>{
 const educational='<section class="coffee-education" aria-label="General coffee education">'+
 '<h2>Caffeine</h2><p>0mg / 12oz</p><p>With less than 25mg of caffeine per 12oz cup, these coffees still have full flavor.</p>'+
 '<h2>Harvest</h2><p>The specialty harvest in East Africa takes place from October through January.</p>'+
 '<h2>Origin</h2><p>Our coffees also come from Colombia and Kenya.</p></section>';
 const html=selected(specs+'<p>This coffee will be part of our 2026 summer coffee program.</p>',educational);
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Ethiopia Agaro Yukro G1');
 assert.equal(result.fields.origin,'Agaro, Ethiopia');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.roast_level,'Ultra Light');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.doesNotMatch(String(result.fields.producer||''),/Red Fox Coffee|Yukro washing station/i);
 assert.doesNotMatch(String(result.fields.release_label||''),/2026/i);
 assert.ok(!result.conflicts?.includes('process'),JSON.stringify(result.conflicts));
});

test('#248 selected archived Washed lot cannot inherit a Natural related product or old SEO title',()=>{
 const html=selected(specs,
  '<aside class="related-products"><h2>More Coffee</h2><h3>Costa Rica Las Lajas Natural</h3>'+
  '<p>Process: Natural</p><p>Origin: Costa Rica</p></aside>')
  .replace('<title>Ethiopia Agaro Yukro G1 – Onyx Coffee Lab</title>',
   '<title>Costa Rica Las Lajas Natural - old SEO</title>');
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Ethiopia Agaro Yukro G1');
 assert.equal(result.fields.origin,'Agaro, Ethiopia');
 assert.equal(result.fields.process,'Washed');
 assert.doesNotMatch(JSON.stringify(result.fields),/Costa Rica|Las Lajas/i);
 assert.ok(!result.conflicts?.includes('process'),JSON.stringify(result.conflicts));
});
