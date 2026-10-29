// Issue #33: exact selected official-product source facts must reach Add Coffee
// without promoting marketing labels or anonymous supplier descriptions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.example/products/selected';
function parse(name,body){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+url+'"></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,name);
 return result;
}
for(const [name,nickname,country] of [
 ['Costa Rica Perla Negra Peaberry','The Rare Pearl (Costa Rica)','Costa Rica'],
 ['Kenya AA: The Crown Jewel (Heritage SL Varietals)','The Crown Jewel (Kenya)','Kenya']
]){
 for(const reverse of [false,true]){
  test('direct Country wins over nickname in both orders: '+name+' '+reverse,()=>{
   const direct='<p>Origin: '+country+'</p>',slogan='<p>Origin: '+nickname+'</p>';
   const result=parse(name,reverse?slogan+direct:direct+slogan);
   assert.equal(result.fields.origin,country);
   assert.ok(!result.conflicts?.includes('origin'));
   assert.ok(coffeeUrlPreviewMarkup(result).includes(country));
   assert.ok(result.source_facts?.some(f=>String(f.value||'').includes(nickname)));
  });
 }
}
test('true parenthetical region and named locality are not reduced to country',()=>{
 for(const [value,country] of [
  ['The Great Rift Valley (Kenya)','Kenya'],
  ['The Highlands (Ethiopia)','Ethiopia'],
  ['Nyeri (Kenya)','Kenya']
 ]){
  const result=parse('Current Coffee','<p>Origin: '+value+'</p>');
  assert.notEqual(result.fields.origin,country);
 }
});
test('contradictory printed countries still require user review',()=>{
 const result=parse('Current Coffee','<p>Country: Kenya</p>'+
  '<p>Origin: The Rare Pearl (Costa Rica)</p>');
 assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));
});
test('unspecified marketing region is not canonical coffee origin',()=>{
 const text='Premium Central American coffee regions';
 const result=parse('Per My Last Email (Decaf)',
  '<h3>Origin Spotlight: Central America</h3><p>Region: '+text+'</p>');
 assert.equal(result.fields.origin,undefined);
 assert.ok(!result.conflicts?.includes('origin'));
 assert.ok(result.source_facts?.some(f=>String(f.value||'').includes(text)));
});
test('real selected Region and Country combine without loss',()=>{
 const result=parse('Current Coffee','<p>Region: Huila</p><p>Country: Colombia</p>');
 assert.equal(result.fields.origin,'Huila, Colombia');
});
test('anonymous family business does not fabricate a producer',()=>{
 const text='family business with three generations of coffee growing and exporting experience';
 const result=parse('Organic Ethiopian Gigesa','<p>Origin: Ethiopia</p><p>Producer: '+text+'</p>');
 assert.equal(result.fields.producer,undefined);
 assert.ok(result.source_facts?.some(f=>String(f.value||'').includes(text)));
});
test('named producer, cooperative and farm remain valid',()=>{
 for(const name of ['YKM Coffee','COMSA','Finca El Paraiso']){
  const result=parse('Current Coffee','<p>Producer: '+name+'</p>');
  assert.equal(result.fields.producer,name);
 }
});
test('municipality location uses growing country, not neighbor border country',()=>{
 const literal='Municipality of La Encarnación in the Ocotepeque department in Honduras near the border of El Salvador.';
 const result=parse('Decaf - Honduras COMSA','<p>Location: '+literal+'</p>'+
  '<p>Country: Honduras</p><p>Producer: COMSA</p>');
 assert.equal(result.fields.origin,'La Encarnación, Ocotepeque, Honduras');
 assert.equal(result.fields.producer,'COMSA');
 assert.ok(result.source_facts?.some(f=>String(f.value||'').includes(literal)));
 assert.ok(coffeeUrlPreviewMarkup(result).includes('La Encarnación'));
});
test('uncorroborated foreign border cannot be normalized into a location',()=>{
 const result=parse('Current Coffee',
  '<p>Location: Municipality of La Encarnación in the Ocotepeque department in Honduras near the border of Unknown Place.</p>');
 assert.notEqual(result.fields.origin,'La Encarnación, Ocotepeque, Honduras');
});
test('unrelated recommendation cannot donate marketing Origin',()=>{
 const result=parse('Current Coffee','<p>Origin: Colombia</p>'+
  '<section class="product-recommendations"><h3>Other Coffee</h3>'+
  '<p>Origin: The Crown Jewel (Kenya)</p></section>');
 assert.equal(result.fields.origin,'Colombia');
});
