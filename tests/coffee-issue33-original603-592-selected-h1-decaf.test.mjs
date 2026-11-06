import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

// Original603 #592: independent current exact selected official H1, Nov 6.
// Current raw official HTML SHA256 deece2718e55133ccf6fe6fe894c2484e93bb2a1444c4c1f20ba7191fdfa7a8a
// This synthetic fixture probes generic identity/source boundaries; the real
// official HTML and Add Coffee after-proof must be tested separately by CI.
const url='https://www.woodshedroast.com/products/decaf-honduran-swiss-water%C2%AE-process-copy';
const page=(name,body='',head='')=>'<html><head>'+head+'</head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body='',head='')=>extractPublicCoffeeFacts(page(name,body,head),{source_url:url});

const woodshed='Honduran Decaf | Swiss Water® Processed';
const direct='<p>A rich Honduran decaf from Copan with citrus-forward, fruity sweetness and syrupy body.</p>'+
 '<p>The Swiss Water® Process is a chemical-free decaffeination process that brings out the best flavor in coffee beans.</p>';

test('original603 #592 exact named current H1 supplies Water Process without inventing green process or roast',()=>{
 const r=parse(woodshed,direct+'<p>Origin: Copan, Honduras</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,woodshed);
 assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,undefined);
 assert.equal(r.fields.roast_level,undefined);
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&f.value===woodshed));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});

test('strict current chosen title also admits Mountain Water Processed as water treatment',()=>{
 const r=parse('Mexico Decaf | Mountain Water Processed','<p>Origin: Mexico</p>');
 assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,undefined);
});

test('a regular or mixed-caffeine coffee cannot receive a full-decaf method from its title',()=>{
 for(const name of ['Honduras Coffee | Swiss Water® Processed',
  'Half-Caf Honduras | Swiss Water® Processed',
  'Semi-Decaf Honduras | Swiss Water® Processed']){
  const r=parse(name,'<p>Origin: Honduras</p>');
  assert.equal(r.fields.decaffeination_method,undefined,name);
 }
});

test('SEO, recommendation and unselected product headings cannot donate a water method',()=>{
 const seo='<meta property="og:title" content="Honduran Decaf | Swiss Water® Processed">';
 assert.equal(parse('Honduran Decaf','<p>Origin: Honduras</p>',seo).fields.decaffeination_method,undefined);
 const related='<section class="product-recommendations"><h2>Other coffees</h2><h3>'+woodshed+'</h3></section>';
 assert.equal(parse('Honduran Decaf',related).fields.decaffeination_method,undefined);
 const competing=parse('Honduran Decaf','<h1>'+woodshed+'</h1><p>Origin: Honduras</p>');
 assert.equal(competing.fields?.decaffeination_method,undefined,
  'a competing product H1 fails the entire parse; no field can be donated');
});

test('bare mention, negation, past lot and incomplete water suffix do not authorize current method',()=>{
 for(const name of [
  'Honduran Decaf | Swiss Water',
  'Honduran Decaf | Previously Swiss Water® Processed',
  'Honduran Decaf | NOT Swiss Water® Processed',
  'Honduran Decaf | Swiss Water® Processed Last Year'
 ]){
  const r=parse(name,'<p>Origin: Honduras</p>');
  assert.equal(r.fields.decaffeination_method,undefined,name);
 }
});

test('opposing selected-current method statement must remain blank, not privilege H1',()=>{
 const r=parse(woodshed,'<p>Decaffeination Method: Sugar Cane EA Decaf</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
 assert.ok(r.source_facts?.some(f=>f.field==='decaffeination_method'&&f.conflicting));
});
