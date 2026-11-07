import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentFarmCountryLocality as select} from '../src/server/coffee-selected-farm-country-locality.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Single Origin: Nicaragua | Honey Arabica | Organic Coffee';
const origin='Nicaragua',producer='Byron Corrales',process='Honey';
const location='Los Pinos is located in Aranjuez, Mataglapa next to the Arenal reserve. It’s a group of family farms totaling 55 hectares of coffee run by Byron Corrales, a committed grower.';
const method='The Honey Process is one of many processes used by Finca Los Pinos. During this process coffee cherries are pulped then dried.';
const blocks=(loc=location,proc=method)=>[{tag:'h1',text:name},
 {tag:'p',text:loc,section:'Byron Corrales, Finca Los Pinos'},
 {tag:'p',text:proc,section:'Byron Corrales, Finca Los Pinos'}];
const args={name,origin,producer,process};
const page=(loc=location,proc=method)=>'<html><head><meta property="og:type" content="product"></head><body><main class="product"><article><h1>'+name+
 '</h1><div class="product__description"><h5>Byron Corrales, Finca Los Pinos</h5><p>Origin: Nicaragua</p><p>Producer: Byron Corrales</p><p>Process: Honey</p><p>'+loc+'</p><p>'+proc+'</p><p>This coffee is sweet and smooth with subtle fruit notes.</p></div></article></main></body></html>';
test('literal selected farm, owner and selected method can safely refine country to town',()=>{
 const r=select({...args,blocks:blocks()});
 assert.equal(r?.value,'Aranjuez, Nicaragua',JSON.stringify(r));
 assert.match(r.quote,/Aranjuez, Mataglapa/);assert.match(r.quote,/Honey Process/);
});
test('real Add Coffee pipeline preserves chosen identity and source review after town refinement',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:'https://riseupcoffee.com/products/single-origin-nicaragua-honey-arabica-coffee'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);assert.equal(r.fields.origin,'Aranjuez, Nicaragua',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Honey');assert.equal(r.fields.producer,producer);
 assert.ok(!r.conflicts?.includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(r),/Aranjuez, Nicaragua/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:'https://riseupcoffee.com/products/single-origin-nicaragua-honey-arabica-coffee'}));
 assert.ok(r.source_facts?.some(f=>f.field==='origin'&&/Aranjuez, Mataglapa/.test(f.value)));
});
test('other selected coffee, conflicting country, missing producer and process are not evidence',()=>{
 for(const override of [{name:'Single Origin: Guatemala | Honey Arabica | Organic Coffee'},
  {origin:'Guatemala'},{origin:'Mataglapa, Nicaragua'},{producer:'Other Producer'},
  {process:'Natural'},{process:''}])
  assert.equal(select({...args,...override,blocks:blocks()}),null,JSON.stringify(override));
 assert.equal(select({...args,blocks:[...blocks(),{tag:'h1',text:'Other Coffee'}]}),null);
});
test('historical, mismatched, educational, related and competing farm-towns fail closed',()=>{
 for(const loc of ['Previously '+location,location.replace('group of family farms','processing plant'),
  location.replace('run by Byron Corrales','run by Other Producer')])
  assert.equal(select({...args,blocks:blocks(loc)}),null,loc);
 for(const p of ['The Natural Process is one of many processes used by Finca Los Pinos.',
  'The Honey Process is one of many processes used by Finca Another Farm.',
  'Previously '+method])
  assert.equal(select({...args,blocks:blocks(location,p)}),null,p);
 assert.equal(select({...args,blocks:blocks().map(b=>b.tag==='p'?{...b,educational:true}:b)}),null);
 assert.equal(select({...args,blocks:blocks().map(b=>b.tag==='p'?{...b,section:'Other Coffees'}:b)}),null);
 assert.equal(select({...args,blocks:[...blocks(),{tag:'p',text:location.replace('Aranjuez','Granada'),section:'Byron Corrales, Finca Los Pinos'}]}),null);
});
