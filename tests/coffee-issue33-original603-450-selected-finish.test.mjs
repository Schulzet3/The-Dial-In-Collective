// Source-bound #450: selected literal finish must not be lost or fabricated.
import test from 'node:test';
import assert from 'node:assert/strict';
import {refineSelectedCurrentLiteralFinish} from '../src/server/coffee-selected-description-sensory.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.buonacaffe.com/products/tanzanian-peaberry-dark-roast';
const title='Tanzanian peaberry (Dark Roast)';
const notes='Sweet Black Earth, lemon-honey start, smooth, gentle citrus';
const prose='Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a light chocolate finish.';
const clean=(s,n=6001)=>String(s||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const page=(text=prose,{name=title,listed=notes,extra=''}={})=>
 '<html><head><link rel="canonical" href="'+url+'"><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="product-description rte">'+
 '<p>Tasting Notes: '+listed+'</p><p>'+text+'</p></div></article></main>'+extra+'</body></html>';
const refine=(s,n=notes)=>refineSelectedCurrentLiteralFinish(s,{clean,notes:n});
test('exact current selected sensory sentence retains full baseline and light chocolate finish',()=>{
 const n=refine(page());
 for(const part of ['Sweet Black Earth','lemon-honey start','smooth','gentle citrus','light chocolate'])
  assert.match(n,new RegExp(part,'i'));
 assert.equal((n.match(/light chocolate/ig)||[]).length,1);
});
test('generic current coffee also retains independently printed alternative finish',()=>{
 const n='Brown sugar, hazelnut, roasted pecan';
 const html=page('Brown sugar, hazelnut; roasted pecan notes with a toasted almond finish.',
  {name:'Autumn Single Origin',listed:n});
 assert.match(refine(html,n),/toasted almond/i);
});
test('real parser and Add Coffee/Source Review preserve selected flavor',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.match(r.fields.tasting_notes||'',/light chocolate/i);
 assert.ok(!r.conflicts?.includes('tasting_notes'));
 assert.match(coffeeUrlPreviewMarkup(r),/light chocolate/i);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('related, SEO, historic, conditional, negated, irrelevant finish and missing anchors all refused',()=>{
 const aside='<aside class="related-products"><h2>Other Coffee</h2><p>'+prose+'</p></aside>';
 for(const html of [
  page('Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes.',{extra:aside}),
  page('Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes.',{extra:'<meta name="description" content="'+prose+'">'}),
  page('Previously '+prose),page('If brewed with milk, '+prose),
  page('This coffee does not have '+prose),page('Another coffee offers '+prose),
  page('Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a clean finish.'),
  page('Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a smooth finish.'),
  page('Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a light chocolate finish; only when cooled.')
 ])assert.equal(refine(html),'');
 assert.equal(refine(page(),'Cherry, peach'),'');
});
test('distinct current product headings and competing finishes cannot promote an unverified note',()=>{
 assert.equal(refine(page(prose,{extra:'<main><h1>Other Coffee</h1></main>'})),'');
 assert.equal(refine(page(prose+' Sweet Black Earth, lemon-honey start; smooth, gentle citrus notes with a vanilla finish.')),'');
 const r=extractPublicCoffeeFacts(page(prose,{listed:'Cherry, Peach'}),{source_url:url});
 assert.doesNotMatch(r.fields?.tasting_notes||'',/light chocolate/i);
});
