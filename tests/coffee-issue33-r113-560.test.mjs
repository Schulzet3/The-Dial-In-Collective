import test from 'node:test';
import assert from 'node:assert/strict';
import {selected113,selected113Direct,selected113FieldsOk} from '../scripts/audit/issue33-r113-560-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h3>Cupping notes: Orange Blossom, Pecan, Honey</h3><p>Farm: Vides 58</p><p>Region: Huehuetenango</p><p>Altitude: 1,550m+</p><p>Process: Washed</p><p>Certifications: Direct Trade</p><p>Vides 58 is a family producer in Huehuetenango, Guatemala.</p>';
const page=(story=own,extra='',name=selected113.name)=>'<html><head><title>'+name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected113.url+'"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+story+'</div></article>'+extra+'</main></body></html>';
test('560 exact selected H1 and own direct source fields',()=>{
 const d=selected113Direct(page());assert.equal(d.uniqueH1,true,JSON.stringify(d));assert.ok(d.direct.every(x=>x.matched),JSON.stringify(d));
});
test('560 reused Guatemala slug or duplicate current H1 is not certified',()=>{
 assert.equal(selected113Direct(page(own,'','Unrelated Guatemala')).uniqueH1,false);
 assert.equal(selected113Direct(page().replace('</h1>','</h1><h1>Unrelated Roast</h1>')).uniqueH1,false);
});
test('560 direct field change rejects contradictory new source',()=>{
 for(const [a,b] of [['Orange Blossom','Other note'],['Farm: Vides 58','Farm: Different farm'],['Process: Washed','Process: Natural']]){
  assert.ok(selected113Direct(page(own.replace(a,b))).direct.some(x=>!x.matched),a);
 }
});
test('560 menu, form, SEO and reviews cannot supply product source proof',()=>{
 const noisy=page('<p>Guatemala selected</p>','<nav>'+own+'</nav><aside>'+own+'</aside><form>'+own+'</form><h2>Customer Reviews</h2>'+own);
 assert.ok(selected113Direct(noisy).direct.some(x=>!x.matched),JSON.stringify(selected113Direct(noisy)));
});
test('560 actual source parser keeps selected Guatemala, Vides 58, Washed and cup notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected113.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected113FieldsOk(p.fields),JSON.stringify(p.fields));
});
test('560 sibling Ethiopia flavor and farm cannot populate chosen Guatemala',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<aside><h2>Wush Wush Ethiopia</h2><p>Farm: Asnake Kassa. Process: Natural. Notes: Leather, Jasmine, Red Grape.</p></aside>'),{source_url:selected113.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.doesNotMatch(String(p.fields.producer||''),/Asnake/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/leather|jasmine|red grape/i);assert.equal(p.fields.process,'Washed',JSON.stringify(p.fields));
});
test('560 selectable light roast profile does not change direct product identity or process',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<form><select><option>Light Roast</option><option>French Roast</option><option>Fine Espresso Grind</option></select></form>'),{source_url:selected113.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.process,'Washed',JSON.stringify(p.fields));
 assert.ok(!/ethiopia/i.test(String(p.fields.origin||'')),JSON.stringify(p.fields));
});
