import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
// R47 real official source SHA256 6e5ecdc30d5db07bd8c5e9464c4ca77a99dc781bb621a1c5efc901601e717a23.
// Current #549 prints selected Origin Tanzania (Peaberry), Roast Dark, and flavor.
// Its same-page "Goes with it" card ALT names ANOTHER medium-roast coffee,
// and a review quotes someone who bought a DIFFERENT Guatemalan/medium roast.
// These synthetic fixtures reproduce the observed DOM shape, not its raw bytes.
const url='https://www.realdope.coffee/products/tanazania-peaberry';
const shell=(selected,foreign='')=>`<html><head>
<meta property="og:type" content="product"><link rel="canonical" href="${url}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Tanzania Peaberry",
"url":"${url}","brand":{"@type":"Brand","name":"Dope Coffee"}}</script>
</head><body><main><section class="light"><div class="in sec pdp">
<div class="pbuy"><h1>Tanzania Peaberry</h1><div class="pdesc">
${selected}
</div></div></div>${foreign}</section></main></body></html>`;
const direct='<p>Single-origin peaberry. Tanzania. The Creatives Coffee.</p>'+
  '<ul><li>Origin: Tanzania (Peaberry)</li><li>Roast: Dark</li>'+
  '<li>Tasting notes: Earthy · fruity · hints of cacao</li></ul>';
const unrelated=`<div class="in">
<div class="shelf-h"><h2>Goes with it</h2></div>
<div class="loved grid4"><div class="lc">
<a class="ph" href="/products/burundi-kibingo">
<img alt="Dope Coffee Burundi Kibingo medium roast coffee bag" src="/cdn/burundi.jpg"></a>
</div></div></div>
<section id="stars"><div class="starsgrid"><div class="rcards">
<div class="rcard"><span aria-label="5 out of 5 stars">★★★★★</span>
<p>“I started with the Guatemalan/medium roast and loved it.”</p></div>
</div></div></section>`;
test('R47 selected roast Dark survives unrelated bundle card Medium and other-coffee testimonial',()=>{
 const html=shell(direct,unrelated);
 const scoped=productMarkup(html);
 assert.match(scoped,/Roast: Dark/);
 assert.doesNotMatch(scoped,/Burundi Kibingo medium roast/i);
 assert.doesNotMatch(scoped,/Guatemalan\/medium roast/i);
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,'Tanzania Peaberry');
 assert.equal(p.fields.origin,'Tanzania');
 assert.equal(p.fields.roast_level,'Dark',JSON.stringify(p));
 assert.match(p.fields.tasting_notes,/earthy/i);
 assert.ok(!p.conflicts?.includes('roast_level'),JSON.stringify(p.conflicts));
 assert.match(coffeeUrlPreviewMarkup(p),/Add Coffee/);
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('R47 two genuinely contradictory direct selected Roast labels MUST remain blank and reviewable',()=>{
 const html=shell(direct+'<p>Roast: Medium</p>');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!p.fields.roast_level,'contradictory same-current-product Roast cannot be auto-chosen');
 assert.ok(p.conflicts?.includes('roast_level'),'source conflict requires member review');
 assert.match(coffeeUrlPreviewMarkup(p),/Add Coffee/);
});
test('R47 unrelated cards cannot erase an authentic later selected Product Details roast conflict',()=>{
 const html=shell(direct,unrelated+'<section><h2>Product Details</h2><p>Roast: Medium</p></section>');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!p.fields.roast_level);
 assert.ok(p.conflicts?.includes('roast_level'));
});
test('R47 generic customer quote without rating-card provenance is not blanket-deleted',()=>{
 const html=shell(direct,'<div class="rcards"><h2>Selected coffee roast information</h2><p>Roast: Medium</p></div>');
 const scoped=productMarkup(html);
 assert.match(scoped,/Roast: Medium/);
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 assert.ok(!p.fields.roast_level);
 assert.ok(p.conflicts?.includes('roast_level'));
});
