import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://roaster.examplecoffee.com/products/current-coffee';
const parse=(name,body)=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});

test('current-product compact geography plus processing and altitude keeps entire literal origin',()=>{
 const source='San Agustín, Huila, Colombia Washed Gesha // 1600 - 1989 masl';
 const result=parse('Los Magnificos ~ Gesha // Colombia','<p>Reminds us of - Prickly Pear & Guava Jelly</p><p>'+source+'</p>');
 assert.equal(result.fields.origin,'San Agustín, Huila, Colombia');
 assert.ok(!result.conflicts?.includes('origin'));
 assert.ok(result.source_facts?.some(x=>String(x.value).includes(source)));
});
test('compact source row cannot smuggle another country across explicit product identity',()=>{
 const result=parse('Current Kenya Coffee','<p>Nyeri, Central Highlands, Colombia Washed Gesha // 1600 - 1989 masl</p>');
 assert.notEqual(result.fields.origin,'Nyeri, Central Highlands, Colombia');
});
test('history, related product and incomplete spec row cannot contribute origin',()=>{
 const fragments=[
  '<p>Last year: San Agustín, Huila, Colombia Washed Gesha // 1600 - 1989 masl</p>',
  '<p>San Agustín, Huila, Colombia Washed Gesha // unknown masl</p>',
  '<p>San Agustín, Huila, Colombia Washed Gesha // 1600 - 1989</p>',
  '<section class="related-products"><p>San Agustín, Huila, Colombia Washed Gesha // 1600 - 1989 masl</p></section>'
 ];
 for(const fragment of fragments){
  const result=parse('Current Coffee','<p>Origin: Kenya</p>'+fragment);
  assert.notEqual(result.fields.origin,'San Agustín, Huila, Colombia',fragment);
 }
});
