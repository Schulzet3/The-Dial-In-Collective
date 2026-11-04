// Original603 #13: verified selected association municipality, not generic group history.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeGeographyTuples} from '../src/server/coffee-identity-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Colombia Fair Trade Organic FUDAM LA Union';
const current='This group of smallholders lives in and around the small municipality of La Unión in Nariño, where the terrain differs greatly from in other coffee-growing areas like Cauca: Instead of walking up from the town to the farms, as elsewhere, here the towns are at such high elevation that the farms are typically lower elevation, surrounded by high peaks and rough road.';
const page=(title,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+title+'</h1><div itemprop="description">'+body+'</div></article></main></body></html>';
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const parse=(title,body)=>extractPublicCoffeeFacts(page(title,body),{source_url:'https://beanstockcoffee.com/collections/medium-roasts/products/colombian-supremo-organic'});
test('#13 selected H1 and current farming municipality refine country, preserving process blank',()=>{
 const body='<p>(FUDAM) is a 300-member association of certified growers.</p><p>'+current+'</p><p>Medium Roast.</p>';
 assert.deepEqual(extractCoffeeGeographyTuples(page(name,body),{clean,name,includeCurrentLocality:true}),['La Unión, Nariño, Colombia']);
 const r=parse(name,body);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'La Unión, Nariño, Colombia',JSON.stringify(r));
 assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.fields.process??null,null);
 assert.ok(!r.conflicts?.includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(r),/La Unión, Nariño, Colombia/);
});
test('source rule is generic for separately selected Ecuador grower association',()=>{
 const sentence='This group of farmers lives in and around the municipality of Santa Elena in Loja, where the farms are lower elevation.';
 assert.equal(parse('Ecuador ALMA Santa Elena','<p>'+sentence+'</p>').fields.origin,'Santa Elena, Loja, Ecuador');
});
test('other coffee, historic town, office or generic locale cannot donate origin',()=>{
 for(const [title,line] of [
  ['Colombia Another Lot',current],
  [name,'This group of smallholders lives in and around the municipality of La Unión in Nariño, a tourist town.'],
  [name,'The group has its headquarters in the municipality of La Unión in Nariño, where office workers commute.'],
  [name,'This group of smallholders formerly lived in and around the municipality of La Unión in Nariño, where farms once operated.'],
  [name,'This group of smallholders lives in and around the municipality of Caturra in Nariño, where farms are nearby.'],
  [name,'This group of smallholders lives in and around the municipality of La Unión in Colombia, where farms are nearby.']
 ])assert.notEqual(parse(title,'<p>'+line+'</p>').fields.origin,'La Unión, Nariño, Colombia',title+' '+line);
});
test('related cards, glossary and conflicting explicit origin retain caution',()=>{
 for(const label of ['Related products','What is origin?','Other Coffees'])
  assert.notEqual(parse(name,'<section><h2>'+label+'</h2><p>'+current+'</p></section>').fields.origin,'La Unión, Nariño, Colombia',label);
 const contradictory=parse(name,'<p>Origin: Huila, Colombia</p><p>'+current+'</p>');
 assert.notEqual(contradictory.fields.origin,'La Unión, Nariño, Colombia',JSON.stringify(contradictory));
});
