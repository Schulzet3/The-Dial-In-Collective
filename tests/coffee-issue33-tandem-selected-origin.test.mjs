// Issue #33 original603 #580: H1 sibling locality plus independent current farm evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {coffeeHtmlElements} from '../src/server/coffee-html-structure.mjs';
import {productCoffeeProse} from '../src/server/coffee-product-prose.mjs';
import {extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
const url='https://www.tandemcoffee.com/products/faver-ninco-santa-maria-huila-colombia';
const origin='<div class="product-info__location"><span class="cityname">Santa Maria, Huila</span><span class="coname">Colombia</span></div>';
const farm='This is the first of three Pink Bourbon lots at Finca Costa Rica, Faver Ninco’s 10-hectare farm in Santa Maria. Main harvest is from May to August.';
const facts='<dl><dt>Producer</dt><dd>Faver Ninco</dd><dt>Varietals</dt><dd>Pink Bourbon</dd><dt>Elevation</dt><dd>2005 MASL</dd><dt>Processing</dt><dd>Washed</dd></dl>';
function parse({name='Faver Ninco - Colombia',loc=origin,story=farm,related=''}={}){
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product"><safe-sticky class="product-info"><h1 class="product-info__title">'+name+
 '</h1>'+loc+'</safe-sticky><div class="product-description"><span>'+story+'</span>'+facts+
 '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#580 current selected H1 and same farmer-farm confirm complete locality',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));
 const raw='<main><article class="product"><safe-sticky class="product-info"><h1 class="product-info__title">Faver Ninco - Colombia</h1>'+origin+'</safe-sticky><div class="product-description"><span>'+farm+'</span>'+facts+'</div></article></main>';
 const page=productMarkup(raw),nodes=coffeeHtmlElements(page).nodes;
 const h=nodes.find(n=>n.tag==='h1');
 const nextIndex=nodes.findIndex(n=>n.parent===h?.parent&&n.start>h.end);
 const next=nodes[nextIndex];
 const simpleClean=(value,max)=>String(value).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max||6001);
 const blocks=productCoffeeProse(raw,simpleClean);
 const f=extractCoffeeIdentityEvidence(raw,{name:'Faver Ninco - Colombia',fields:r.fields,clean:simpleClean}).facts;
 console.log('DIC33 580 DEBUG',JSON.stringify({producer:r.fields.producer,origin:r.fields.origin,title:h&&{parent:h.parent,end:h.end},adjacent:next&&{parent:next.parent,start:next.start,tag:next.tag,attrs:next.attributes},cityNodes:nodes.filter(n=>n.parent===nextIndex).map(n=>({tag:n.tag,attrs:n.attributes})),blocks:blocks.filter(b=>/Faver|farm in/i.test(b.text)).map(b=>({tag:b.tag,text:b.text.slice(0,300)})),identityFacts:f.filter(x=>x.label==='Origin')}));
 assert.equal(r.fields.origin,'Santa Maria, Huila, Colombia',JSON.stringify(r));
 assert.equal(r.fields.producer,'Faver Ninco');assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'Pink Bourbon');assert.equal(r.fields.release_label,undefined);
});
test('uncorroborated location cannot fill growing geography',()=>{
 const r=parse({story:'Faver Ninco sells coffee from several origins.'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.origin,'Santa Maria, Huila, Colombia');
});
test('mismatched selected country cannot fill an unrelated locality',()=>{
 const r=parse({name:'Faver Ninco - Kenya'});assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.origin,'Santa Maria, Huila, Colombia');
});
test('shipping or former farm geography is excluded',()=>{
 for(const story of ['Faver Ninco ships coffee from Santa Maria.','Faver Ninco’s former farm in Santa Maria served another coffee.']){
  const r=parse({story});assert.equal(r.ok,true,JSON.stringify(r));
  assert.notEqual(r.fields.origin,'Santa Maria, Huila, Colombia');
 }
});
test('related coffee location is not adjacent to selected H1',()=>{
 const related='<aside class="related-products"><h2>Other coffee</h2>'+origin+'</aside>';
 const r=parse({loc:'',related});assert.equal(r.ok,true,JSON.stringify(r));
 assert.notEqual(r.fields.origin,'Santa Maria, Huila, Colombia');
});
test('conflicting location country spans are never silently selected',()=>{
 const r=parse({loc:'<div class="product-info__location"><span class="cityname">Santa Maria, Huila</span><span class="coname">Colombia</span><span class="coname">Kenya</span></div>'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.notEqual(r.fields.origin,'Santa Maria, Huila, Colombia');
});
