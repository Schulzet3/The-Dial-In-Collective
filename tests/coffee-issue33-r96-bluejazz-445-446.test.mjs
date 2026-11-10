import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,selectedProof} from '../scripts/audit/issue33-r96-bluejazz-445-446-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const c=n=>cases.find(e=>e.number===n);
const html=(e,body,other='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+e.name+'</h1><div class="product__description"><p>'+body+'</p></div></article>'+other+'</main></body></html>';
const parse=(e,body,other='')=>extractPublicCoffeeFacts(html(e,body,other),{source_url:'https://www.bluejazzcoffee.com'+e.path});
test('selected direct sentences on the original exact two Blue Jazz coffees are explicit',()=>{
  for(const e of cases){
    const selected=productMarkup(html(e,e.own.join('. ')));
    assert.deepEqual(selectedProof(selected,selectedProductHeadings(selected),e),
      {uniqueH1:true,direct:e.own.map(()=>true)});
  }
});
test('menu, related-coffee and page sidebar cannot donate selected notes or location',()=>{
  for(const e of cases){
    const scoped=productMarkup(html(e,'This selected coffee has no detail.','<aside>'+e.own.join(' ')+'</aside><nav>'+e.own.join(' ')+'</nav>'));
    assert.ok(selectedProof(scoped,selectedProductHeadings(scoped),e).direct.every(v=>!v));
  }
});
test('wrong, missing or duplicate selected H1 cannot certify archived handle',()=>{
  for(const e of cases)for(const h of [[],['Different Coffee'],[e.name,e.name]]){
    assert.equal(selectedProof(html(e,e.own.join('. ')),h,e).uniqueH1,false);
  }
});
test('Guatemala regional blend does not inherit a unique farm or one component elevation',()=>{
  const e=c(445),p=parse(e,e.own.join('. '));
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.equal(p.fields.name,e.name);
  assert.match(p.fields.origin||'',/Guatemala/i);
  assert.ok(!p.fields.producer&&!p.fields.decaffeination_method);
  assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.bluejazzcoffee.com'+e.path}));
});
test('El Scorpion current product is medium-light and its own washed Caturra Bourbon',()=>{
  const e=c(446),p=parse(e,e.own.join('. '));
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.equal(p.fields.name,e.name);
  assert.match(p.fields.roast_level||'',/medium.light/i);
  assert.match(p.fields.origin||'',/Guatemala/i);
  assert.ok(!p.fields.producer&&!p.fields.decaffeination_method);
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.bluejazzcoffee.com'+e.path}));
});
test('unrelated Dark roast and Ethiopian coffee in aside do not override selected El Scorpion',()=>{
  const e=c(446),p=parse(e,e.own.join('. '),'<aside><h2>Other Coffee Ethiopia Gesha</h2><p>Dark, Natural, blueberry, Kenya</p></aside>');
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.ok(!/ethiopia|blueberr|kenya|gesha/i.test(JSON.stringify(p.fields)));
});
