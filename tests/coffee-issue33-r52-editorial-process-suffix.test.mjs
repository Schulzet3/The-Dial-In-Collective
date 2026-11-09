// Issue #33 R52 real selected #586 section headline. Generic editorial process suffix guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSemanticCoffeeSpecs} from '../src/server/coffee-semantic-specs.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const clean=(raw,max=300)=>String(raw||'').replace(/<[^<>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const suffixFact=heading=>extractSemanticCoffeeSpecs(
 '<main><h1>Chosen Coffee</h1><article><h3>'+heading+'</h3></article></main>',{clean}).facts.filter(f=>f.kind==='process');
test('R52 editorial section titles never masquerade as a published processing method',()=>{
 for(const text of ['An Extraordinary Process','Our Unique Process','The Special Processing Method','This Beautiful Process']){
  assert.deepEqual(suffixFact(text),[],text);
 }
});
test('R52 explicit merchant processing suffix methods still survive editorial guard',()=>{
 for(const heading of ['Honey Process','Natural Process','Wet Process','The Black Honey Process']){
  assert.ok(suffixFact(heading).length>0,heading);
 }
});
test('R52 current selected Dedication section heading stays untyped while real opposite process labels remain',()=>{
 const html='<html><head><meta property="og:type" content="product"><meta property="og:title" content="Dedication- Costa Rica"></head>'+
 '<body><main><h1>Dedication- Costa Rica</h1><section>'+
 '<h3>An Extraordinary Process</h3>'+
 '<p>Dedication is produced using Alma Negra, a unique natural process developed at Las Lajas.</p>'+
 '<h3>Coffee Details</h3><p>Process: Alma Negra Natural</p>'+
 '<h3>Process</h3><p>Honey Processed</p></section></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:'https://www.unlockedcoffee.com/products/dedication-costa-rica'});
 assert.equal(result.ok,true);
 assert.ok(!(result.source_facts||[]).some(f=>f.field==='process'&&f.value==='An Extraordinary'),
  'editorial headline is preserved as text but must not become process evidence');
});
