// Issue #33 original603 #363: current selected H1 + direct matching prose only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountryAreaOfRegion} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='mexico chiapas bellavista medium';
const text='-brilliant clean washed mexico from Bellavista area of the Chiapas';
const url='https://subterracoffee.com/products/mexico-chiapas-bellavista-medium';
function markup({title=name,story=text,related='',extraH1='',extra='',section='Product Details'}={}){
 return '<html><head><meta property="og:type" content="product"><meta name="description" content="Another coffee from Bellavista area of the Chiapas"></head><body>'+
  '<main><article class="product"><h1>'+title+'</h1><div class="product__description"><h2>'+section+'</h2>'+
  '<p>'+story+'</p><p><strong>Roast Level:</strong> Medium</p><p><strong>Tasting Notes:</strong> nutty, chocolatey</p><p>-produced by small farmholders</p>'+extra+
  '</div></article></main>'+related+(extraH1?'<h1>'+extraH1+'</h1>':'')+'</body></html>';
}
function parse(x={}){return extractPublicCoffeeFacts(markup(x),{source_url:url});}
test('exact direct current source grammar requires selected H1 corroboration',()=>{
 const blocks=[{tag:'h1',text:name},{tag:'p',text}];
 const q=selectedCountryAreaOfRegion({name,country:'Mexico',origin:'Mexico',blocks});
 assert.equal(q?.value,'Bellavista, Chiapas, Mexico');
 assert.match(q.quote,/washed mexico from Bellavista area of the Chiapas/);
});
test('current parser and Add Coffee preserve process, roast, notes and selected origin',()=>{
 const q=parse();assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.name,name);
 assert.equal(q.fields.origin,'Bellavista, Chiapas, Mexico',JSON.stringify(q));
 assert.equal(q.fields.process,'Washed');
 assert.equal(q.fields.roast_level,'Medium');
 assert.match(q.fields.tasting_notes,/nutty.*chocolatey/i);
 assert.match(coffeeUrlPreviewMarkup(q),/Bellavista, Chiapas, Mexico/);
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q.conflicts));
});
test('old lot, negation and historical areas never supply selected locality',()=>{
 for(const story of ['Previously '+text,'Another coffee was '+text,'Not from '+text,'Hypothetical '+text]){
  const q=parse({story});assert.notEqual(q.fields.origin,'Bellavista, Chiapas, Mexico',story);
 }
});
test('mismatched, missing, or competing selected H1 and geography fail closed',()=>{
 for(const props of [
  {title:'mexico chiapas other-coffee medium'},
  {title:'colombia chiapas bellavista medium'},
  {title:'mexico oaxaca bellavista medium'},
  {story:'-brilliant clean washed colombia from Bellavista area of the Chiapas'},
  {story:'-brilliant clean washed mexico from Otherplace area of the Chiapas'},
  {story:'-brilliant clean washed mexico from Bellavista area of the Oaxaca'}
 ]){
  const q=parse(props);assert.notEqual(q.fields.origin,'Bellavista, Chiapas, Mexico',JSON.stringify(props));
 }
});
test('unselected external H1 does not override exact selected product; competing selected headings fail closed',()=>{
 const selected=parse({extraH1:'Another Coffee'});
 assert.equal(selected.fields.origin,'Bellavista, Chiapas, Mexico');
 const blocks=[{tag:'h1',text:name},{tag:'h1',text:'Another Coffee'},{tag:'p',text}];
 assert.equal(selectedCountryAreaOfRegion({name,country:'Mexico',origin:'Mexico',blocks}),null);
});
test('related SKU, SEO and educational prose cannot fill origin',()=>{
 const q=parse({story:'A simple balanced coffee.',related:'<aside class="related-products"><h3>Other product</h3><p>'+text+'</p></aside>'});
 assert.notEqual(q.fields.origin,'Bellavista, Chiapas, Mexico');
 assert.equal(selectedCountryAreaOfRegion({name,country:'Mexico',origin:'Mexico',
  blocks:[{tag:'h1',text:name},{tag:'p',text,educational:true}]}),null);
});
test('specific or contradictory place, other country and multi-origin cannot be overwritten',()=>{
 const b=[{tag:'h1',text:name},{tag:'p',text}];
 for(const origin of ['Oaxaca, Mexico','Guatemala','Chiapas, Mexico','Mexico, Colombia'])
  assert.equal(selectedCountryAreaOfRegion({name,country:'Mexico',origin,blocks:b}),null,origin);
 const q=parse({extra:'<p><strong>Origin:</strong> Oaxaca, Mexico</p>'});
 assert.notEqual(q.fields.origin,'Bellavista, Chiapas, Mexico',JSON.stringify(q));
});
