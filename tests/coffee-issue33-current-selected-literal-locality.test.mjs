// Issue33 original603 #100 and #214: direct selected prose, no inferred place.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCoffeeGeographyTuples,extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const source=(name,body)=>'<html><body><main><article class="product">'+
 '<h1>'+name+'</h1><div itemprop="description">'+body+'</div></article></main></body></html>';
const guatemala='Guatemala Honey Process - Organic Coffee Beans';
const mogiana='Single Origin Brazil Mogiana';
const from='<p>Single Origin Organic Guatemala coffee from Joyabaj, Quiché. Grown at altitudes between 1,300 and 2,000 meters.</p>';
const repeated='<p>Brazil Mogiana is produced in the renowned Mogiana growing region in Brazil. This bean comes from small farms.</p>';

test('exact selected Guatemala country-first town and district preserve three literal parts',()=>{
 const html=source(guatemala,from);
 assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name:guatemala,includeCurrentLocality:true}),
  ['Joyabaj, Quiché, Guatemala']);
 assert.ok(extractCoffeeIdentityEvidence(html,{name:guatemala,fields:{origin:'Guatemala'},clean}).facts
  .some(f=>f.label==='Origin'&&f.value==='Joyabaj, Quiché, Guatemala'));
 const result=extractPublicCoffeeFacts(html,{source_url:'https://disciplescoffee.com/products/guatemala'});
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Joyabaj, Quiché, Guatemala');
});

test('selected repeated Brazil Mogiana region names refine country without a gazetteer',()=>{
 const html=source(mogiana,repeated);
 assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name:mogiana,includeCurrentLocality:true}),
  ['Mogiana, Brazil']);
 assert.ok(extractCoffeeIdentityEvidence(html,{name:mogiana,fields:{origin:'Brazil'},clean}).facts
  .some(f=>f.label==='Origin'&&f.value==='Mogiana, Brazil'));
 const result=extractPublicCoffeeFacts(html,{source_url:'https://mauicoffeeroasters.com/products/brazil-mogiana-16oz'});
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Mogiana, Brazil');
});

test('different selected country never borrows Guatemala locality from stale product copy',()=>{
 const name='Colombia Honey Coffee';
 const html=source(name,from);
 assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name,includeCurrentLocality:true}),[]);
 assert.equal(extractCoffeeIdentityEvidence(html,{name,fields:{origin:'Colombia'},clean}).facts
  .some(f=>f.label==='Origin'&&/Joyabaj|Quiché/u.test(f.value)),false);
});

test('Mogiana repeated sentence cannot donate origin to another selected product',()=>{
 const name='Brazil Santos Classic';
 const html=source(name,repeated);
 assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name,includeCurrentLocality:true}),[]);
 assert.equal(extractCoffeeIdentityEvidence(html,{name,fields:{origin:'Brazil'},clean}).facts
  .some(f=>f.label==='Origin'&&/Mogiana/u.test(f.value)),false);
});

test('other coffee recommendation and educational sections never donate locality',()=>{
 for(const section of ['Other Coffees','What is origin?','Related Products']){
  const name=guatemala;
  const html=source(name,'<h2>'+section+'</h2>'+from);
  assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name,includeCurrentLocality:true}),[],section);
 }
});

test('unpublished locality and mismatched repeated region stay blank',()=>{
 const name=mogiana;
 for(const sentence of [
  'Brazil Mogiana is produced in the renowned Cerrado growing region in Brazil.',
  'Brazil Mogiana was previously produced in the renowned Mogiana growing region in Brazil.',
  'Brazil Mogiana is produced in the renowned Mogiana growing region in Colombia.'
 ]){
  const html=source(name,'<p>'+sentence+'</p>');
  assert.deepEqual(extractCoffeeGeographyTuples(html,{clean,name,includeCurrentLocality:true}),[],sentence);
 }
});
