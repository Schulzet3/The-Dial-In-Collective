import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentTradeElevationRegion as refine} from '../src/server/coffee-selected-trade-elevation-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Dominican Republic – Red Honey, Vienna';
const caption='Direct Trade / Organic • Jarabacoa, Cibao • 1300 meters';
const selected=(desc=caption,h1=name)=>[
 {tag:'h1',text:h1},{tag:'p',text:desc,section:'Current selected product'}
];
const props={name,origin:'Dominican Republic',blocks:selected()};
const url='https://www.thecoffeeexchange.com/products/dominican-republic-red-honey-process-vienna-roast-limited-offering';

test('R58 exact current chosen source supports two-segment locality without regional conjecture',()=>{
 assert.equal(refine(props)?.value,'Jarabacoa, Cibao, Dominican Republic');
 const html='<html><head><meta property="og:type" content="product"></head>'+
 '<main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product-description"><p>Origin: Dominican Republic</p><p>'+caption+'</p>'+
 '<p>Our only Caribbean coffee, this limited offering from a family-owned farm is shade-grown and harvested at a high altitude.</p>'+
 '<p>Process: Red Honey</p><p>Flavor Notes: Bold flavor, Smooth, Full body, Dark Chocolate, Cherry</p>'+
 '</div></article></main></html>';
 const out=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.fields.origin,'Jarabacoa, Cibao, Dominican Republic',JSON.stringify(out));
 assert.ok(coffeeUrlPreviewMarkup(out).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...out,source_url:url}));
});

test('R58 generic direct-trade locality also accepts a distinct, selected country',()=>{
 const n='Guatemala Selected Coffee';
 assert.equal(refine({name:n,origin:'Guatemala',blocks:selected(
  'Direct Trade / Organic · Cobán, Alta Verapaz · 1400 masl',n)})?.value,
 'Cobán, Alta Verapaz, Guatemala');
});

test('R58 prior selected Fair Trade region rule remains unchanged',()=>{
 const n='Honduras Comsa – Washed, Espresso';
 assert.equal(refine({name:n,origin:'Honduras',blocks:selected(
  'Fair Trade / Organic • La Paz • 1200-1750 meters',n)})?.value,'La Paz, Honduras');
});

test('R58 unrelated/old/ambiguous/product-mismatch/altitude-free/sensory captions fail closed',()=>{
 for(const bad of [
  {name:'Brazil Other Coffee'},
  {origin:'Guatemala'},
  {origin:'Jarabacoa, Dominican Republic'},
  {blocks:selected(caption,'Other Product')},
  {blocks:[...selected(),{tag:'h1',text:'Unrelated coffee'}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:caption,section:'Related products'}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:caption,educational:true}]},
  {blocks:selected('Last year '+caption)},
  {blocks:selected('Another coffee: '+caption)},
  {blocks:selected(caption.replace('1300 meters','1300 grams'))},
  {blocks:selected(caption.replace('Direct Trade / Organic','Flavor Notes'))},
  {blocks:selected(caption.replace('Jarabacoa, Cibao','Chocolate, Cherry'))},
  {blocks:[...selected(),{tag:'p',text:caption.replace('Jarabacoa, Cibao','Santiago, Santiago')}]},
  {blocks:selected(caption.replace('Jarabacoa, Cibao','Jarabacoa, Cibao, La Paz'))},
  {blocks:selected('You may also like: '+caption)}
 ])assert.equal(refine({...props,...bad}),null,JSON.stringify(bad));
});
