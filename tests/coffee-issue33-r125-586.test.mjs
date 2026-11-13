import test from 'node:test';
import assert from 'node:assert/strict';
import {selected125,selected125CurrentSource} from '../scripts/audit/issue33-r125-586-check.mjs';
const top='<h2>Dedication</h2><h3>An Extraordinary Process</h3><p>Alma Negra Natural</p><p>Oscar and Francisca Chacón, Central Valley</p><p>Cooked Cranberry • Toffee • Spices • Fresh Watermelon</p><p>Varieties: Catuaí & San Isidro</p>';
const bottom='<h3>Variety</h3><p>Catuai & Caturra</p><h3>Process</h3><p>Honey Processed</p><h3>The Cup</h3><p>Notes: peach, clementine, honey, lemon, strawberry and brown sugar</p><p>Tarrazu, Costa Rica</p>';
const page=(body=top+bottom,h1=selected125.name,extra='')=>'<html><head><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected125.url,description:'Dedication- Costa Rica'})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section>'+body+'</section></article>'+extra+'</main></body></html>';
test('both contradictory source process and variety statements captured',()=>{
 const r=selected125CurrentSource(page());assert.equal(r.exactSelectedHeading,true);assert.equal(r.conflictPrinted,true);
});
test('same selected source contains two different direct sensory sets',()=>{
 const r=selected125CurrentSource(page());assert.equal(r.top.notes,true);assert.equal(r.bottom.notes,true);
});
test('same selected product contains two divergent geographical descriptions',()=>{
 const r=selected125CurrentSource(page());assert.equal(r.top.origin,true);assert.equal(r.bottom.origin,true);
});
test('a changed selected H1 cannot certify original coffee',()=>assert.equal(selected125CurrentSource(page(top+bottom,'Different coffee')).exactSelectedHeading,false));
test('only first direct set is not a proven contradiction',()=>{
 const r=selected125CurrentSource(page(top));assert.equal(r.top.process,true);assert.equal(r.bottom.process,false);assert.equal(r.conflictPrinted,false);
});
test('only second direct set is not a proven contradiction',()=>{
 const r=selected125CurrentSource(page(bottom));assert.equal(r.top.process,false);assert.equal(r.bottom.process,true);assert.equal(r.conflictPrinted,false);
});
test('foreign navigation and sibling aside cannot fabricate contradiction',()=>{
 const r=selected125CurrentSource(page(top,selected125.name,'<nav>'+bottom+'</nav><aside>'+bottom+'</aside>'));
 assert.equal(r.conflictPrinted,false);
});
test('unrelated footer SEO cannot invent chosen product properties',()=>{
 const r=selected125CurrentSource(page(top,selected125.name,'<footer>'+bottom+'</footer>'));
 assert.equal(r.conflictPrinted,false);
});
