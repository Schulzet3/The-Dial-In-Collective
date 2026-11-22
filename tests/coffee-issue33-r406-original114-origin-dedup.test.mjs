import test from 'node:test';
import assert from 'node:assert/strict';
import {withoutRepeatedCoffeeOriginSuffix} from '../src/server/coffee-fact-compatibility.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const clean=withoutRepeatedCoffeeOriginSuffix;
const url='https://elixrcoffee.com/products/wush-wush-ethiopia';

test('R406 exact selected Elixr named locality has country once in display',()=>{
 assert.equal(clean('Yirba Muda Ethiopia, Guji, Ethiopia'),'Yirba Muda, Guji, Ethiopia');
 assert.equal(clean('Santa Rosa Colombia, Huila, Colombia'),'Santa Rosa, Huila, Colombia');
 assert.equal(clean('North Eastern Brazil, Minas Gerais, Brazil'),'Minas Gerais, Brazil');
});
test('R406 current canonical parser formats selected explicit origin without rewriting source evidence',()=>{
 const literal='Yirba Muda Ethiopia, Guji, Ethiopia';
 const html='<main><article class="product"><h1>Wush Wush, Ethiopia</h1>'+
  '<p>Origin: '+literal+'</p><p>Process: Natural</p>'+
  '<p>We Taste: Cherry Cola / White Grape / Lime Zest</p></article></main>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.origin,'Yirba Muda, Guji, Ethiopia');
 assert.ok(parsed.source_facts?.some(f=>String(f.value||'').includes(literal)));
});
test('R406 no country or region invention, conflicting countries remain visible',()=>{
 for(const value of [
  'Yirba Muda Ethiopia, Guji, Kenya',
  'Yirba Muda Uganda, Guji, Ethiopia',
  'Yirba Muda Ethiopia, Kenya, Ethiopia',
  'Yirba Muda Ethiopia, Ethiopia, Ethiopia',
  'Yirba Muda Ethiopia, Guji, Ethiopia, Ethiopia',
  'Yirba Muda, Guji, Ethiopia',
  'Yirba Muda Ethiopia, Guji',
  'Yirba Ethiopia, Guji, Ethiopia',
  'North Eastern Ethiopia, Guji, Ethiopia',
  'Coffee Blend Ethiopia, Guji, Ethiopia',
  'Yirba Muda Ethiopia, Natural Process, Ethiopia',
  'Yirba Kenya Ethiopia, Guji, Ethiopia'
 ])assert.equal(clean(value),value,value);
});
test('R406 canonical conflicts remain blank, cannot normalize away a source disagreement',()=>{
 const html='<main><h1>Wush Wush, Ethiopia</h1>'+
  '<p>Origin: Yirba Muda Ethiopia, Guji, Ethiopia</p>'+
  '<p>Country: Kenya</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));
});
