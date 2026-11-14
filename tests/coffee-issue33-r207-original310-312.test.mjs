import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const root='https://shop.iconikcoffee.com/products/';
const cases=[
 {n:310,name:'Finca Costa Rica',handle:'finca-costa-rica',notes:'Cherry, prickly pear, buttery',
  details:'Huila, Colombia. 2005m. Yeast Inoculated Washed. Regional Varieties. Finca Costa Rica is located in Santa María, Huila, Colombia and is owned and run by Faver Ninco and his family. This is a Yeast Inoculated Washed coffee.'},
 {n:311,name:'Volcán Atitlán Guatemala',handle:'washed-guatemala-finca-san-jeronimo',notes:'Black cherry, walnut, nougat',
  details:'Bressani Family, San Jerónimo Guatemala. 1300m. Washed. Catuaí. Finca San Jerónimo Miramar sits on a volcano in Atitlán. Giorgio is a third-generation coffee producer.'},
 {n:312,name:'Bressani Family Washed Sidra',handle:'washed-sidra-giorgio-bressani',notes:'Chamomile, pear, juicy',
  details:'Bressani Family, San Jerónimo Guatemala. 1550m. Washed. Sidra. Sidra is an Ecuadorian variety, a cross between Bourbon and Typica. They grow it toward the top of the Bressani Family farm near Lake Atitlán in Guatemala.'}
];
function parse(c,{seo='Unrelated Korean dark decaf coffee',aside='',body=null}={}){
 const url=root+c.handle;
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url,brand:{'@type':'Brand',name:'ICONIK'}};
 const product='<main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+c.notes+'</p><p>'+(body||c.details)+'</p></div></article></main>';
 return extractPublicCoffeeFacts('<!doctype html><html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body>'+product+aside+'</body></html>',{source_url:url});
}
for(const c of cases){
 test('original #'+c.n+' retains selected exact ICONIK identity without invented recipes',()=>{
  const p=parse(c);
  assert.equal(p.ok,true,JSON.stringify(p).slice(0,400));
  assert.equal(p.fields?.name,c.name);
  assert.equal(p.fields?.decaffeination_method,undefined);
  assert.equal(p.fields?.espresso_recipe,undefined);
  if(c.n===310)assert.doesNotMatch(String(p.fields?.origin||''),/^(?:Costa Rica|Central America)$/i,'Farm named Costa Rica is geographically in Colombia');
  if(c.n===312)assert.doesNotMatch(String(p.fields?.origin||''),/Ecuador/i,'Sidra variety history cannot reassign current Guatemala farm');
 });
 test('original #'+c.n+' excludes unrelated sibling, menu SEO and review sensations/process/producer',()=>{
  const p=parse(c,{aside:'<aside class="related-products"><h2>Other Coffee</h2><p>Blueberry mango. Producer: Other Family. Swiss Water Decaf. Natural coffee from Kenya. Espresso 18g in, 36g out.</p></aside><section class="reviews"><p>Love that blueberry!</p></section>'});
  assert.equal(p.ok,true);
  assert.equal(p.fields?.name,c.name);
  assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry|mango/i);
  assert.doesNotMatch(String(p.fields?.producer||''),/Other Family/i);
  assert.ok(!p.fields?.decaffeination_method && !p.fields?.espresso_recipe);
 });
}
test('three distinct exact original product URLs cannot inherit previous coffee identity or unrelated siblings',()=>{
 for(const c of cases){
  const p=parse(c,{aside:'<div class="recommendations"><h1>Finca Kenya Decaf</h1><p>Dark roast from Uganda; honeysuckle, kiwi.</p></div>'});
  assert.equal(p.ok,true);
  assert.equal(p.fields?.name,c.name);
  assert.doesNotMatch(String(p.fields?.tasting_notes||''),/kiwi|honeysuckle/i);
 }
});
