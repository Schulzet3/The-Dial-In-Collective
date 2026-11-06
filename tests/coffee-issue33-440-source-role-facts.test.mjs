import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Original603 #440 selected current seller, not another coffee or frozen oracle.
// https://www.blackwhiteroasters.com/products/r-diego-horta-anaerobic-natural
const url='https://www.blackwhiteroasters.com/products/r-diego-horta-anaerobic-natural';
const h1='<main><h1>Diego Horta - Anaerobic Natural</h1>';
const panel='<p>Origin | Santa Maria, Huila, Colombia</p><p>Grower | Diego Horta</p>'+
 '<p>Processing | La Palma</p><p>Farm | El Rincon</p><p>Process | Anaerobic Natural</p>'+
 '<p>Variety | Caturra, Castillo</p><p>Elevation | 1700 MASL</p>';
const read=rows=>collectCoffeeSourceFacts(h1+rows+'</main>',{name:'Diego Horta - Anaerobic Natural',source_url:url});
const exact=(facts,label,value)=>facts.find(fact=>fact.label===label&&fact.value===value);

test('selected grower, farm, processor and green method stay separately labeled in source review',()=>{
 const facts=read(panel);
 assert.equal(exact(facts,'Grower','Diego Horta')?.field,'producer');
 assert.equal(exact(facts,'Farm','El Rincon')?.field,undefined);
 assert.equal(exact(facts,'Processing','La Palma')?.field,undefined);
 assert.equal(exact(facts,'Process','Anaerobic Natural')?.field,'process');
 for(const [label,value] of [['Grower','Diego Horta'],['Farm','El Rincon'],['Processing','La Palma'],['Process','Anaerobic Natural']]){
  assert.equal(exact(facts,label,value)?.value,value,label);
  assert.equal(exact(facts,label,value)?.source_url,url,label);
 }
});

test('canonical current grower and green method remain selected and unchanged',()=>{
 const parsed=extractPublicCoffeeFacts(h1+panel+'</main>',{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.producer,'Diego Horta');
 assert.equal(parsed.fields.process,'Anaerobic');
 assert.equal(exact(parsed.source_facts,'Farm','El Rincon')?.field,undefined);
 assert.equal(exact(parsed.source_facts,'Processing','La Palma')?.field,undefined);
});

test('unambiguous method and farm-only credit retain original field role',()=>{
 const facts=read('<p>Processing | Washed</p><p>Farm | Finca Luz</p>');
 assert.equal(exact(facts,'Processing','Washed')?.field,'process');
 assert.equal(exact(facts,'Farm','Finca Luz')?.field,'producer');
});

test('actually contradictory named processing categories are not hidden by actor safeguard',()=>{
 const facts=read('<p>Grower | Diego Horta</p><p>Process | Natural</p><p>Processing | Washed</p>');
 assert.equal(exact(facts,'Process','Natural')?.field,'process');
 assert.equal(exact(facts,'Processing','Washed')?.field,'process');
});

test('unrelated product cannot lend a new farm/processing actor to current canonical fields',()=>{
 const parsed=extractPublicCoffeeFacts(h1+'<p>Grower | Diego Horta</p><p>Process | Anaerobic Natural</p>'+
  '<section class="related-products"><p>Farm | Other Estate</p><p>Processing | Other Facility</p></section></main>',{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.producer,'Diego Horta');
 assert.equal(parsed.fields.process,'Anaerobic');
 assert.notEqual(exact(parsed.source_facts,'Farm','Other Estate')?.field,'producer');
 assert.notEqual(exact(parsed.source_facts,'Processing','Other Facility')?.field,'process');
});
