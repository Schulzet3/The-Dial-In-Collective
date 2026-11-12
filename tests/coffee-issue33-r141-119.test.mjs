import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen119,selected119Source} from '../scripts/audit/issue33-r141-119-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';
const composition=chosen119.components[0]+', '+chosen119.components[1]+', and '+chosen119.components[2];
const current='<p>'+composition+'</p><p>Dark Roast: A darker roast that emits full-bodied flavors with notes of Brown Ale, Tobacco Smoke and Molasses.</p>';
const html=(own=current,name='radiate',extra='',seo='Old Colombia Nicaragua Indonesia blend')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="product__description">'+own+'</div></article></main>'+extra+'</body></html>';
const direct=s=>selected119Source(s).direct;
test('#119 current chosen three components and tastes',()=>assert.ok(Object.values(direct(html())).every(Boolean)));
test('#119 selected H1 identity cannot be borrowed from old slug',()=>assert.equal(selected119Source(html(current,'Other radiate')).exactH1,false));
test('#119 absent Colombia component cannot come from navigation',()=>{
 const src=html(current.replace(chosen119.components[0],'missing component'),'radiate','<nav>'+current+'</nav>');
 assert.equal(direct(src).colombiaWashed,false);
});
test('#119 absent Guatemala component cannot come from related aside',()=>{
 const src=html(current.replace(chosen119.components[1],'missing component'),'radiate','<aside>'+current+'</aside>');
 assert.equal(direct(src).guatemalaWashed,false);
});
test('#119 absent selected Sumatra semi-washed cannot come from footer',()=>{
 const src=html(current.replace(chosen119.components[2],'missing component'),'radiate','<footer>'+current+'</footer>');
 assert.equal(direct(src).sumatraSemiWashed,false);
});
test('#119 missing dark roast cannot come from header',()=>{
 const src=html(current.replace('Dark Roast','Roast unpublished'),'radiate','<header>Dark Roast</header>');
 assert.equal(direct(src).dark,false);
});
test('#119 missing molasses cannot come from old page script',()=>{
 const src=html(current.replace('Molasses','unpublished'),'radiate','<script>'+current+'</script>');
 assert.equal(direct(src).molasses,false);
});
test('#119 missing smoke cannot come from unrelated template',()=>{
 const src=html(current.replace('Tobacco Smoke','unpublished'),'radiate','<template>'+current+'</template>');
 assert.equal(direct(src).tobaccoSmoke,false);
});
test('#119 incomplete third item is NOT complete composition',()=>{
 assert.equal(direct(html(current.replace(', and '+chosen119.components[2],''))).exactOrderedComposition,false);
});
test('#119 reordered list does not certify current exact sequence',()=>{
 const replacement=chosen119.components[2]+', '+chosen119.components[1]+', and '+chosen119.components[0];
 assert.equal(direct(html(current.replace(composition,replacement))).exactOrderedComposition,false);
});
test('#119 mixed washed and semi-washed cannot become single Washed',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:chosen119.url});
 assert.equal(p.ok,true);
 assert.ok(!['washed','natural','honey','anaerobic'].includes(String(p.fields?.process||'').toLowerCase()),JSON.stringify(p.fields));
});
test('#119 outdated Nicaragua metadata cannot become selected origin',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:chosen119.url});
 assert.equal(p.ok,true);
 assert.ok(!/nicaragua/i.test(String(p.fields?.origin||'')),JSON.stringify(p.fields));
});
test('#119 stale hidden same-SKU text cannot become visible blend composition',()=>{
 const old='Colombia FTO La Jacoba (Washed Process), Nicaragua Matagalpa (Washed Process), Indonesia Sumatra (Washed Process)';
 const wrapped='<span data-sheets-value="'+JSON.stringify({2:old}).replace(/"/g,'&quot;')+'">'+composition+'</span>'+
 '<p>Dark Roast: A darker roast that emits full-bodied flavors with notes of Brown Ale, Tobacco Smoke and Molasses.</p>';
 const p=extractPublicCoffeeFacts(html(wrapped),{source_url:chosen119.url});
 assert.equal(p.ok,true);
 assert.ok(!/nicaragua/i.test(String(p.fields?.origin||'')),JSON.stringify(p.fields));
 assert.ok(!['washed','natural','honey','anaerobic'].includes(String(p.fields?.process||'').toLowerCase()),JSON.stringify(p.fields));
});

test('#119 exact selected three origin components including literal island are retained',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:chosen119.url});
 assert.equal(p.ok,true);
 assert.ok(String(p.fields?.origin||'').includes('Colombia'),JSON.stringify(p.fields));
 assert.ok(String(p.fields?.origin||'').includes('Guatemala'),JSON.stringify(p.fields));
 assert.ok(String(p.fields?.origin||'').includes('Sumatra'),JSON.stringify(p.fields));
 assert.ok(!/\b(?:Nicaragua|Indonesia)\b/i.test(String(p.fields?.origin||'')),JSON.stringify(p.fields));
});
test('generic region-start blend component preserves only explicitly named geography',()=>{
 const blend=extractCoffeeBlendEvidence(html().replace(composition,composition.replace('Sumatra - Gayo Triple Picked','Bali - Kintamani')),{name:'radiate'});
 assert.ok(blend, 'selected complete components must be interpreted');
 assert.ok(blend.origin.includes('Bali'),JSON.stringify(blend));
 assert.ok(!blend.origin.includes('Indonesia'),JSON.stringify(blend));
 assert.equal(blend.components,3);
 assert.equal(blend.complete_process,false);
});
test('a fake geographic adjective is not promoted as a named region',()=>{
 const fake=html().replace(composition,composition.replace('Sumatra - Gayo Triple Picked','Sumatra-style Gayo'));
 const blend=extractCoffeeBlendEvidence(fake,{name:'radiate'});
 assert.ok(!blend?.origin?.includes('Sumatra'),JSON.stringify(blend));
});
test('an unpublished fictional island name cannot create a complete source-backed blend',()=>{
 const fake=html().replace(composition,composition.replace('Sumatra - Gayo Triple Picked','Imaginary Island - Gayo'));
 const blend=extractCoffeeBlendEvidence(fake,{name:'radiate'});
 assert.ok(!blend?.origin?.includes('Imaginary Island'),JSON.stringify(blend));
});
test('selected region-only list not borrowed from unrelated carousel',()=>{
 const incomplete=html(current.replace(chosen119.components[2],'coffee details unavailable'),'radiate',
   '<aside class="product-recommendations">'+current+'</aside>');
 const p=extractPublicCoffeeFacts(incomplete,{source_url:chosen119.url});
 assert.ok(!String(p.fields?.origin||'').includes('Sumatra'),JSON.stringify(p.fields));
});
