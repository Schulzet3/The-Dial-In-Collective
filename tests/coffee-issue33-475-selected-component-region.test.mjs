import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

// Based on original603 #475 exact current official H1 and product copy,
// SHA256 b5477c9978f90ba57ef463ffc28de5071d7ccfab191325a29fa5d0697a6cb998
// from merged public probe 41827201863. This fixture contains NO catalog data.
const name='Anthrax - Cursum Perficio';
const url='https://roaster.example/products/anthrax-cursum-perficio';
const current='We paired the Catuai with coffee from the Pacas Family in El Salvador, a blend of Bourbon and Pacas beans that come from several farms in the Santa Ana region, which go through a washed process at the Cafe Tuxpal mill.';
const labels='<p>Country: Nicaragua</p><p>Department: Nueva Segovia</p><p>Cultivar: Catuai</p><p>Process: Washed</p>'+
 '<p>Country: El Salvador</p><p>Mill: Cafe Tuxpal</p><p>Cultivar: Bourbon & Pacas</p><p>Process: Washed</p>';
const markup=(prose,secondCountry='El Salvador',elsewhere='')=>'<html><main><h1>'+name+'</h1><p>The base of Cursum Perficio is a washed Catuai coffee from Nicaragua.</p>'+
 '<p>'+prose+'</p>'+labels.replace('Country: El Salvador','Country: '+secondCountry)+
 '<p>Tastes like Nutella, graham cracker, and lemon tea</p>'+elsewhere+'</main></html>';
const parse=(prose,secondCountry='El Salvador',elsewhere='')=>extractPublicCoffeeFacts(markup(prose,secondCountry,elsewhere),{source_url:url});

test('two-country selected current labeled blend refines only the proven second component farm region',()=>{
 const html=markup(current);
 const blend=extractCoffeeBlendEvidence(html,{name});
 assert.equal(blend?.origin,'Nueva Segovia, Nicaragua; Santa Ana, El Salvador');
 const p=parse(current);
 assert.equal(p.ok,true);
 assert.equal(p.fields.origin,'Nueva Segovia, Nicaragua; Santa Ana, El Salvador');
 assert.equal(p.fields.producer,undefined,'one named component family does not certify whole-blend producer');
 assert.equal(p.fields.release_label,undefined);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('Santa Ana'));
});

test('a music album announcement and whole-bean stock text are not coffee release labels',()=>{
 const p=parse(current,'El Salvador','<h3>CURSUM PERFICIO OUT EVERYWHERE SEPTEMBER 18th!</h3>'+
  '<p>To celebrate the impending release of Anthrax\'s new album, Cursum Perficio, this blend rocks.</p>');
 assert.equal(p.fields.release_label,undefined);
});

test('different currently labeled component country blocks unsupported farm-region reassignment',()=>{
 const p=parse(current,'Honduras');
 assert.ok(!String(p.fields.origin||'').includes('Santa Ana'));
});

test('history, speculative geography and catalog copy cannot donate component region',()=>{
 for(const bad of [
  'Previously, '+current,
  'Hypothetically, '+current,
  'Our other coffee is paired with coffee from the Pacas Family in El Salvador, a blend of Bourbon and Pacas beans that come from several farms in the Santa Ana region.'
 ]){
  const p=parse(bad);
  assert.ok(!String(p.fields.origin||'').includes('Santa Ana'),bad);
 }
});

test('a nearby mill in a named region does not establish that the beans grew there',()=>{
 const p=parse('We paired the Catuai with coffee from the Pacas Family in El Salvador, a blend of Bourbon and Pacas beans that are processed at the Cafe Tuxpal mill in the Santa Ana region.');
 assert.ok(!String(p.fields.origin||'').includes('Santa Ana'));
});
