import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Exact currently selected product H1, not site-wide menu/SEO.
const wrap=(name,inner,head='')=>'<html><head>'+head+'</head><body><main><h1>'+name+'</h1>'+inner+'</main></body></html>';
const selected='<div class="coffee-highlights-slider" role="region" aria-label="Scrolling text slider"><ul class="slides-wrapper"><li class="slide active"><p class="slide-content">Wet Process & SugarCane Ethyl Acetate Decaffeination</p></li></ul></div>';
const parse=(name,inside,head='')=>extractPublicCoffeeFacts(wrap(name,inside,head),{source_url:'https://example-coffee.test/products/current-selected'});

test('a current selected highlight preserves sugarcane EA decaf separate from its washed green processing',()=>{
 const r=parse('Sugarcane Decaf',selected+'<p>Process: Washed</p><p>Origin: Huila, Colombia</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.decaffeination_method,'Sugar Process');
 assert.equal(r.fields.process,'Washed');
 assert.ok(r.source_facts.some(x=>x.field==='decaffeination_method'&&/SugarCane Ethyl Acetate Decaffeination/i.test(x.value)));
});

test('same source form without separate Process label still identifies only the decaf method',()=>{
 const r=parse('Sugarcane Decaf',selected);
 assert.equal(r.fields.decaffeination_method,'Sugar Process');
 assert.notEqual(r.fields.process,'Honey');
});

test('selected regular and mixed-caffeine coffees cannot inherit another decaf product highlight',()=>{
 for(const name of ['Colombia Washed','Half-Caf Colombia']){
  const r=parse(name,selected);
  assert.equal(r.fields.decaffeination_method,undefined,name);
 }
});

test('only exact selected product H1; unrelated/related product and SEO never supply method',()=>{
 const other='<section class="related products"><h2>You may also like</h2>'+selected+'</section>';
 const met='<meta name="description" content="Wet Process & SugarCane Ethyl Acetate Decaffeination">';
 for(const [html,head] of [[other,''],['<p>Sweet, Balanced, Smooth</p>',met]]){
  const r=parse('Sugarcane Decaf',html,head);
  assert.equal(r.fields.decaffeination_method,undefined);
 }
});

test('historical, conditional and generic green-processing claims are not selected treatment',()=>{
 const examples=[
  '<p>Previously Wet Process & SugarCane Ethyl Acetate Decaffeination</p>',
  '<p>For example Wet Process & SugarCane Ethyl Acetate Decaffeination</p>',
  '<p>Honey Sweet, Vibrant, Easy-Drinking</p>',
  '<p>Wet Process</p>'
 ];
 for(const html of examples){
  const r=parse('Sugarcane Decaf',html);
  assert.equal(r.fields.decaffeination_method,undefined,html);
 }
});

test('two incompatible equally current selected decaffeination methods fail closed',()=>{
 const other=selected.replace('SugarCane Ethyl Acetate','Swiss Water');
 const r=parse('Sugarcane Decaf',selected+other);
 assert.equal(r.fields.decaffeination_method,undefined);
});
