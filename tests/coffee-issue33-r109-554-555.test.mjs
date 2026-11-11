import test from 'node:test';
import assert from 'node:assert/strict';
import {selected109,currentDirect109,selected109FieldsOk} from '../scripts/audit/issue33-r109-554-555-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const mexican='A well-balanced lighter roast with molasses, caramel, and lemongrass tasting notes. Sourced from organic Mexican farms, this single-origin coffee is exceptionally smooth and bright, offering a clean, sweet finish.';
const timor='Sourced from the highlands of Timor, this single-origin medium roast offers a bright, clean cup with natural sweetness. Lively notes of pineapple and fresh orange juice lead the way, balanced by a smooth finish of raw sugar.';
const page=(n,story,extra='')=>'<html><head><title>'+selected109[n].name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected109[n].url+'"></head><body><main><article class="product"><h1>'+selected109[n].name+'</h1><section class="product__description"><p>'+story+'</p></section></article>'+extra+'</main></body></html>';

test('554 unique selected Organic Mexican primary direct evidence only',()=>{
 const proof=currentDirect109(page(554,mexican),554);
 assert.equal(proof.uniqueH1,true);assert.ok(proof.direct.every(v=>v.matched),JSON.stringify(proof));
});
test('555 unique selected Organic Timor own medium and raw sugar',()=>{
 const proof=currentDirect109(page(555,timor),555);
 assert.equal(proof.uniqueH1,true);assert.ok(proof.direct.every(v=>v.matched),JSON.stringify(proof));
});
test('recycled or doubled H1 cannot establish product identity',()=>{
 for(const n of [554,555]){
  const html=page(n,n===554?mexican:timor);
  assert.equal(currentDirect109(html.replace('<h1>'+selected109[n].name+'</h1>','<h1>Another release</h1>'),n).uniqueH1,false);
  assert.equal(currentDirect109(html.replace('</h1>','</h1><h1>Different lot</h1>'),n).uniqueH1,false);
 }
});
test('menu, aside and metadata alone cannot establish direct selected facts',()=>{
 for(const n of [554,555]){
  const x=n===554?mexican:timor;
  const proof=currentDirect109(page(n,'Only packaging choices.', '<aside>'+x+'</aside><nav>'+x+'</nav>'),n);
  assert.ok(proof.direct.some(v=>!v.matched),JSON.stringify(proof));
 }
});
test('changed selected story invalidates positive direct-source assertion',()=>{
 assert.ok(currentDirect109(page(554,mexican.replace('lemongrass','cinnamon')),554).direct.some(v=>!v.matched));
 assert.ok(currentDirect109(page(555,timor.replace('raw sugar','cocoa')),555).direct.some(v=>!v.matched));
});
test('554 relative lighter roast is not an explicit Light classification',()=>{
 const p=extractPublicCoffeeFacts(page(554,mexican),{source_url:selected109[554].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(selected109FieldsOk(554,p.fields),JSON.stringify(p.fields));
});
test('555 printed Medium and all three flavor components retained; natural sweetness is not Natural process',()=>{
 const p=extractPublicCoffeeFacts(page(555,timor),{source_url:selected109[555].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(selected109FieldsOk(555,p.fields),JSON.stringify(p.fields));
});
test('sibling coffee facts must not cross into selected canonical fields',()=>{
 const p=extractPublicCoffeeFacts(page(554,mexican,'<aside><h2>Organic Timor</h2>'+timor+'</aside>'),{source_url:selected109[554].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/pineapple|orange juice|raw sugar/i.test(String(p.fields.tasting_notes||'')),JSON.stringify(p.fields));
});
