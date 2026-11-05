// Original603 #292 selected H1 and same producer locality, never historical land.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountryProducerRegion as refine} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://seedscoffee.com/products/ethiopia-getachew-zekele';
const name='Ethiopia Guji Getachew';
const current='Before he became one of Guji’s most precise producers, Getachew Zekele was an accountant.';
const historical='After selling a property in Addis Ababa in 2008, he used the proceeds to buy land in Shakisso and began planting coffee.';
const selected=(story=current)=>[{tag:'h1',text:name},{tag:'p',text:story}];
function parse({title=name,story=current,related='',description='',extraTitle=''}={}){
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
  '<main><article class="product"><h1>'+title+'</h1>'+
  '<div class="product-description"><p>'+story+'</p><p>'+description+'</p></div></article></main>'+
  (extraTitle?'<h1>'+extraTitle+'</h1>':'')+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('same exact selected named producer corroborates Guji geography',()=>{
 const r=refine({name,country:'Ethiopia',origin:'Ethiopia',blocks:selected()});
 assert.equal(r?.value,'Guji, Ethiopia');
 assert.match(r.quote,/Guji.*Getachew/);
});
test('actual parser and Add Coffee preview use current selected region, not historical Shakisso',()=>{
 const r=parse({story:current+' '+historical,description:'Tastes Like: Citrus, Black Tea, Honeysuckle'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.origin,'Guji, Ethiopia',JSON.stringify(r));
 assert.match(coffeeUrlPreviewMarkup(r),/Guji, Ethiopia/);
 assert.doesNotMatch(r.fields.origin,/Shakisso/);
 assert.equal(r.fields.release_label,undefined);
});
test('historical purchase or marketing place alone never establishes this lot region',()=>{
 for(const s of [historical,'Producer Getachew bought land in Shakisso in 2008.',
 'Getachew is well known. Guji coffee is a regional category.']){
  const r=parse({story:s});
  assert.notEqual(r.fields.origin,'Guji, Ethiopia',s);
  assert.notEqual(r.fields.origin,'Shakisso, Ethiopia',s);
 }
});
test('other named producers and noncurrent or different localities reject promotion',()=>{
 for(const s of ['Before he became one of Guji’s most precise producers, Hana B. was an accountant.',
 'Getachew Zekele was formerly one of Guji’s most precise producers.',
 'Getachew Zekele was one of Sidamo’s finest producers.']){
  const r=parse({story:s});
  assert.notEqual(r.fields.origin,'Guji, Ethiopia',s);
 }
});
test('already precise or contrary direct origin stays unchanged',()=>{
 for(const origin of ['Sidamo, Ethiopia','Kenya','Guji, Ethiopia'])
  assert.equal(refine({name,country:'Ethiopia',origin,blocks:selected()}),null);
});
test('H1 must be exact and unique, SEO and unrelated products cannot donate region',()=>{
 assert.equal(refine({name,country:'Ethiopia',origin:'Ethiopia',blocks:[{tag:'h1',text:'Other Coffee'},{tag:'p',text:current}]}),null);
 assert.equal(refine({name,country:'Ethiopia',origin:'Ethiopia',blocks:[...selected(),{tag:'h1',text:'Another Coffee'}]}),null);
 const r=parse({story:'Smooth sweet cup.',related:'<aside><h3>Other Coffee</h3><p>'+current+'</p></aside>'});
 assert.notEqual(r.fields.origin,'Guji, Ethiopia',JSON.stringify(r));
});
test('styles and other merchandise are never asserted as subregions',()=>{
 for(const title of ['Ethiopia Natural Getachew','Ethiopia Guji Blend',
  'Ethiopia Roast Getachew','Ethiopia Guji Coffee']){
  const r=parse({title});
  assert.notEqual(r.fields.origin,'Guji, Ethiopia',title);
 }
});
