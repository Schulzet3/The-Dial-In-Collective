// Issue33 original603 #59: a selected title's flavor and coffee cultivar are NOT geography.
// Exact selected-current product evidence at original603 source run41056543756, case59.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const selectedUrl='https://coffeeroasterlnk.com/products/nicaragua-pumpkin-spice-pacamara';
const page=(name,lines)=>'<html><head><title>'+name+'</title></head><body><main><article class="product"><h1>'+name+'</h1>'+lines.map(s=>'<p>'+s+'</p>').join('')+'</article></main></body></html>';
const parse=(name,lines)=>extractPublicCoffeeFacts(page(name,lines),{source_url:selectedUrl});

test('selected Nicaragua with pumpkin-spice tasting and Pacamara cultivar never invents a regional place',()=>{
 const name='Nicaragua - Pumpkin Spice- Pacamara';
 const result=parse(name,[name,'A naturally sweet Nicaraguan Pacamara from Gold Mountain, with pumpkin pie and warm cinnamon tasting notes.']);
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Nicaragua');
 assert.doesNotMatch(result.fields.origin||'',/Pumpkin|Pacamara|Spice/i);
 assert.doesNotMatch(coffeeUrlPreviewMarkup(result),/Pumpkin Spice- Pacamara, Nicaragua/i);
});

test('the same coffee name repeated in a compact block is not a named Nicaragua village',()=>{
 const name='Nicaragua - Pumpkin Spice- Pacamara';
 const result=parse(name,[name,name,'Gold Mountain Pacamara notes of pumpkin pie and warm cinnamon.']);
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Nicaragua');
});

test('other explicit cultivars in country-first titles are not fabricated origin localities',()=>{
 for(const variety of ['Pacamara','Geisha','Bourbon','Caturra']){
  const name='Nicaragua - '+variety;
  const result=parse(name,[name,'A selected Nicaraguan coffee of the '+variety+' variety.']);
  assert.equal(result.ok,true,variety);
  assert.equal(result.fields.origin,'Nicaragua',variety);
 }
});

test('true unambiguous country-first geographical place remains eligible',()=>{
 const result=parse('Nicaragua - Jinotega',['Nicaragua - Jinotega','Coffee grown in Nicaragua at Jinotega.']);
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Jinotega, Nicaragua');
});

test('an explicit selected labelled farm geography still overrides a cultivar-bearing name',()=>{
 const result=parse('Nicaragua - Pacamara',['Nicaragua - Pacamara','Origin: Jinotega, Nicaragua','Variety: Pacamara']);
 assert.equal(result.ok,true);
 assert.match(result.fields.origin||'',/Jinotega.*Nicaragua/i);
});

test('a completely unspecified country must not be reverse-inferred from a cultivar alone',()=>{
 const result=parse('Pumpkin Spice Pacamara',['Pumpkin Spice Pacamara','Tasting notes: pumpkin pie and warm cinnamon.']);
 assert.equal(result.ok,true);
 assert.notEqual(result.fields.origin,'Pumpkin Spice Pacamara');
});
