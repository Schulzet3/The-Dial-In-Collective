import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,selectedProof} from '../scripts/audit/issue33-r98-gallop-encanto-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
const page=(e,description,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+
 e.name+'</h1><div class="product__description">'+description+'</div></article>'+extra+'</main></body></html>';
test('both original current chosen official products have distinct exact selected identity and direct facts',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.join('. ')+'</p>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e),{uniqueH1:true,direct:e.own.map(()=>true)});}
});
test('missing, duplicate and replaced selected product H1 fail closed',()=>{
 for(const e of cases)for(const headings of [[],[e.name,e.name],['Different Coffee']])
  assert.equal(selectedProof(page(e,e.own.join(' ')),headings,e).uniqueH1,false);
});
test('source claims appearing only in navigation, related suggestions or footer cannot certify selected coffee',()=>{
 for(const e of cases){
  const p=productMarkup(page(e,'<p>Only a product name is published.</p>',
   '<nav>'+e.own.join('. ')+'</nav><aside>'+e.own.join('. ')+'</aside><footer>'+e.own.join('. ')+'</footer>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e).direct,e.own.map(()=>false));
 }
});
test('changed selected tasting facts are not silently certified',()=>{
 for(const e of cases){const s=e.own.map((x,i)=>i===e.own.length-1?'Different coffee flavor':x).join('. ');
  const p=productMarkup(page(e,'<p>'+s+'</p>'));
  assert.equal(selectedProof(p,selectedProductHeadings(p),e).direct.at(-1),false);
 }
});
test('rotating multi-country Gallop is not evidence of a single fixed farm or component process',()=>{
 const e=cases[0],b='Great as Espresso. Gallop. While the blend changes with each harvest. Blend: Colombia, Guatemala. Tasting Notes: Red Apple, S\u0027mores, Black Cherry.';
 const p=extractPublicCoffeeFacts(page(e,'<p>'+b+'</p><aside>Other Coffee: Ethiopia natural blue raspberry</aside>'),{
  source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Ethiopia|blue raspberry/i);
});
test('selected washed Maragesha stays distinct from unrelated natural Pache neighbor',()=>{
 const e=cases[1],b='Washed Maragesha. Quindio, Colombia. Felipe Arcila is a fourth-generation coffee farmer. This lot undergoes washed processing. Flavor Notes: Strawberry, Peach, Red Wine.';
 const p=extractPublicCoffeeFacts(page(e,'<p>'+b+'</p>','<aside>Related Coffee: Natural Pache Raspberry Yogurt</aside>'),{
  source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Natural Pache|Raspberry Yogurt/i);
});
