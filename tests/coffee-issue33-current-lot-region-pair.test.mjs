import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
// Original immutable603 #501, independent current official selected product.
const name='Organic Ki-Saya - Tenejapa Microlot',url='https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot';
const region='Ki-Saya, our organic gem from Chiapas, blends two Mayan words: "Ki" (tasty) and "Saayab" (nature).';
const locality='This lot hails from Tenejapa—a high-altitude spot where rich volcanic soil and ideal climate make magic happen.';
const html=(name,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body)=>extractPublicCoffeeFacts(html(name,body),{source_url:url});
const clean=value=>String(value??'').replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
test('IXXA current exact product supplies BOTH Tenejapa and Chiapas, with no invented Mexico',()=>{
 const body='<p>'+region+'</p><p>'+locality+'</p><p>Notes Of: Chocolate, creamy caramel, honey, hazelnut</p>';
 const r=parse(name,body);assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Tenejapa, Chiapas');
 assert.doesNotMatch(r.fields.origin,/\bMexico\b/i);
 assert.match(coffeeUrlPreviewMarkup(r),/Tenejapa, Chiapas/);
 const facts=extractCoffeeIdentityEvidence(html(name,body),{name,fields:{origin:'Tenejapa'},clean}).facts;
 assert.ok(facts.some(f=>f.label==='Origin'&&f.value==='Tenejapa, Chiapas'&&
  f.quote.includes(region)&&f.quote.includes(locality)));
});
test('generic product-name-bound current locality and region, not a roaster URL exception',()=>{
 const r=parse('Sierra Spring - Santa Elena',
  '<p>Sierra Spring, our newest lot from Oaxaca, delights the senses.</p>'+
  '<p>This coffee hails from Santa Elena—on the valley floor.</p>');
 assert.equal(r.fields.origin,'Santa Elena, Oaxaca');
});
test('another named coffee cannot donate its growing region',()=>{
 const r=parse('Another Coffee','<p>'+region+'</p><p>'+locality+'</p>');
 assert.notEqual(r.fields.origin,'Tenejapa, Chiapas');
});
test('historical, educational and incomplete statements cannot fabricate a combined origin',()=>{
 for(const body of [
  '<p>Previously Ki-Saya, our organic gem from Chiapas, was sold.</p><p>'+locality+'</p>',
  '<p>'+region+'</p><section><h2>What is terroir?</h2><p>'+locality+'</p></section>',
  '<p>'+region+'</p>','<p>'+locality+'</p>'
 ]){
  assert.notEqual(parse(name,body).fields.origin,'Tenejapa, Chiapas',body);
 }
});
test('two incompatible current regions or localities cannot be resolved by encounter order',()=>{
 for(const body of [
  '<p>'+region+'</p><p>Ki-Saya, our favorite coffee from Oaxaca, arrives today.</p><p>'+locality+'</p>',
  '<p>'+region+'</p><p>'+locality+'</p><p>This lot hails from Alta Verapaz—a different place.</p>'
 ]){
  assert.notEqual(parse(name,body).fields.origin,'Tenejapa, Chiapas',body);
 }
});
test('explicit incompatible selected Origin cannot be overwritten',()=>{
 const r=parse(name,'<p>Origin: Huila, Colombia</p><p>'+region+'</p><p>'+locality+'</p>');
 assert.notEqual(r.fields.origin,'Tenejapa, Chiapas');
});
test('two identical responsive product H1 elements preserve selected locality evidence',()=>{
 const page='<main><h1>'+name+'</h1><h1>'+name+'</h1><p>'+region+'</p><p>'+locality+'</p></main>';
 assert.equal(extractPublicCoffeeFacts(page,{source_url:url}).fields.origin,'Tenejapa, Chiapas');
});
