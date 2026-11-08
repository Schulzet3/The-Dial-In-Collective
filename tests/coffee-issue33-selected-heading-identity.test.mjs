import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProductHeadings,selectedProductPurchaseRootH2} from '../scripts/audit/issue33-selected-product-heading.mjs';

const animated=name=>'<h1 class="blinds-text"><div class="word">'+[...name].map((c,i)=>
 '<span class="char-clip"><span style="--i:'+i*20+'ms">'+c+'</span></span>').join('')+'</div></h1>';

test('Onyx selected 5K+ byte character-animated H1 retains its real coffee identity',()=>{
 for(const name of ['Colombia Finca Anaya Wush Wush','Ethiopia Agaro Yukro G1',
 'Mexico Finca Santa Cruz Gesha']){
  const padded=animated(name).replace('</h1>','<div>'+('<em> </em>'.repeat(320))+'</div></h1>');
  assert.ok(padded.length>1800);
  assert.deepEqual(selectedProductHeadings(padded),[name]);
 }
});
test('ordinary selected headings retain punctuation, accents, entities and upper bounds',()=>{
 assert.deepEqual(selectedProductHeadings('<h1>Perú &amp; Brasil — #1</h1>'),['Perú & Brasil — #1']);
 assert.deepEqual(selectedProductHeadings('<h1>'+('&amp;'.repeat(300))+'</h1>'),[]);
 assert.deepEqual(selectedProductHeadings('<h2>Unrelated</h2>'),[]);
});
test('partially animated, oversized or mismatched H1 cannot silently certify another coffee',()=>{
 const x=animated('Colombia Finca Anaya Wush Wush');
 assert.deepEqual(selectedProductHeadings(x.replace('class="char-clip"','class="char-clip-missing"')),[]);
 assert.deepEqual(selectedProductHeadings(animated('Different Recycled Product')),['Different Recycled Product']);
});

const pageH2=(name,extra='')=>'<main><product-root class="product-page--root"><div class="product-page--right-column">'+
 '<div class="product-page--block"><h2 class="product-page--heading">'+name+'</h2></div>'+
 '<div class="product-page--block"><form class="product-buy-buttons--form" action="/cart/add"><input name="id"></form></div>'+
 extra+'</div></product-root></main>';

test('original603 #480 selected current purchase-bound H2 is not generic SEO or related heading',()=>{
 const name='Strawberry Fields Forever (seasonal release)';
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name)),[name]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2('Different seasonal coffee')),['Different seasonal coffee']);
 assert.deepEqual(selectedProductPurchaseRootH2('<h2>'+name+'</h2>'),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name).replace('action="/cart/add"','action="/search"')),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name).replace('class="product-page--root"','class="related-products"')),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name)+pageH2(name)),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name,'<h2 class="product-page--heading">Unrelated</h2>')),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name,'<h1>Other product H1</h1>')),[]);
 assert.deepEqual(selectedProductPurchaseRootH2(pageH2(name).replace('class="product-page--heading"','class="related-products--title"')),[]);
 assert.deepEqual(selectedProductPurchaseRootH2('<div class="related-products">'+pageH2(name)+'</div>'),[]);
});
