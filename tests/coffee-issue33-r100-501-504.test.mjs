import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,selectedProof} from '../scripts/audit/issue33-r100-501-504-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
const page=(e,desc,neighbor='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+e.name+'</h1><div class="product__description">'+desc+'</div></article>'+neighbor+'</main></body></html>';
test('each selected product direct printed claims and unique H1 are independent',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.join('. ')+'</p>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e),{uniqueH1:true,direct:e.own.map(()=>true)});}
});
test('identity certifier rejects absent, duplicate, or changed selected heading',()=>{
 for(const e of cases)for(const titles of [[],[e.name,e.name],['Different Product']])
  assert.equal(selectedProof(page(e,e.own.join(' ')),titles,e).uniqueH1,false);
});
test('navigation, related, and footer claims cannot qualify direct source evidence',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>No direct field claims</p>',
   '<nav>'+e.own.join(' ')+'</nav><aside>'+e.own.join(' ')+'</aside><footer>'+e.own.join(' ')+'</footer>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e).direct,e.own.map(()=>false));}
});
test('a direct selected claim changing fails live certification rather than accepting archive facts',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.slice(0,-1).join('. ')+'</p>'));
  assert.equal(selectedProof(p,selectedProductHeadings(p),e).direct.at(-1),false);}
});
test('Ki-Saya lacks roast, process, farm or elevation; unrelated dark roast must not leak',()=>{
 const e=cases[0],p=extractPublicCoffeeFacts(page(e,
  '<p>Ki-Saya, our organic gem from Chiapas. This lot hails from Tenejapa. Notes Of: Chocolate, creamy caramel, honey, hazelnut.</p>',
  '<aside>Related Dark Roast: Mexico Oaxaca Natural, 1800 masl, producer Rosa.</aside>'),
  {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.ok(!p.fields.roast_level&&!p.fields.process&&!p.fields.elevation_m,JSON.stringify(p.fields));
 assert.doesNotMatch(JSON.stringify(p.fields),/Mexico Oaxaca|Rosa|1800 masl/i);
});
test('Tanzania selected seller details do not borrow a neighbor coffee',()=>{
 const e=cases[1],p=extractPublicCoffeeFacts(page(e,
  '<p>Tanzania AA - AMCOS. Light roast. Notes of honeydew, agave sweetness and mild peatiness. Country Tanzania. Region Mbeya. Farm AMCOS Cooperative. Variety Bourbon Derivatitves. Altitude 1870 masl. Proc. Method Washed.</p>',
  '<aside>Related Decaf: Guatemala Natural, 1400m, rosewater and strawberry.</aside>'),
  {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Guatemala|1400m|rosewater|strawberry/i);
});
