import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen167,selected167Source} from '../scripts/audit/issue33-r151-167-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const facts='<span class="product-tag">MICRO-LOT</span>'+
 '<p>A delicate and elegant coffee with floral, chamomile, tea, yellow fruit, and brown sugar notes. Clean, sweet, and beautifully balanced.</p>';
const page=(own=facts,h1=chosen167.name,elsewhere='',seo='Iwana Pink Bourbon Washed Process')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<header>100% COLOMBIAN COFFEE — all bags</header><main><article class="product"><h1>'+h1+
 '</h1><div class="woocommerce-product-details__short-description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
test('#167 current exact H1 and direct selected MICRO-LOT flavor and balance',()=>{
 const x=selected167Source(page());
 assert.equal(x.exactSelectedTitle,true,JSON.stringify(x));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#167 different selected bag or new lot cannot authenticate old official item',()=>{
 for(const name of ['Maragogipe – Washed Process','PINK BOURBON – Natural Process','Pink Bourbon 2027']){
  assert.equal(selected167Source(page(facts,name)).exactSelectedTitle,false,name);
 }
});
test('#167 an SEO page title cannot replace a different chosen H1',()=>{
 assert.equal(selected167Source(page(facts,'TABi – Natural Process','',chosen167.name)).exactSelectedTitle,false);
});
test('#167 unrelated footer cannot supply missing selected flavors',()=>{
 const x=selected167Source(page(facts.replace('floral, chamomile, tea, yellow fruit, and brown sugar notes','notes not published'),
  chosen167.name,'<footer>'+facts+'</footer>'));
 assert.equal(x.direct.flavor_prose,false);
});
test('#167 related aside cannot fill selected micro-lot badge',()=>{
 const x=selected167Source(page(facts.replace('MICRO-LOT',''),chosen167.name,'<aside>'+facts+'</aside>'));
 assert.equal(x.direct.release_label,false);
});
test('#167 unrelated hidden template cannot supply selected balance description',()=>{
 const x=selected167Source(page(facts.replace('Clean, sweet, and beautifully balanced','No description'),
  chosen167.name,'<template>'+facts+'</template>'));
 assert.equal(x.direct.balance,false);
});
test('#167 navigation cannot supply selected flavor note list',()=>{
 const x=selected167Source(page(facts.replace('floral, chamomile, tea, yellow fruit, and brown sugar notes','notes unpublished'),
  chosen167.name,'<nav>'+facts+'</nav>'));
 assert.equal(x.direct.flavor_prose,false);
});
test('#167 company-wide Colombian header cannot certify selected coffee origin',()=>{
 const x=selected167Source(page());
 assert.ok(x.direct.flavor_prose);
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen167.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.origin,undefined,JSON.stringify(p.fields));
});
test('#167 actual parser preserves selected washed process and coffee identity',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen167.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen167.name);
 assert.equal(p.fields.process,'Washed',JSON.stringify(p.fields));
});
test('#167 actual parser does not invent roast/decaf from selected sensory language',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen167.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#167 related product cards cannot supply geography or roast',()=>{
 const unrelated='<section class="related products"><h2>Related products</h2><div class="products">'+
  '<article><h2>Other Coffee 2026 Colombia Medium Dark Roast</h2><p>Producer: Other Farm, Elevation: 1800</p></article></div></section>';
 const p=extractPublicCoffeeFacts(page(facts,chosen167.name,unrelated),{source_url:chosen167.url});
 assert.ok(p.ok!==true || (!p.fields?.roast_level&&!p.fields?.producer&&!p.fields?.origin),JSON.stringify(p));
});
test('#167 hostile other-coffee SEO must fail closed or exclude injected tasting fields',()=>{
 const p=extractPublicCoffeeFacts(page(facts,chosen167.name,'','Other Coffee Colombia Natural Strawberry Dark Roast'),
  {source_url:chosen167.url});
 assert.ok(p.ok!==true||(!p.fields?.roast_level&&!String(p.fields?.tasting_notes||'').includes('Strawberry')),JSON.stringify(p));
});
test('#167 neutral SEO retains exact source identity and direct notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen167.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(['floral','chamomile','yellow fruit','brown sugar'].every(x=>
  String(p.fields.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p.fields));
});

const elementor=(title=chosen167.name,{post='2194',button='2194',action=chosen167.url,desc=true,extra=''}={})=>
 '<html><head><title>Old unrelated SEO</title></head><body><main>'+
 '<div data-elementor-type="product" class="elementor elementor-location-single post-'+post+' product type-product">'+
 '<div class="elementor-widget-woocommerce-product-title" data-widget_type="woocommerce-product-title.default">'+
 '<h2 class="product_title entry-title">'+title+'</h2></div>'+
 (desc?'<div class="elementor-widget-woocommerce-product-content" data-widget_type="woocommerce-product-content.default">'+facts+'</div>':'')+
 '<form class="cart" action="'+action+'"><button name="add-to-cart" value="'+button+
 '" class="single_add_to_cart_button">Add to cart</button></form></div>'+extra+'</main></body></html>';
test('#167 H1-free Elementor selected H2 purchase bound to exact own coffee',()=>{
 const x=selected167Source(elementor());assert.deepEqual(x.headings,[]);
 assert.deepEqual(x.purchaseH2,[chosen167.name]);assert.equal(x.exactSelectedTitle,true,JSON.stringify(x));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#167 another selected H2 cannot be rescued by old SEO and related cards',()=>{
 for(const title of ['Maragogipe – Washed Process','PINK BOURBON – Natural Process'])
  assert.equal(selected167Source(elementor(title,{extra:'<aside><h2>'+chosen167.name+'</h2></aside>'})).exactSelectedTitle,false);
});
test('#167 mismatched cart ID, URL or absent selected description fails closed',()=>{
 for(const o of [{button:'2199'},{post:'2199'},{action:'https://iwanacoffee.com/product/tabi-natural-process'},{desc:false}])
  assert.equal(selected167Source(elementor(chosen167.name,o)).exactSelectedTitle,false,JSON.stringify(o));
});
test('#167 two selected product roots with independent carts are ambiguous',()=>{
 const extra='<div data-elementor-type="product" class="elementor elementor-location-single post-9999 product">'+
 '<div class="elementor-widget-woocommerce-product-title" data-widget_type="woocommerce-product-title.default">'+
 '<h2 class="product_title entry-title">Other</h2></div>'+
 '<div class="elementor-widget-woocommerce-product-content" data-widget_type="woocommerce-product-content.default"><p>Other coffee</p></div>'+
 '<form class="cart" action="'+chosen167.url+'"><button name="add-to-cart" value="9999" class="single_add_to_cart_button">Buy</button></form></div>';
 assert.equal(selected167Source(elementor(chosen167.name,{extra})).exactSelectedTitle,false);
});
