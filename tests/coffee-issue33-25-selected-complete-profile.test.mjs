// Issue33 original603 #25: faithful selected-Coffee-profile role and hostile
// counterexamples. Synthetic fixtures DO NOT replace current official HTTPS.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';
const url='https://bleucoffee.com/products/copy-of-papua-new-guinea';
const name='Sumatra Mandheling| Fair Trade Organic';
const profile="Coffee profile: Coffee features floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa.";
const clean=(v,max=6001)=>String(v).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const page=(p=profile,extra='',meta='')=>
 '<html><head><meta property="og:type" content="product"/><link rel="canonical" href="'+url+'"/>'+meta+
 '</head><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description rte"><p>'+p+'</p>'+
 '<p>Varietals: Bourbon, Tim Tim, Catimor</p><p>Elevation: 1,200-1,500 Meters</p></div></article></main>'+
 extra+'</body></html>';

test('one directly selected Coffee profile retains BOTH aromas and flavors, unchanged literal distinction',()=>{
 const html=page(),literal=extractProductFlavorEvidence(html,{clean});
 assert.match(literal,/vanilla and pipe tobacco/);
 assert.match(literal,/flavors of black cherry, tobacco, and cocoa/);
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 const notes=r.fields.tasting_notes||'';
 for(const term of ['floral','fruity','sweet aromas','vanilla','pipe tobacco',
  'rich, lush','black cherry','tobacco','cocoa'])assert.ok(notes.toLowerCase().includes(term),notes);
 assert.doesNotMatch(notes,/Papua New Guinea/i);
 assert.equal(r.fields.process,undefined,'no invented green process');
 assert.equal(r.fields.roast_level,undefined,'optional roast profile has no asserted roast');
});

test('historical, conditional, irrelevant or separately named coffee prose cannot donate aromas',()=>{
 for(const bad of [
  'Previously, '+profile,
  'When served with milk, '+profile,
  'The previous harvest had '+profile,
  'Another coffee: '+profile,
  'Coffee profile: Coffee has floral aromas of vanilla, with chocolate flavors of cocoa when cooled.',
  'Coffee profile: Coffee features floral aromas of vanilla, with rich flavors of cocoa, if brewed with milk.'
 ]){
  const fallback=extractProductFlavorEvidence(page(bad),{clean});
  assert.doesNotMatch(fallback,/vanilla/i,bad);
  const r=extractPublicCoffeeFacts(page(bad),{source_url:url});
  assert.doesNotMatch(r.fields?.tasting_notes||'',/vanilla/i,bad);
 }
 const outside=page('A dark chocolate coffee.',
  '<aside class="related-products"><h2>Another coffee</h2><p>'+profile+'</p></aside>');
 const related=extractPublicCoffeeFacts(outside,{source_url:url});
 assert.doesNotMatch(related.fields?.tasting_notes||'',/vanilla|pipe tobacco/i);
});

test('SEO-only profile, wrong selected region, or unsupported separated aroma must not be promoted',()=>{
 const seo=page('A rich cup.','',
  '<meta name="description" content="'+profile+'"/>');
 const r=extractPublicCoffeeFacts(seo,{source_url:url});
 assert.doesNotMatch(r.fields?.tasting_notes||'',/pipe tobacco/i);
 for(const bad of [
  'Coffee profile: Coffee features floral aromas of vanilla, but flavors of cocoa.',
  'Coffee profile: Coffee features floral aromas of vanilla; with smooth flavors of cocoa.',
  'Coffee profile: Coffee features aromas of vanilla, with flavors of cocoa and body.',
  'Coffee profile: Coffee features floral aromas of vanilla with cocoa flavors of chocolate.'
 ]){
  assert.doesNotMatch(extractProductFlavorEvidence(page(bad),{clean}),/vanilla.*cocoa/i,bad);
 }
});
