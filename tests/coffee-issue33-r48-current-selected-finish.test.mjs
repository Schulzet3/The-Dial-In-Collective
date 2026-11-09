import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {refineSelectedCurrentLiteralFinish} from '../src/server/coffee-selected-description-sensory.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.roc2.com/products/organic-timor';
const selected='Sourced from the highlands of Timor, this single-origin medium roast offers a bright, clean cup with natural sweetness. Lively notes of pineapple and fresh orange juice lead the way, balanced by a smooth finish of raw sugar. A well-rounded, vibrant coffee that highlights the unique character of its origin in every sip.';
const clean=(html,n=6001)=>String(html).replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ').trim().slice(0,n);
const shell=(prose,other='')=>'<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+url+'"><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name:'Organic Timor',url,brand:{'@type':'Brand',name:'ROC²'}})+'</script></head><body><main class="product"><section><h1>Organic Timor</h1><div class="product__description no-js-hidden"><p><meta charset="utf-8">'+prose+'</p></div></section></main>'+other+'</body></html>';
test('R48 real parser retains same selected note list and literal raw-sugar finish',()=>{
 const p=extractPublicCoffeeFacts(shell(selected),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,'Organic Timor');
 assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes),/pineapple/i);
 assert.match(String(p.fields.tasting_notes),/orange juice/i);
 assert.match(String(p.fields.tasting_notes),/raw sugar/i);
 assert.ok(!p.conflicts?.includes('tasting_notes'));
 assert.match(coffeeUrlPreviewMarkup(p),/Add Coffee/);
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('R48 literal selected sentence joins only direct notes and raw-sugar finish',()=>{
 assert.equal(refineSelectedCurrentLiteralFinish(shell(selected),{clean,notes:'pineapple and fresh orange juice'}),'pineapple, fresh orange juice, raw sugar');
});
test('R48 previous lot, milk and syrup qualifications must not become canonical notes',()=>{
 for(const prose of [
  selected.replace('balanced by a smooth finish of raw sugar','balanced by a smooth finish of raw sugar when served with milk'),
  selected.replace('Lively notes','Last year the previous lot had lively notes'),
  selected.replace('balanced by a smooth finish of raw sugar','balanced by a smooth finish of raw sugar if mixed with syrup')
 ])assert.equal(refineSelectedCurrentLiteralFinish(shell(prose),{clean,notes:'pineapple and fresh orange juice'}),'');
});
test('R48 a different sentence cannot donate another coffee flavor',()=>{
 const prose='Lively notes of pineapple and fresh orange juice lead the way. A competitor has a smooth finish of raw sugar.';
 assert.equal(refineSelectedCurrentLiteralFinish(shell(prose),{clean,notes:'pineapple and fresh orange juice'}),'');
});
test('R48 off-product recommendation cannot fill raw sugar',()=>{
 const html=shell('Lively notes of pineapple and fresh orange juice lead the way.','<section class="recommendations"><h2>Other Coffee</h2><p>The other coffee is balanced by a smooth finish of raw sugar.</p></section>');
 assert.equal(refineSelectedCurrentLiteralFinish(html,{clean,notes:'pineapple and fresh orange juice'}),'');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/raw sugar/i);
});
test('R48 two selected product headings fail closed',()=>{
 const html=shell(selected).replace('</main>','<h1>Other Coffee</h1></main>');
 assert.equal(refineSelectedCurrentLiteralFinish(html,{clean,notes:'pineapple and fresh orange juice'}),'');
});
