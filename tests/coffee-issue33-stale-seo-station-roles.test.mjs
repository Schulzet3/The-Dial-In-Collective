// Issue #33: adversarial stale SEO and source-role controls tied to official
// selected products #316 and #268. Synthetic fixtures are NOT current raw HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const colombia='https://shop.justlovecoffee.com/products/colombia-honey-process';
const banko='https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia';
const parse=(html,url)=>extractPublicCoffeeFacts(html,{source_url:url});
const currentColombia='<main><article class="product"><h1>Colombia- Honey Process</h1>'+
 '<div itemprop="description"><h2>Colombia Honey Process – Light Roast</h2>'+
 '<p>Origin: Colombia</p><p>Process: Honey</p><p>Roast: Light</p>'+
 '<p>Tasting Notes: Strawberry, Orange, Floral</p></div></article></main>';

test('#316 current selected H1 and literal specs defeat unrelated old SEO page title',()=>{
 const html='<html><head><title>Uganda AA - Lifesong | Just Love Coffee Roasters</title>'+
 '<meta property="og:title" content="Uganda AA - Lifesong">'+
 '<meta property="og:type" content="product">'+
 '<link rel="canonical" href="'+colombia+'"></head><body>'+
 currentColombia+'</body></html>';
 const result=parse(html,colombia);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Colombia- Honey Process');
 assert.equal(result.fields.origin,'Colombia');
 assert.equal(result.fields.process,'Honey');
 assert.equal(result.fields.roast_level,'Light');
 assert.doesNotMatch(JSON.stringify(result.fields),/Uganda|Lifesong/i);
});

test('#316 stale SEO description cannot donate unrelated producer or geographic origin',()=>{
 const html='<html><head><meta property="og:type" content="product">'+
 '<meta property="og:title" content="Uganda AA - Lifesong">'+
 '<meta property="og:url" content="'+colombia+'">'+
 '<meta property="og:description" content="Uganda AA Lifesong coffee from Uganda. Producer: Other Estate.">'+
 '</head><body>'+currentColombia+'</body></html>';
 const result=parse(html,colombia);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Colombia- Honey Process');
 assert.equal(result.fields.origin,'Colombia');
 assert.notEqual(result.fields.producer,'Other Estate');
 assert.doesNotMatch(JSON.stringify(result.fields),/Uganda|Lifesong/i);
});

test('#268 washing station and importing partner do not become a fabricated individual farmer',()=>{
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><h1>Banko Gotiti ~ Washed // Ethiopia</h1><article class="product">'+
 '<p>Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia</p>'+
 '<p>Washed-processed heirloom varietals // 2170 masl</p>'+
 '<p>The washing station works with smallholder farmers growing Ethiopian landrace varieties.</p>'+
 '<p>We sourced this coffee from our friend Kidane Teklu of Leafy Coffee, a Denver-based importer.</p>'+
 '</article></main></body></html>';
 const result=parse(html,banko);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.notEqual(result.fields.producer,'Kidane Teklu');
 assert.notEqual(result.fields.producer,'Leafy Coffee');
 assert.doesNotMatch(String(result.fields.producer||''),/Kidane Teklu|Leafy Coffee/i);
});

const bankoNatural='https://queencitycollectivecoffee.com/products/banko-gotiti-natural-ethiopia';
const selectedBankoWithSibling=(selected,sibling)=>'<html><head><meta property="og:type" content="product">'+
 '<meta property="og:title" content="Banko Gotiti ~ '+sibling+' // Ethiopia"></head><body><main>'+
 '<article class="product"><h1>Banko Gotiti ~ '+selected+' // Ethiopia</h1>'+
 '<div itemprop="description"><p>Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia</p>'+
 '<p>'+selected+'-processed heirloom varietals // 2170 masl</p>'+
 '<p>For this '+selected.toLowerCase()+'-process lot, ripe coffee cherries are carefully handled at the washing station.</p>'+
 '</div></article><aside class="related-products" aria-label="You may also like">'+
 '<h3>Banko Gotiti ~ '+sibling+' // Ethiopia</h3>'+
 '<p>'+sibling+'-processed heirloom varietals // 2170 masl</p>'+
 '</aside></main></body></html>';

// Both official Queen City products currently exist as distinct selected
// Washed and Natural lots sharing Banko Gotiti CWS. Synthetic adversarial
// fixtures (NOT live raw captures) protect against opposite-process SEO and
// sibling recommendation cards contaminating the selected product.
test('#268 selected Washed lot resists Natural sibling card and stale Natural SEO',()=>{
 const result=parse(selectedBankoWithSibling('Washed','Natural'),banko);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Banko Gotiti ~ Washed // Ethiopia');
 assert.equal(result.fields.process,'Washed');
 assert.ok(!result.conflicts?.includes('process'),JSON.stringify(result.conflicts));
});
test('distinct selected Natural lot resists Washed sibling card and stale Washed SEO',()=>{
 const result=parse(selectedBankoWithSibling('Natural','Washed'),bankoNatural);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Banko Gotiti ~ Natural // Ethiopia');
 assert.equal(result.fields.process,'Natural');
 assert.ok(!result.conflicts?.includes('process'),JSON.stringify(result.conflicts));
});
