// Original603 #442/#443/#444: independently sourced current selected H1
// contains literal country+regional place; no flavor/related/SEO inheritance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedDottedTitleCountryRegion as refine} from '../src/server/coffee-dotted-title-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const cases=[
 ['ALVA MARINA ALVARADO. HONDURAS. SANTA BARBARA | CRANBERRY LEMON CURD, TANGERINE, & HIBISCUS.',
  'HONDURAS','SANTA BARBARA, HONDURAS'],
 ['DANCHE. ETHIOPIA. GEDEB ZONE | BLUEBERRY, PINEAPPLE, KIWI, & PEACH.',
  'ETHIOPIA','GEDEB ZONE, ETHIOPIA'],
 ['TZUNWITZ. GUATEMALA. HUEHUETENANGO | BLUEBERRY WAFFLES, STRAWBERRY NOUGAT, & PEAR.',
  'GUATEMALA','HUEHUETENANGO, GUATEMALA']
];
const escape=value=>value.replace(/&/gu,'&amp;');
function selected(title,extra=''){
 const h='<h1>'+escape(title)+'</h1>';
 const country=title.match(/^[^.]+\.\s*([^.]+)\./u)?.[1]||'';
 return '<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product">'+h+'<p>Country: '+country+
 '</p><div class="product-description"><p>Selected coffee from the featured farmer.</p></div>'+
 '</article></main>'+extra+'</body></html>';
}
test('explicit exact selected dotted country, locality and flavor separator refine country-only origin',()=>{
 for(const [name,origin,want] of cases){
  const result=refine({name,origin,blocks:[{tag:'h1',text:'Coffee and other Goods'},{tag:'h1',text:name},{tag:'h1',text:name}]});
  assert.equal(result?.value,want,name);
  assert.equal(result.quote,name);
 }
});
test('actual parser preserves literal current H1 and refines only source-printed geography',()=>{
 for(const [name,origin,want] of cases){
  const url='https://examplecoffee.test/product/'+origin.toLowerCase();
  const result=extractPublicCoffeeFacts(selected(name),{source_url:url});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.fields.name,name);
  assert.equal(result.fields.origin,want,JSON.stringify(result));
  assert.equal(result.fields.process,undefined);
  assert.equal(result.fields.producer,undefined);
  assert.equal(result.fields.decaffeination_method,undefined);
 }
});
test('generic or unrelated country, unknown locality, flavor, or mismatched selected H1 is not an origin',()=>{
 const name=cases[0][0];
 for(const props of [
  {origin:'Guatemala'}, {origin:'Santa Barbara, Honduras'},
  {blocks:[{tag:'h1',text:'Other Bean'}]},
  {blocks:[{tag:'h1',text:name},{tag:'h1',text:cases[1][0]}]},
  {name:name.replace('SANTA BARBARA','MEDIUM ROAST')},
  {name:name.replace('SANTA BARBARA','CHOCOLATE')},
  {name:name.replace('SANTA BARBARA','LOT 2024')},
  {name:name.replace('SANTA BARBARA','SINGLE ORIGIN')}
 ]){
  assert.equal(refine({name,origin:'HONDURAS',blocks:[{tag:'h1',text:name}],...props}),null,JSON.stringify(props));
 }
});
test('SEO, old product title, related card and navigation do not supply a locality',()=>{
 for(const html of [
  '<main><h1>Selected Honduras</h1><p>Current Beans: Honduras</p></main>'+
   '<aside><h1>'+escape(cases[0][0])+'</h1></aside>',
  '<main><h1>Selected Honduras</h1><p>Current Beans: Honduras</p></main>'+
   '<meta property="og:title" content="'+escape(cases[0][0])+'">',
  '<main><h1>Selected Honduras</h1><p>Current Beans: Honduras</p></main>'+
   '<div class="related-products">'+selected(cases[0][0])+'</div>'
 ]){
  const parsed=extractPublicCoffeeFacts(html,{source_url:'https://examplecoffee.test/products/selected-honduras'});
  assert.notEqual(parsed.fields?.origin,'SANTA BARBARA, HONDURAS',JSON.stringify(parsed));
 }
});
test('unlabeled concatenated or unsupported heading cannot invent a region',()=>{
 for(const text of ['DANCHE ETHIOPIA GEDEB ZONE | BLUEBERRY','DANCHE. ETHIOPIA | BLUEBERRY',
  'DANCHE. ETHIOPIA. NATURAL | BLUEBERRY','DANCHE. ETHIOPIA. GEDEB ZONE / ANOTHER | BLUEBERRY']){
  assert.equal(refine({name:text,origin:'ETHIOPIA',blocks:[{tag:'h1',text}]}),null,text);
 }
});
