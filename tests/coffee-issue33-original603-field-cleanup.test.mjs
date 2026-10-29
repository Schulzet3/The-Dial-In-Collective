// Actual Issue33 original603 current selected-source facts; do not alter frozen oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.example/products/current';
function parse(name,body){
 const html='<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+url+'"></head>'+
  '<body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
 const data=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(data.ok,true,name);
 return data;
}
for(const [name,label,expected] of [
 ['Colombia El Silencio','Varietal: -- Chiroso','Chiroso'],
 ['El Salvador Las Veraneras','Varietal: -- San Pacho','San Pacho'],
 ['Uganda Organic','Varietals: Bourbon,Kenya SL14,Kenya SL28','Bourbon, Kenya SL14, Kenya SL28']
]){
 test('source-backed varietal autofill: '+name,()=>{
  const data=parse(name,'<p>'+label+'</p><p>Origin: Colombia</p>');
  assert.equal(data.fields.variety,expected);
  assert.ok(coffeeUrlPreviewMarkup(data).includes(expected));
 });
}
for(const [name,label,expected] of [
 ['Mexican Oaxaca','Origin: Oaxaca Region of Mexico','Oaxaca Region, Mexico'],
 ['COLOMBIA DECAF','Region: Tolima Region of Colombia','Tolima Region, Colombia']
]){
 test('source-backed country de-duplication: '+name,()=>{
  const data=parse(name,'<p>'+label+'</p>');
  assert.equal(data.fields.origin,expected);
  assert.ok(coffeeUrlPreviewMarkup(data).includes(expected));
 });
}
test('legitimate cultivars preserve internal hyphens and punctuation',()=>{
 for(const [raw,expected] of [['SL-28','SL-28'],['Bourbon, Typica','Bourbon, Typica']]){
  const data=parse('Current Coffee','<p>Variety: '+raw+'</p>');
  assert.equal(data.fields.variety,expected);
 }
});
test('single country, mismatched country and proper mountain do not normalize',()=>{
 for(const [raw,expected] of [
  ['Amazon Region of Peru','Amazon Region of Peru'],
  ['Oaxaca Region of Mexico, Guatemala','Oaxaca Region of Mexico, Guatemala'],
  ['Mt. Kenya, Kenya','Mt. Kenya, Kenya']
 ]){
  const data=parse('Current Coffee','<p>Origin: '+raw+'</p>');
  assert.equal(data.fields.origin,expected);
 }
});
test('unrelated product recommendation cannot donate cultivar',()=>{
 const data=parse('Current Coffee','<p>Origin: Colombia</p><section class="product-recommendations">'+
  '<h3>Another Coffee</h3><p>Varietal-- Chiroso</p></section>');
 assert.equal(data.fields.variety,undefined);
});

test('combined READY source: selected product variety and region normalize without borrowing unrelated roast flavor',()=>{
 const data=parse('Current Coffee','<p>Varietals: Bourbon,Kenya SL14,Kenya SL28</p><p>Region: Tolima Region of Colombia</p>'+ 
  '<section class="product-recommendations"><h3>Other Coffee</h3><p>Roast: Dark</p><p>Tasting Notes: Chocolate</p></section>');
 assert.equal(data.fields.variety,'Bourbon, Kenya SL14, Kenya SL28');
 assert.equal(data.fields.origin,'Tolima Region, Colombia');
 assert.equal(data.fields.roast_level,undefined);
 assert.equal(data.fields.tasting_notes,undefined);
 const preview=coffeeUrlPreviewMarkup(data);
 assert.match(preview,/Tolima Region, Colombia/);
 assert.match(preview,/Bourbon, Kenya SL14, Kenya SL28/);
});
