import test from 'node:test';
import assert from 'node:assert/strict';
import {selected114,selected114Direct,selected114FieldsOk} from '../scripts/audit/issue33-r114-559-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h3>Cupping notes: Red Grape, Leather, Jasmine</h3><p>Grower: Asnake Kassa</p><p>Variety: Native Heirloom</p><p>Region: Oromia, Hambela</p><p>Altitude: 2120 meters</p><p>Process: Natural</p><p>This Wush Wush is sourced from Ethiopia in the Oromia region.</p>';
const page=(story=own,extra='',name=selected114.name)=>'<html><head><title>'+name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected114.url+'"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+story+'</div></article>'+extra+'</main></body></html>';
test('559 exact selected Wush Wush H1 and own direct notes, grower, heirloom and region',()=>{
 const d=selected114Direct(page());assert.equal(d.uniqueH1,true,JSON.stringify(d));assert.ok(d.direct.every(x=>x.matched),JSON.stringify(d));
});
test('559 reused URL or duplicate H1 cannot certify a different current product',()=>{
 assert.equal(selected114Direct(page(own,'','Wush Wush from a different grower')).uniqueH1,false);
 assert.equal(selected114Direct(page().replace('</h1>','</h1><h1>Another lot</h1>')).uniqueH1,false);
});
test('559 changed direct source facts invalidate source proof',()=>{
 for(const [a,b] of [['Red Grape','Blueberry'],['Grower: Asnake Kassa','Grower: Other Farm'],['Variety: Native Heirloom','Variety: Gesha'],['Region: Oromia, Hambela','Region: Keffa']]){
  assert.ok(selected114Direct(page(own.replace(a,b))).direct.some(x=>!x.matched),a);
 }
});
test('559 SEO/menu, sibling, review and form facts do not count as own selected source',()=>{
 const noisy=page('<p>Wush Wush product</p>','<nav>'+own+'</nav><aside>'+own+'</aside><form>'+own+'</form><h2>Customer Reviews</h2>'+own);
 assert.ok(selected114Direct(noisy).direct.some(x=>!x.matched),JSON.stringify(selected114Direct(noisy)));
});
test('559 actual current parser preserves own roast, process, grower and selected tasting notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected114.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected114FieldsOk(p.fields),JSON.stringify(p.fields));
});
test('559 sibling Wush Wush roaster must not import blueberrry/nutmeg or Dinkalem producer',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<aside><h2>Related Wush Wush</h2><p>From Keffa, Dinkalem Ademe. Notes: Blueberry, Nutmeg, Frankincense, Process Washed.</p></aside>'),{source_url:selected114.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected114FieldsOk(p.fields),JSON.stringify(p.fields));
});
test('559 customer roast selectors cannot override chosen light/natural lot',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<form><option>Dark Roast</option><option>Washed</option><option>French Press Grind</option></form>'),{source_url:selected114.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected114FieldsOk(p.fields),JSON.stringify(p.fields));
});
