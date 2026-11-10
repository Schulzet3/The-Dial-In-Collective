import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,ownSelectedProof} from '../scripts/audit/issue33-r99-468-471-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
const page=(e,description,near='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+e.name+'</h1><div class="product__description">'+description+'</div></article>'+near+'</main></body></html>';
test('each exact selected original product has own distinct direct facts',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.join('. ')+'</p>'));
  assert.deepEqual(ownSelectedProof(p,selectedProductHeadings(p),e),{uniqueH1:true,direct:e.own.map(()=>true)});}
});
test('identity fail-closed: absent, duplicate or different H1',()=>{
 for(const e of cases)for(const headings of [[],[e.name,e.name],['Different Product']])
  assert.equal(ownSelectedProof(page(e,e.own.join(' ')),headings,e).uniqueH1,false);
});
test('unrelated nav, footer and recommendations never prove direct source description',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>Only chosen name</p>',
   '<nav>'+e.own.join(' ')+'</nav><aside>'+e.own.join(' ')+'</aside><footer>'+e.own.join(' ')+'</footer>'));
  assert.deepEqual(ownSelectedProof(p,selectedProductHeadings(p),e).direct,e.own.map(()=>false));}
});
test('changed current selected claim fails direct evidence certification',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.slice(0,-1).join('. ')+'</p>'));
  assert.equal(ownSelectedProof(p,selectedProductHeadings(p),e).direct.at(-1),false);}
});
test('Pache lot cannot borrow unrelated Natural Caturra or another product',()=>{
 const e=cases[0],p=extractPublicCoffeeFacts(page(e,
  '<p>Washed Pache. Huehuetenango, Guatemala. Mauricio Rosales farm. This Pache lot grows on the highest field. Flavor Notes: Dark chocolate, toasted almond, nougat.</p>',
  '<aside>Recommended other coffee: Jardines del Encanto Natural Caturra Strawberry.</aside>'),{source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Jardines del Encanto|Natural Caturra|Strawberry/i);
});
test('Signature Roast component tiers and unselected decaf variant are not direct green coffee processing evidence',()=>{
 const e=cases[1],p=extractPublicCoffeeFacts(page(e,
  '<p>This Central and South America blend brings out excellent notes by combining equal parts of Full City and French Roast, 100% Arabica.</p>',
  '<aside>Related coffee: Half Caff, Swiss Water Decaf Peru Natural Strawberry.</aside>'),{source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Swiss Water|Peru Natural|Strawberry/i);
});
