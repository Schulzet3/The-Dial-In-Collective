// Issue #33 original603 #298: current selected decaf method stated as a
// roaster-translated label after explicit at-origin decaffeination. No
// country-to-farm inference, stale SKU/SEO or related-coffee evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const officialUrl='https://sextantcoffee.com/products/plandanas-reserve-sextant-coffee';
const name='Walia Ibex - Organic Decaf Coffee';
const translated='This coffee is rather unique in that it is decaffeinated at origin in Colombia using a chemical-free process our Spanish-learning roaster loosely attempted to translate as “sugar process”.';
const prose='The flavor starts off with a dry nutty bite similar to almonds; it’s the kind of Central American coffee you like to start and end the day with because it’s sweet, heavy-bodied, warm, and comforting. Lingering brown sugar notes, balanced acidity, and lovely slightly tart cherry flavor round out this cup. '+translated;
const html=(title,body,head='')=>'<html><head><meta property="og:type" content="product">'+head+'</head><body><main><article class="product"><h1>'+title+'</h1><div class="product__description">'+body+'</div></article></main></body></html>';
const parse=(body,{title=name,head=''}={})=>extractPublicCoffeeFacts(html(title,body,head),{source_url:officialUrl});

test('current Walia Ibex selected literal translated sugar process recovers Sugar Process, not bean processing or location',()=>{
 const result=parse('<p>'+prose+'</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
 assert.equal(result.fields.process,undefined,'decaffeination method is not coffee cherry processing');
 assert.equal(result.fields.origin,undefined,'Colombia where decaffeinated is not evidence of farm origin');
 assert.match(coffeeUrlPreviewMarkup(result),/Sugar Process/);
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value===translated));
});

test('generic direct selected translated supported method vocabulary is not roaster-specific',()=>{
 const cases=[
  ['our coffee is decaffeinated at origin in Mexico using a natural process the roaster described as "Swiss Water".','Water Process'],
  ['This coffee is decaffeinated at origin in Brazil using a process the importer refers to as "carbon dioxide".','Carbon Dioxide (CO2)'],
  ['This coffee is decaffeinated at origin in Peru using a process they called "sugar process".','Sugar Process']
 ];
 for(const [sentence,expected] of cases){
  const r=parse('<p>'+sentence+'</p>');
  assert.equal(r.fields.decaffeination_method,expected,sentence);
  assert.equal(r.fields.origin,undefined,'do not convert decaf-plant location to farm origin');
 }
});

test('a long paragraph can include a current direct claim, but no nearby unrelated product can donate it',()=>{
 const current=parse('<p>Selected decaf coffee with smooth chocolate character. '+prose+'</p>');
 assert.equal(current.fields.decaffeination_method,'Sugar Process');
 const related=parse('<p>Selected decaf with smooth chocolate character.</p>'+ 
  '<section class="product-recommendations"><h2>Related Coffees</h2><p>'+translated+'</p></section>');
 assert.equal(related.fields.decaffeination_method,undefined);
 const seo=parse('<p>Selected decaf.</p>',{head:'<meta name="description" content="'+translated+'">'});
 assert.equal(seo.fields.decaffeination_method,undefined);
});

test('historical, contradicted, negated, other coffee and nonselected H1 do not claim a translated process',()=>{
 for(const s of [
  'Previously, '+translated,
  'Last year, '+translated,
  translated.replace('decaffeinated at origin','not decaffeinated at origin'),
  translated.replace('loosely attempted','incorrectly attempted'),
  translated.replace('This coffee','Our other coffee'),
  'The origin story mentions sugar process, but the current decaf method is unpublished.'
 ]){
  const r=parse('<p>'+s+'</p>');
  assert.equal(r.fields.decaffeination_method,undefined,s);
 }
 for(const other of ['Regular Walia Coffee','Walia Ibex Half-Caf','Different Organic Decaf']){
  const r=parse('<p>'+translated+'</p>',{title:other});
  assert.equal(r.fields.decaffeination_method,undefined,other);
 }
});

test('opposing direct selected methods remain blank and reviewable',()=>{
 const r=parse('<p>'+translated+'</p><p>Our decaf coffee is decaffeinated using Swiss Water.</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
 const raw=r.source_facts?.filter(f=>f.field==='decaffeination_method')||[];
 assert.ok(raw.length>=2);
 assert.ok(raw.every(f=>f.conflicting===true));
});
