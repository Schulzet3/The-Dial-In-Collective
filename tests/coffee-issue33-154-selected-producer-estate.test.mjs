// Issue33 original603 #154, #196 current selected grower-vs-estate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedDirectProductCredits} from '../src/server/coffee-direct-product-prose.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const source_url='https://roaster.example/products/colombia-jose-giraldo';
const name='Colombia José Giraldo Entre Montañas';
const story="A wonderful set of coffees from producer José Giraldo's Las Marias estate. Same producer, estate, and variety; different plots and processing.";
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const page=(h1,body)=>'<html><head><meta property="og:type" content="product"></head><body><main class="product"><h1>'+esc(h1)+'</h1><section class="product-information"><h2>Coffee overview</h2>'+body+'</section></main></body></html>';
const parse=(h1,body)=>extractPublicCoffeeFacts(page(h1,body),{source_url});
const farm='<p>Farm: Las Marias</p><p>Region: Pijao, Quindío</p><p>Country: Colombia</p><p>Variety: Green-tip Gesha</p><p>Process: Oxydator washed</p><p>Tasting Notes: Cotton candy grape, rose, Cardamaro</p>';
const clean=html=>String(html).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const actual=()=>parse(name,'<p>'+esc(story)+'</p>'+farm);

test('current selected exact H1 and named grower estate override only Farm fallback, preserve fields and Add Coffee',()=>{
 const r=actual();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.producer,'José Giraldo',JSON.stringify(r));
 assert.equal(r.roaster_details.farm,'Las Marias',JSON.stringify(r));
 assert.equal(r.fields.origin,'Pijao, Quindío, Colombia');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'Green-tip Gesha');
 assert.match(r.fields.tasting_notes,/Cotton candy grape/);
 assert.match(coffeeUrlPreviewMarkup(r),/José Giraldo/);
 assert.ok(r.source_facts.some(f=>/Farm|Las Marias/.test(String(f.value))));
 const direct=selectedDirectProductCredits(page(name,'<p>'+esc(story)+'</p>'+farm),{name,clean});
 assert.equal(direct.producer,'José Giraldo');
 assert.equal(direct.named_estate_farm,'Las Marias');
});

test('named grower estate source is generic, not a named roaster/product allowlist',()=>{
 const n='Peru Natalia Flores Especial';
 const s="Our current release from producer Natalia Flores's Villa Verde estate is a specialty lot.";
 const r=parse(n,'<p>'+s+'</p><p>Farm: Villa Verde</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.producer,'Natalia Flores');
 assert.equal(r.roaster_details.farm,'Villa Verde');
});

test('wrong chosen H1, other coffee and historical grower are not rescued from Farm',()=>{
 const cases=[
  ['Colombia Unrelated Lot',story],
  [name,"Previously, our lot was from producer José Giraldo's Las Marias estate."],
  [name,"The other coffee is from producer José Giraldo's Las Marias estate."],
  [name,"We are no longer sourcing from producer José Giraldo's Las Marias estate."],
  [name,"This coffee is grown at Las Marias; another offering comes from producer José Giraldo's Las Marias estate."]
 ];
 for(const [h1,s] of cases){
  const r=parse(h1,'<p>'+esc(s)+'</p>'+farm);
  assert.notEqual(r.fields.producer,'José Giraldo',s);
 }
});

test('explicit disagreeing Farm does not allow person overwrite, while explicit Producer stays authoritative',()=>{
 const mismatch=parse(name,'<p>'+esc(story)+'</p><p>Farm: Finca Esperanza</p>');
 assert.notEqual(mismatch.fields.producer,'José Giraldo',JSON.stringify(mismatch));
 const explicit=parse(name,'<p>'+esc(story)+'</p>'+farm+'<p>Producer: Ana Lopez</p>');
 assert.notEqual(explicit.fields.producer,'José Giraldo',JSON.stringify(explicit));
});

test('two incompatible named estate grower claims fail closed',()=>{
 const n='Colombia José Giraldo Ana Lopez Estate';
 const text="This release is from producer José Giraldo's Las Marias estate. Also from producer Ana Lopez's Villa Verde estate.";
 const direct=selectedDirectProductCredits(page(n,'<p>'+esc(text)+'</p><p>Farm: Las Marias</p>'),{name:n,clean});
 assert.notEqual(direct.producer,'José Giraldo');
 assert.notEqual(direct.producer,'Ana Lopez');
});

test('selected #196 farm credit with farmer parenthesis and anaerobic-washed evidence is not rewritten',()=>{
 const n='El Silencio — Chiroso Washed';
 const r=parse(n,'<p>Alex Metrio farms El Silencio in Urrao, Antioquia.</p><p>Farm: El Silencio (Alex Metrio)</p><p>Process: Washed, 30-hour anaerobic fermentation</p>');
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.producer,'José Giraldo');
 assert.equal(r.fields.producer,'El Silencio (Alex Metrio)');
 assert.equal(r.fields.process,'Anaerobic');
});
