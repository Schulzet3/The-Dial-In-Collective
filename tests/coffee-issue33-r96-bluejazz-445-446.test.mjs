import {selectedCurrentTwoRegionSingleCountryBlend} from '../src/server/coffee-selected-two-region-blend.mjs';
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
const actualCurrentGuatemala='Our current Guatemala offering is our favorite one we\'ve created to date. In fact, we found two regional lots we love and combined them to make a single origin blend! You will find flavor notes of stone fruit with a lemony brightness. One of the coffees is a fully washed selection from the Lake Atitlan region grown at 1800-2000 meters above sea level. The other is a washed HueHuetenengo grown at 1500-1700 MASL.';
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

test('same-country regional blend recovers BOTH literal components with no invented blend elevation',()=>{
 const e=c(445),p=parse(e,actualCurrentGuatemala);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(p.fields.origin||'',/Lake Atitlan/i);
 assert.match(p.fields.origin||'',/HueHuetenengo/i);
 assert.match(p.fields.origin||'',/Guatemala/i);
 assert.ok(!p.fields.elevation_m);
 assert.ok(!p.fields.producer&&!p.fields.decaffeination_method);
});
test('historical composition statement and unrelated sidebar must not refine current country',()=>{
 const e=c(445),old=actualCurrentGuatemala.replace('combined them to make a single origin blend','previously combined them to make a single origin blend');
 const p=parse(e,old);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/HueHuetenengo/i.test(p.fields.origin||''),JSON.stringify(p.fields));
 const q=parse(e,'Current selected coffee has no regional detail.','<aside>'+e.own.join('. ')+'</aside>');
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.ok(!/HueHuetenengo|Atitlan/i.test(q.fields.origin||''));
});
test('unrelated recommended origins never mix with two selected regional components',()=>{
 const e=c(445),p=parse(e,actualCurrentGuatemala,'<aside><h2>Other coffee</h2>Kenya Natural 2600 MASL blueberry</aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(p.fields.origin||'',/Lake Atitlan/);
 assert.ok(!/Kenya|blueberry/i.test(JSON.stringify(p.fields)));
});

test('two-lot helper accepts one already-proven region but rejects a mismatched competing place',()=>{
 const own=c(445).own;
 const blocks=[{tag:'h1',text:'Guatemala'},
  {tag:'p',text:own[0]+'. In fact, we found two regional lots we love and combined them to make a single origin blend!'},
  {tag:'p',text:'One of the coffees is a '+own[2]+'. The other is a washed HueHuetenengo grown at 1500-1700 MASL.'}];
 const compatible=selectedCurrentTwoRegionSingleCountryBlend({name:'Guatemala',origin:'Lake Atitlan, Guatemala',blocks});
 assert.match(compatible?.value||'',/HueHuetenengo/);
 const unrelated=selectedCurrentTwoRegionSingleCountryBlend({name:'Guatemala',origin:'Petén, Guatemala',blocks});
 assert.equal(unrelated,null);
});
