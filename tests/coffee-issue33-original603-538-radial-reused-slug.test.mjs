// Issue #33 original603 #538. Current exact selected Radial Guatemala coffee lives at a reused Colombia URL.
// Synthetic identity/SEO/related-product regression; the official raw-HTML/parser check is separate CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {readFileSync} from 'node:fs';

const url = 'https://www.radialcoffee.com/products/colombia-pablo-eva-del-cid';
const title = 'Guatemala — Pablo & Eva Del Cid';
const selectedText = '<p>Washed Process</p><p>Light Roast</p>'
 + '<p>Pablo Del Cid, along with his wife Eva have committed to producing exceptional coffees in Pablo’s home town of Santa Elena Barillas, Guatemala. Their attention to detail and quality can be tasted in this beautiful offering.</p>'
 + '<p>Featuring notes of praline, nougat and a hint of raspberry fruitiness, this is a coffee that should not be missed.</p>';
const parse = ({seo='',related='',body=selectedText}={}) => extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product">'+seo+'</head><body>'
 + '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+body+'</div></article>'
 + related + '</main></body></html>',{source_url:url});

test('#538 selected current Guatemala H1, producer and present farm town outrank recycled Colombia URL',()=>{
 const r=parse();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
 assert.equal(r.fields.roast_level,'Light',JSON.stringify(r.fields));
 assert.match(r.fields.origin||'',/Santa Elena Barillas.*Guatemala/i,JSON.stringify(r.fields));
 assert.match(r.fields.producer||'',/Pablo/i,JSON.stringify(r.fields));
 assert.match(r.fields.tasting_notes||'',/praline.*nougat.*raspberry/i,JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Colombia|Arquimedes|Espana/i);
 assert.match(coffeeUrlPreviewMarkup(r),/Guatemala/);
});

test('#538 stale same-route Colombia SEO and unrelated suggested Colombian product never override selected coffee',()=>{
 const r=parse({seo:'<title>Old Colombia — Pablo & Eva Del Cid</title><meta name="description" content="Colombia coffee from Arquimedes Espana">',
 related:'<aside><h2>You may also like</h2><h3>Colombia- Arquimedes Espana</h3><p>Colombian single origin, Washed, Dark Roast and a caramel finish.</p></aside>'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.match(r.fields.origin||'',/Guatemala/i,JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Colombia|Arquimedes|Espana/i);
 assert.notEqual(r.fields.roast_level,'Dark',JSON.stringify(r.fields));
 assert.ok(!r.conflicts?.includes('origin'),JSON.stringify(r.conflicts));
});

test('#538 negative: absent selected town must not be fabricated from old SEO or related product',()=>{
 const r=parse({body:'<p>Washed Process</p><p>Light Roast</p><p>Our coffee is balanced and clean.</p>',
 seo:'<meta name="description" content="Colombia El Del Cid farm in Santa Elena Barillas">',related:'<aside>Try Colombia- Arquimedes Espana</aside>'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.doesNotMatch(JSON.stringify(r.fields),/Arquimedes|Espana|Colombia/i);
 assert.ok(!/Santa Elena Barillas/i.test(r.fields.origin||''),JSON.stringify(r.fields));
});

test('#538 workflow dispatch remains one bounded official current selected identity, with no new network client',()=>{
 const flow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(flow,/\[dic-issue33-thirtieth1\]/);
 assert.match(flow,/\[dic-issue33-thirtieth1\]'\) && '538'/);
 const script=readFileSync(new URL('../scripts/audit/issue33-original603-focused-source-review.mjs',import.meta.url),'utf8');
 assert.match(script,/fetchPublicCoffeeHtml\(r\.official_url/);
 assert.match(script,/extractPublicCoffeeFacts\(res\.html/);
 assert.match(script,/coffeeUrlPreviewMarkup\(p\)/);
});
