// Issue #33: source-bound synthetic tests for original603 #480; raw official replay separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.downeastcoffee.com/products/seasonal-release';
const name='Strawberry Fields Forever (seasonal release)';
const parse=(body,seo='')=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product">'+seo+
 '</head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+body+
 '</div></article></main></body></html>',{source_url:url});
test('#480 direct selected literal tasting notes survive old SEO and unrelated blend',()=>{
 const body='<p>Strawberry Fields Forever is back, and it won\'t be here long!</p>'+
  '<p>Producers: Smallholder Farmers from Tolima, Huila & Caldas & Coopedota</p>'+
  '<p>Origin: Colombia & Costa Rica</p><p>Process: Anaerobic Co-Ferment, Washed</p>'+
  '<p>Tasting Notes: Juicy Strawberry, Dark Chocolate</p>';
 const r=parse(body,'<title>Former seasonal release</title><meta name="description" content="Archived Peru blend">');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);
 assert.match(r.fields.tasting_notes||'',/Juicy Strawberry.*Dark Chocolate/i,JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Archived Peru blend/i);
 assert.match(coffeeUrlPreviewMarkup(r),/Strawberry Fields Forever/);
});
test('#480 selected Medium Light roast outranks unrelated light-roast filter guide',()=>{
 const body='<p>Roast: Medium Light</p><p>Tasting Notes: Juicy Strawberry, Dark Chocolate</p>'+
  '<h2>How We\'re Brewing</h2><p>On the Aiden, the light roast guided brew does the work for you.</p>'+
  '<p>On a V60 at a 1:17 ratio with a medium coarse grind. As an espresso, pull at a 1:2.25 ratio with a fine grind, aiming for 26 seconds.</p>';
 const r=parse(body);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.roast_level,'Medium-Light',JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/Juicy Strawberry.*Dark Chocolate/i);
});
test('#480 two incompatible current selected tasting captions must remain reviewable, not silently chosen',()=>{
 const body='<p>Roast: Medium Light</p>'+
  '<p>Tasting Notes: Juicy Strawberries Milk Chocolate Peach</p>'+
  '<p>Strawberry Fields Forever is back, and it won\'t be here long!</p>'+
  '<p>Tasting Notes: Juicy Strawberry, Dark Chocolate</p>';
 const r=parse(body);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.tasting_notes,undefined,JSON.stringify(r.fields));
 assert.ok(r.conflicts?.includes('tasting_notes'),JSON.stringify(r));
});
test('guarded current official #480 selector uses original603 URL, actual parser and preview',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(workflow,/\[dic-issue33-twelfth1\]/);
 assert.match(workflow,/\[dic-issue33-twelfth1\]'\) && '480'/);
 const probe=readFileSync(new URL('../scripts/audit/issue33-original603-focused-source-review.mjs',import.meta.url),'utf8');
 assert.match(probe,/fetchPublicCoffeeHtml\(r.official_url/);
 assert.match(probe,/extractPublicCoffeeFacts\(res.html/);
 assert.match(probe,/coffeeUrlPreviewMarkup\(p\)/);
});
