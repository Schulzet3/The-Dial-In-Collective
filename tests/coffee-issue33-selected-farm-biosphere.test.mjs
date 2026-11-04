// #33 original603 #188: present selected producer's farms, not old history or related coffees.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeGeographyTuples} from '../src/server/coffee-identity-evidence.mjs';

const name='42 Series- Ethiopia Dehab’s Diamond';
const direct='Dehab’s farms are in the buffer and core zones of the UNESCO Kaffa Forest biosphere, a large area (540,000 hectares) of protected forest.';
const html=(title,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+title+'</h1><div itemprop="description">'+body+'</div></article></main></body></html>';
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const parse=(title,body)=>extractPublicCoffeeFacts(html(title,body),{source_url:'https://larryscoffee.com/products/coffee-111'});

test('current exact selected named producer farms in literal UNESCO forest refine origin country',()=>{
 const page=html(name,'<p>'+direct+'</p><p>Origin: Ethiopia</p>');
 assert.deepEqual(extractCoffeeGeographyTuples(page,{clean,name,includeCurrentLocality:true}),['Kaffa Forest, Ethiopia']);
 const r=parse(name,'<p>'+direct+'</p><p>Origin: Ethiopia</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Kaffa Forest, Ethiopia');
 assert.ok(!r.conflicts?.includes('origin'));
});

test('same generic selected-farm rule works without source roaster or place exceptions',()=>{
 const title='Ethiopia Lena’s Diamond';
 const sentence='Lena’s farms are in the buffer and core zones of the UNESCO Oromo Highlands biosphere, a protected forest.';
 assert.deepEqual(extractCoffeeGeographyTuples(html(title,'<p>'+sentence+'</p>'),{clean,name:title,includeCurrentLocality:true}),['Oromo Highlands, Ethiopia']);
});

test('other producer, missing selected country, and wrong country cannot donate forest',()=>{
 for(const title of ['Ethiopia Another Coffee','Lena’s Diamond','Kenya Lena’s Diamond']){
  const sentence='Lena’s farms are in the buffer and core zones of the UNESCO Oromo Highlands biosphere.';
  assert.deepEqual(extractCoffeeGeographyTuples(html(title,'<p>'+sentence+'</p>'),{clean,name:title,includeCurrentLocality:true}),[],title);
 }
});

test('former farms, prior lots, and nearby forests are never a current origin',()=>{
 const examples=[
  direct.replace('farms are','farms were'),
  direct.replace('farms are','farms formerly are'),
  direct.replace('are in','are near'),
  direct.replace('are in','were previously in'),
  direct.replace('a large area','another coffee was previously grown in a large area')
 ];
 for(const sentence of examples)
  assert.deepEqual(extractCoffeeGeographyTuples(html(name,'<p>'+sentence+'</p>'),{clean,name,includeCurrentLocality:true}),[],sentence);
});

test('related products and educational sections cannot donate biosphere growing origin',()=>{
 for(const heading of ['Related Products','What is origin?','Other Coffees']){
  const page=html(name,'<section><h2>'+heading+'</h2><p>'+direct+'</p></section>');
  assert.deepEqual(extractCoffeeGeographyTuples(page,{clean,name,includeCurrentLocality:true}),[],heading);
 }
});

test('incompatible selected explicit other-country origin is not silently overwritten',()=>{
 const r=parse(name,'<p>'+direct+'</p><p>Origin: Nyeri, Kenya</p>');
 assert.equal(r.ok,true);
 assert.notEqual(r.fields.origin,'Kaffa Forest, Ethiopia');
 assert.ok(r.conflicts?.includes('origin')||r.fields.origin==='Nyeri, Kenya');
});
