import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentTradeElevationRegion as refine} from '../src/server/coffee-selected-trade-elevation-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Honduras Comsa – Washed, Espresso';
const caption='Fair Trade / Organic • La Paz • 1200-1750 meters';
const blocks=(s=caption,n=name)=>[{tag:'h1',text:n},{tag:'p',text:s,section:'Current selected product'}];
test('R57 direct selected trade/altitude line uniquely corroborates La Paz',()=>{
 assert.equal(refine({name,origin:'Honduras',blocks:blocks()})?.value,'La Paz, Honduras');
 const html='<html><head><meta property="og:type" content="product"></head><main><article class="product"><h1>'+name+
 '</h1><div class="product-description"><p>Origin: Honduras</p><p>'+caption+
 '</p><p>Process: Washed</p><p>Flavor Notes: Rich Dark Chocolate, Black Pepper</p></div></article></main></html>';
 const out=extractPublicCoffeeFacts(html,{source_url:'https://www.thecoffeeexchange.com/products/honduras-comsa-espresso-roast'});
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.fields.origin,'La Paz, Honduras',JSON.stringify(out));
 assert.ok(coffeeUrlPreviewMarkup(out));
 assert.ok(coffeeSourceReviewSnapshot({...out,source_url:'https://www.thecoffeeexchange.com/products/honduras-comsa-espresso-roast'}));
});
test('R57 generalizes to a distinct country with a selected trade altitude marker',()=>{
 const n='Guatemala Selected Coffee';
 assert.equal(refine({name:n,origin:'Guatemala',blocks:blocks('Organic / Fair Trade · Huehuetenango · 1400-1800 masl',n)})?.value,'Huehuetenango, Guatemala');
});
test('R57 hostile former lot, education, other product, conflicting, mismatched H1 and unsupported bounds fail closed',()=>{
 const base={name,origin:'Honduras',blocks:blocks()};
 for(const mutation of [
  {name:'Honduras Another Coffee'},{origin:'Guatemala'},{origin:'La Paz, Honduras'},
  {blocks:blocks(caption,'Other Coffee')},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:caption,section:'Related products'}]},
  {blocks:[{tag:'h1',text:name},{tag:'p',text:caption,educational:true}]},
  {blocks:blocks('Previous lot: '+caption)},
  {blocks:blocks(caption.replace('1200-1750 meters','1200 grams'))},
  {blocks:blocks(caption.replace('Fair Trade / Organic','Flavor notes'))},
  {blocks:[...blocks(),{tag:'p',text:caption.replace('La Paz','Cobán')}]},
  {blocks:[...blocks(),{tag:'h1',text:'Other Coffee'}]},
  {blocks:blocks('Related Products: '+caption)}
 ])assert.equal(refine({...base,...mutation}),null,JSON.stringify(mutation));
});
