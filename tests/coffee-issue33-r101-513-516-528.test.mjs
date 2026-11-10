import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,selectedProof} from '../scripts/audit/issue33-r101-513-516-528-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
const page=(e,desc,neighbor='')=>'<html><head><meta property="og:type" content="product"></head><body><main>'+
 '<article class="product"><h1>'+e.name+'</h1><div class="product__description">'+desc+
 '</div></article>'+neighbor+'</main></body></html>';
test('three independently selected current official product names and printed direct claims',()=>{
 for(const e of cases){const p=productMarkup(page(e,'<p>'+e.own.join('. ')+'</p>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e),
   {uniqueH1:true,direct:e.own.map(()=>true)});}
});
test('changed, absent and duplicate chosen H1 cannot pass certification',()=>{
 for(const e of cases)for(const titles of [[],[e.name,e.name],['Unrelated seasonal bag']])
  assert.equal(selectedProof(page(e,e.own.join(' ')),titles,e).uniqueH1,false);
});
test('navigation, recommendations and footer claims never qualify as direct selected product',()=>{
 for(const e of cases){const p=productMarkup(page(e,'No coffee facts',
   '<nav>'+e.own.join(' ')+'</nav><aside>'+e.own.join(' ')+'</aside><footer>'+e.own.join(' ')+'</footer>'));
  assert.deepEqual(selectedProof(p,selectedProductHeadings(p),e).direct,e.own.map(()=>false));}
});
test('removed direct selected claim fails certification even when archived text once stated it',()=>{
 for(const e of cases){const p=productMarkup(page(e,e.own.slice(0,-1).join('. ')));
  assert.equal(selectedProof(p,selectedProductHeadings(p),e).direct.at(-1),false);}
});
test('Kilimanjaro exact current notes, medium, washed cannot borrow unrelated producer',()=>{
 const e=cases[0],p=extractPublicCoffeeFacts(page(e,
 '<p>Tanzania Peaberry: Kilimanjaro (Single-Bean Reserve). Roast: Medium. Notes: Red Apple, Pear, Maple, Brown Sugar. Origin Tanzania. Fully washed process. Grown at 1,600+ meters in Mbeya Region.</p>',
 '<aside>Related Ethiopia producer XYZ, Natural Geisha, 1500m, cocoa nibs.</aside>'),
 {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/XYZ|1500|Geisha|cocoa nibs/i);
});
test('What Cheer retains current same-product origin despite stale redwall URL handle',()=>{
 const e=cases[1],p=extractPublicCoffeeFacts(page(e,
 '<p>Current Coffee: Guatemala Huehuetenango. What Cheer - Medium Roast has notes of fruit over a rich chocolate base.</p>',
 '<aside>Related Dark Roast Brazil Natural, grown at 2200m by Alice Farm.</aside>'),
 {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Brazil Natural|Alice Farm|2200m/i);
});
test('Thanksgiving selected own malt must not be borrowed from other product description',()=>{
 const e=cases[2],p=extractPublicCoffeeFacts(page(e,
 '<p>Medium-dark roast with notes of dark chocolate and malt, dark cherry and wild honey.</p>',
 '<aside>Related Ethiopia light washed producer Alice 2000masl strawberry.</aside>'),
 {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Ethiopia|Alice|2000|strawberry/i);
});
