// Issue33 original603 #5: actual official 44 North selected-product facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://roaster.example/products/mexico-triunfo-verde';
const location='At the edge of the El Triunfo Reserve, La Paz, Chiapas, Mexico.';
const notes='Pleasing body with notes of sweet candied lemon and dried blueberry.';
const parse=(body,name='Mexico Triunfo Verde')=>{
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
  '<main><h1>'+name+'</h1>'+body+'</main></body></html>';
 const r=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(r.ok,true,name);
 return r;
};
test('current product literal Location and Tasting notes autofill clean geography/flavors',()=>{
 const r=parse('<p>Tasting notes: '+notes+'</p><p>Roast level: Medium</p>'+
  '<p>Location: '+location+'</p><p>Farmer Cooperative: Finca Triunfo Verde, S.C</p>');
 assert.equal(r.fields.origin,'El Triunfo Reserve, La Paz, Chiapas, Mexico');
 assert.equal(r.fields.tasting_notes,'sweet candied lemon and dried blueberry');
 assert.equal(r.fields.roast_level,'Medium');
 assert.ok(!r.conflicts?.includes('origin'));
 const preview=coffeeUrlPreviewMarkup(r);
 assert.ok(preview.includes('El Triunfo Reserve, La Paz, Chiapas, Mexico'));
 assert.ok(preview.includes('sweet candied lemon and dried blueberry'));
 assert.ok(r.source_facts?.some(f=>String(f.value||'').includes(location)),
  'literal roaster location remains reviewable source evidence');
 assert.ok(r.source_facts?.some(f=>String(f.value||'').includes(notes)),
  'original mouthfeel and tasting phrase remains source evidence');
});
test('generic bounded named reserve and country without inferred geography',()=>{
 const r=parse('<p>Location: At the edge of the Monte Verde Reserve, Santa Elena, Puntarenas, Costa Rica.</p>'+
  '<p>Tasting notes: Pleasing body with tasting notes of red plum and lemon peel.</p>');
 assert.equal(r.fields.origin,'Monte Verde Reserve, Santa Elena, Puntarenas, Costa Rica');
 assert.equal(r.fields.tasting_notes,'red plum and lemon peel');
});
test('explicit contradictory country still requires member review',()=>{
 const r=parse('<p>Country: Peru</p><p>Location: '+location+'</p>');
 assert.equal(r.fields.origin,undefined);
 assert.ok(r.conflicts?.includes('origin'));
});
test('incomplete, generic, or unknown-country descriptions cannot invent an Origin',()=>{
 for(const value of [
  'At the edge of the El Triunfo Reserve',
  'At the edge of a beautiful landscape, La Paz, Chiapas, Mexico.',
  'At the edge of the El Triunfo Reserve, La Paz, Chiapas, Unknown Country.'
 ]){
  const r=parse('<p>Location: '+value+'</p>');
  assert.notEqual(r.fields.origin,'El Triunfo Reserve, La Paz, Chiapas, Mexico',value);
 }
});
test('already clean locality and explicit independent body descriptor stay unchanged',()=>{
 const r=parse('<p>Location: Tarrazu, Costa Rica</p>'+
  '<p>Tasting notes: Full Body, Dark Chocolate, Cherry</p>');
 assert.equal(r.fields.origin,'Tarrazu, Costa Rica');
 assert.equal(r.fields.tasting_notes,'Full Body, Dark Chocolate, Cherry');
});
test('unselected recommendation cannot donate geography or flavors',()=>{
 const r=parse('<p>Origin: Colombia</p><p>Tasting notes: Cocoa, Hazelnut</p>'+
  '<section class="product-recommendations"><h2>Other Coffee</h2><p>Location: '+location+
  '</p><p>Tasting notes: '+notes+'</p></section>','Current Coffee');
 assert.equal(r.fields.origin,'Colombia');
 assert.equal(r.fields.tasting_notes,'Cocoa, Hazelnut');
});
