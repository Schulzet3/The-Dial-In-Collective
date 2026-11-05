// Issue33 original603 #46: current selected barrel-aging green-bean origin.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedBarrelGreenBeanRegion} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='BULL RUN BARREL AGED COFFEE - RYE-FINISHED OAK BARREL';
const url='https://cascadiaroasters.com/products/bourbon-barrel-aged';
const preceding='We’ve taken a Bull Run Rye oak barrel and used it to age our green coffee for a minimum of a week.';
const current='This infuses the essence of the aromas of the rye to transform an Ethiopian Sidamo into a complex melange of flavors for a truly special treat.';
const make=(title=name,body=preceding+' '+current,region='Ethiopia')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+title+'</h1><section class="product-description"><p>Region: '+region+'</p><p>Process: Natural, Washed</p><p>Roast: Light Roast</p><p>Tasting Notes: Bread and caramel notes and aromas of rye and oak.</p><p>'+body+'</p></section></article></main></body></html>';
const blocks=(title=name,body=preceding+' '+current,section='Selected product')=>[{tag:'h1',text:title},{tag:'p',text:body,section}];
test('direct selected current green-bean barrel description refines country-only origin',()=>{
 const p=extractPublicCoffeeFacts(make(),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,name);
 assert.equal(p.fields.origin,'Sidamo, Ethiopia',JSON.stringify(p));
 assert.equal(p.fields.roast_level,'Light');
 assert.equal(p.fields.process,'Other/Unknown');
 assert.match(p.fields.tasting_notes,/Bread and caramel/);
 assert.match(coffeeUrlPreviewMarkup(p),/Sidamo, Ethiopia/);
});
test('pure helper requires literal current adjacent preparation and selected H1',()=>{
 const result=selectedBarrelGreenBeanRegion(blocks(),{name,origin:'Ethiopia'});
 assert.equal(result?.value,'Sidamo, Ethiopia');
 assert.match(result.quote,/age our green coffee/);
 for(const body of [current,preceding,preceding+' Other flavors might be found. '+current,
  'We use our barrel to roast coffee. '+current,
  preceding+' This infuses the essence to transform a Colombian Sidamo into flavors.'])
  assert.equal(selectedBarrelGreenBeanRegion(blocks(name,body),{name,origin:'Ethiopia'}),null,body);
});
test('does not infer from other products, wrong title, unrelated sections or country',()=>{
 assert.equal(selectedBarrelGreenBeanRegion(blocks('BULL RUN BARREL AGED COFFEE - OTHER LOT'),{name,origin:'Ethiopia'}),null);
 assert.equal(selectedBarrelGreenBeanRegion(blocks(name,preceding+' '+current,'Related coffees'),{name,origin:'Ethiopia'}),null);
 assert.equal(selectedBarrelGreenBeanRegion(blocks(),{name:'Ordinary Ethiopia',origin:'Ethiopia'}),null);
 assert.equal(selectedBarrelGreenBeanRegion(blocks(),{name,origin:'Kenya'}),null);
 assert.equal(selectedBarrelGreenBeanRegion(blocks(),{name,origin:'Kaffa, Ethiopia'}),null);
 assert.equal(selectedBarrelGreenBeanRegion([{tag:'p',text:preceding+' '+current}],{name,origin:'Ethiopia'}),null);
});
test('historical/competing lot and flavor words never become growing regions',()=>{
 const conflict=preceding+' '+current+' '+preceding+' This infuses the essence to transform a Kenyan Kericho into complex flavors.';
 for(const body of [
  'Last year '+preceding+' '+current,
  preceding+' '+current.replace('Ethiopian Sidamo','Ethiopian Chocolate'),
  preceding+' '+current.replace('Ethiopian Sidamo','Ethiopian Natural'),
  preceding+' '+current.replace('Ethiopian Sidamo','Ethiopian Sidamo').replace('This infuses','Our previous lot infuses'),
  conflict
 ])assert.equal(selectedBarrelGreenBeanRegion(blocks(name,body),{name,origin:'Ethiopia'}),null,body);
});
test('control blend source stays multi-origin and unrelated medium coffee remains unchanged',()=>{
 const blend='<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>Busca La Paz</h1><p>Roast: Light/Medium</p><p>Notes: Bright, Earthy, Stone Fruits</p><p>Region: Papua New Guinea, Nebilyer Valley, México, Chiapas, and Oaxaca</p></article></main></body></html>';
 const p=extractPublicCoffeeFacts(blend,{source_url:'https://caffeinacoffee.com/products/busca-la-paz-blend'});
 assert.notEqual(p.fields?.origin,'Sidamo, Ethiopia');
 assert.equal(selectedBarrelGreenBeanRegion(blocks('Busca La Paz'),{name:'Busca La Paz',origin:'Ethiopia'}),null);
});
