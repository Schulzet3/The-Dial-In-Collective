import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const source='https://selected.example/products/red-bourbon-decaf';
function rows(html){
 return collectCoffeeSourceFacts('<main><h1>Selected Red Bourbon Decaf</h1>'+html+'</main>',{
  name:'Selected Red Bourbon Decaf',source_url:source
 });
}
test('selected post-harvest itinerary remains literal but untyped in Source Review',()=>{
 const facts=rows('<p>Process: Natural</p><h3>Processing Method</h3>'+
  '<p>1. Hand-harvested at peak ripeness</p><p>2. Sorted by size and density</p>'+
  '<p>3. Sterilized with ozonated water</p><p>4. 48-hour fermentation</p>');
 const step=facts.find(f=>f.label==='Processing Method'&&f.value==='1. Hand-harvested at peak ripeness');
 assert.ok(step,'retain exact selected first harvest operation');
 assert.equal(step.field,undefined,'harvest operation is not the green-processing method');
 assert.equal(step.source_url,source);
 assert.ok(facts.some(f=>f.field==='process'&&f.value==='Natural'),
  'independent selected Natural claim must remain typed');
 const preview=coffeeSourceReviewSnapshot({ok:true,source_url:source,
  fields:{name:'Selected Red Bourbon Decaf',process:'Natural'},source_facts:facts});
 assert.ok(preview.published_source_information.some(f=>
  f.label==='Processing Method'&&f.value===step.value&&!f.field));
 assert.equal(preview.field_suggestions.process,'Natural');
});
test('unnumbered selected direct processing labels remain typed',()=>{
 for(const [label,value] of [['Process','Natural'],['Processing Method','Washed'],['Processing','Honey']]){
  const facts=rows('<h3>'+label+'</h3><p>'+value+'</p>');
  assert.ok(facts.some(f=>f.label===label&&f.value===value&&f.field==='process'),
   label+': '+value);
 }
});
test('ordered operations and unrelated fields never masquerade as process',()=>{
 for(const first of ['1. Hand-harvested at peak ripeness','1) Washed','10. Sugarcane decaffeination']){
  const facts=rows('<h3>Processing Method</h3><p>'+first+'</p>');
  const step=facts.find(f=>f.label==='Processing Method'&&f.value===first);
  assert.ok(step,first);assert.equal(step.field,undefined,first);
  assert.ok(facts.some(f=>f.value.includes(first)),'keep literal evidence');
 }
 const other=rows('<p>Origin: 1. Colombia</p>');
 assert.ok(other.some(f=>f.label==='Origin'&&f.value==='1. Colombia'&&f.field==='origin'),
  'do not retype unrelated labels');
});
