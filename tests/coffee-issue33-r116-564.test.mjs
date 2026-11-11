import test from 'node:test';
import assert from 'node:assert/strict';
import {selected116,direct116,fields116Ok} from '../scripts/audit/issue33-r116-564-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const h='Yaye Arbegona ETHIOPIAN LANDRACE - WASHED Ethiopia';
const own='<p>Arbegona holds a very special place in our hearts, and each year we look forward to fall. In the cup we find watermelon, a lovely florality, and berries.</p><h3>VARIETAL</h3><p>Ethiopian Landrace</p><h3>REGION</h3><p>Arbegona, Sidama</p><h3>ALTITUDE</h3><p>2,300 masl</p><h3>HARVEST</h3><p>January 2026</p><h3>PROCESS</h3><p>Washed</p><h3>PROCESSING</h3><p>Hand-picked at peak ripeness. Floated. De-pulped. Fermented underwater for 36 hours. Dried on raised beds for 10–14 days.</p>';
const page=(body=own,extra='',heading=h)=>'<html><head><title>SEY - '+selected116.name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected116.url+'"></head><body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+body+'</div></article>'+extra+'</main></body></html>';
test('564 direct selected cup, origin, elevation, process and 2026 harvest',()=>{
 const d=direct116(page());assert.equal(d.unique,true,JSON.stringify(d));assert.ok(d.required.every(x=>x.matched),JSON.stringify(d));
});
test('564 another coffee, origin or year is not selected Yaye',()=>{
 for(const wrong of [h.replace('Yaye Arbegona','Yaye Chericho'),h.replace('Yaye Arbegona','Halo Hartume'),h.replace('Ethiopia','Colombia'),h+' 2025'])
  assert.equal(direct116(page(own,'',wrong)).unique,false,wrong);
});
test('564 ambiguous selected heading fails',()=>{
 assert.equal(direct116(page().replace('</h1>','</h1><h1>Neighbor coffee</h1>')).unique,false);
});
test('564 changed selected notes, origin, variety, process or harvest breaks direct proof',()=>{
 for(const [a,b] of [['watermelon','lychee'],['Arbegona, Sidama','Gedeb, Yirgacheffe'],['Ethiopian Landrace','Gesha'],['January 2026','January 2025'],['Fermented underwater for 36 hours','Natural sun-dried cherries']]){
  const d=direct116(page(own.replace(a,b)));assert.ok(d.required.some(x=>!x.matched),a+' '+JSON.stringify(d.required));
 }
});
test('564 menu/sidebar/review/form text cannot replace missing selected facts',()=>{
 const d=direct116(page('<p>Yaye selected.</p>','<nav>'+own+'</nav><aside>'+own+'</aside><form>'+own+'</form><h2>Customer Reviews</h2>'+own));
 assert.ok(d.required.some(x=>!x.matched),JSON.stringify(d));
});
test('564 real parser reads own washed landrace, Arbegona and watermelon florality',()=>{
 const x=extractPublicCoffeeFacts(page(),{source_url:selected116.url});
 assert.equal(x.ok,true,JSON.stringify(x));assert.ok(fields116Ok(x.fields),JSON.stringify(x.fields));
});
test('564 unrelated 2025 Yaye and Halo sidebar cannot contaminate actual fields',()=>{
 const other='<aside><h2>2025 Yaye Arbegona</h2><p>Watermelon, lychee, complex botanicals. Altitude 2230m. Halo Hartume: melon, plum, lemon verbena; Gedeb, Yirgacheffe.</p></aside>';
 const x=extractPublicCoffeeFacts(page(own,other),{source_url:selected116.url});
 assert.equal(x.ok,true,JSON.stringify(x));assert.ok(fields116Ok(x.fields),JSON.stringify(x.fields));
});
