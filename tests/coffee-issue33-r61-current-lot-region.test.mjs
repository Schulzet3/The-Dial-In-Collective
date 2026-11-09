import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentLotContrastedRegion as refine} from '../src/server/coffee-selected-current-lot-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Ethiopia Wate Gogogu';
const url='https://www.stageline.coffee/product-page/ethiopia-worasa-daniel-mijane';
const current='Another beautiful washed Ethiopian coffee from Negusse Debla, same producer of our previous Worka Sakaro lot. This time from the Guji region and a Grade 1 meaning hardly any defects and top notch sorting/harvesting. Guji has quite the reputation for clean coffee.';
const html=(prose=current,h1=name,extra='')=>
 '<html><head><meta property="og:type" content="product"></head><body><main><article class="product">'+
 '<h1>'+h1+'</h1><div class="product-description"><p>'+prose+'</p>'+
 '<p>Variety: Dega, Kurume</p><p>Process: Washed</p><p>Altitude: 2280 MASL</p>'+
 '<p>In this coffee we are tasting fresh plum and florals.</p></div></article></main>'+extra+'</body></html>';
const blocks=(prose=current,h1=name)=>[
 {tag:'h1',text:h1},{tag:'p',text:prose,section:'Description',educational:false}];
test('R61 current lot contrast, not previous Worka Sakaro, retains direct Guji and previews',()=>{
 assert.equal(refine({name,origin:'Ethiopia',blocks:blocks()})?.value,'Guji, Ethiopia');
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,2000));
 assert.equal(p.fields.origin,'Guji, Ethiopia',JSON.stringify(p).slice(0,2200));
 assert.equal(p.fields.process,'Washed');
 assert.ok(p.source_facts?.some(f=>f.field==='origin'&&
  f.label==='Exact selected this-lot growing region'&&f.value.startsWith('This time from the Guji region')),JSON.stringify(p).slice(0,1800));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('R61 refuses educational Guji, previous lot and other coffee, identity and country mismatch',()=>{
 const tests=[
  {blocks:blocks('Guji has quite the reputation for the best coffees in Ethiopia.')},
  {blocks:blocks('Our previous Worka Sakaro lot was from the Guji region.')},
  {blocks:blocks('Last year this time from the Guji region.')},
  {blocks:blocks('Another coffee. This time from the Guji region.',name)},
  {blocks:blocks(current,'Ethiopia Other Coffee')},
  {origin:'Kenya'},
  {origin:'Guji, Ethiopia'},
  {blocks:[...blocks(),{tag:'h1',text:'Other coffee'}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:current,educational:true}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:current,section:'Related products'}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:current.replace('This time from the Guji region','This time from the Chocolate region')}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:current+' This time from the Sidama region.'}]}
 ];
 for(const bad of tests){
  assert.equal(refine({name,origin:'Ethiopia',blocks:blocks(),...bad}),null,JSON.stringify(bad));
 }
});
test('R61 origin is not inferred from unrelated product cards, metadata or old SEO',()=>{
 for(const x of [
   html('Guji has a great reputation.'),
   html('Our previous Worka Sakaro lot came from Guji.'),
   html('This time from the Guji region.', 'Other coffee'),
   html('Only sourced from Ethiopia.',name,'<aside><h2>Related products</h2><p>This time from the Guji region.</p></aside>'),
   html('This time from the Guji region. This time from the Sidama region.')
 ]){
  const p=extractPublicCoffeeFacts(x,{source_url:url});
  assert.notEqual(p.fields?.origin,'Guji, Ethiopia',JSON.stringify(p).slice(0,1400));
 }
});
