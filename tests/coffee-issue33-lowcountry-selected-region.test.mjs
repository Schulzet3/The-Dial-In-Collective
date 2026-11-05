// Issue33 original603 #206: actual selected region, no SEO or dictionary inference.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeGeographyTuples,extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Peru HB';
const direct='Peru comes to us from central Peru, the Chanchamayo region and is produced in small farms.';
const html=(title,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+title+'</h1><div itemprop="description">'+body+'</div></article></main></body></html>';
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const parse=(title,body)=>extractPublicCoffeeFacts(html(title,body),{source_url:'https://lowcountrycoffeeroasters.com/products/peru-hb-1'});
test('selected original603 Peru HB printed growing region refines compatible country label',()=>{
 const body='<p>'+direct+'</p><p>Location: Peru</p><p>Processing: Fully Washed</p><p>Roast: Medium</p>';
 const page=html(name,body);
 assert.deepEqual(extractCoffeeGeographyTuples(page,{clean,name,includeCurrentLocality:true}),['Chanchamayo, Peru']);
 assert.ok(extractCoffeeIdentityEvidence(page,{name,fields:{origin:'Peru'},clean}).facts.some(f=>f.label==='Origin'&&f.value==='Chanchamayo, Peru'&&f.quote.includes(direct)));
 const r=parse(name,body);
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Chanchamayo, Peru');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.roast_level,'Medium');
 assert.ok(!r.conflicts?.includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(r),/Chanchamayo, Peru/);
});
test('same-country selected Ecuador source works without any roaster hardcode',()=>{
 const title='Ecuador Gold';
 const sentence='Ecuador comes to us from northern Ecuador, the Imbabura region and is grown by a collective.';
 assert.deepEqual(extractCoffeeGeographyTuples(html(title,'<p>'+sentence+'</p>'),{clean,name:title,includeCurrentLocality:true}),['Imbabura, Ecuador']);
});
test('unrelated country and mixed current source countries cannot donate region',()=>{
 for(const [title,sentence] of [
  ['Colombia HB',direct],
  [name,'Peru comes to us from central Colombia, the Chanchamayo region and is produced in small farms.'],
  [name,'Colombia comes to us from central Colombia, the Chanchamayo region and is produced in small farms.']
 ]){
  assert.deepEqual(extractCoffeeGeographyTuples(html(title,'<p>'+sentence+'</p>'),{clean,name:title,includeCurrentLocality:true}),[]);
  assert.notEqual(parse(title,'<p>'+sentence+'</p>').fields.origin,'Chanchamayo, Peru');
 }
});
test('previous/former product history cannot supply current selected region',()=>{
 for(const sentence of [
  'Peru previously came to us from central Peru, the Chanchamayo region and was produced in small farms.',
  'Peru comes to us from central Peru, the Chanchamayo region and was produced in small farms.',
  'Peru comes to us from central Peru, the Chanchamayo region. Other coffees are produced here.'
 ])assert.deepEqual(extractCoffeeGeographyTuples(html(name,'<p>'+sentence+'</p>'),{clean,name,includeCurrentLocality:true}),[]);
});
test('educational and related-product sections never donate selected region',()=>{
 for(const heading of ['Related Products','What is origin?','Other Coffees'])
  assert.deepEqual(extractCoffeeGeographyTuples(html(name,'<section><h2>'+heading+'</h2><p>'+direct+'</p></section>'),{clean,name,includeCurrentLocality:true}),[],heading);
});
test('cultivars and flavor/merchandising vocabulary are not regions',()=>{
 for(const region of ['Caturra','Pumpkin Spice','Caramel','Coffee','Chocolate']){
  const sentence='Peru comes to us from central Peru, the '+region+' region and is produced in small farms.';
  assert.deepEqual(extractCoffeeGeographyTuples(html(name,'<p>'+sentence+'</p>'),{clean,name,includeCurrentLocality:true}),[],region);
 }
});
test('incompatible explicit selected origin must not be overwritten',()=>{
 const r=parse(name,'<p>'+direct+'</p><p>Origin: Huila, Colombia</p>');
 assert.notEqual(r.fields.origin,'Chanchamayo, Peru');
 assert.ok(r.conflicts?.includes('origin')||r.fields.origin==='Huila, Colombia');
});
