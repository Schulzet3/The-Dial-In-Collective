import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen166,selected166Source} from '../scripts/audit/issue33-r150-166-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const facts='<span class="product-tag">MICRO-LOT</span>'+
 '<p>A refined and aromatic coffee with notes of wildflowers, black tea, apple, green grapes, and spices. Silky, balanced, and pleasantly bright.</p>';
const page=(own=facts,h1=chosen166.name,elsewhere='',seo='Iwana Maragogipe Washed Process')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<header>100% COLOMBIAN COFFEE — all bags</header><main><article class="product"><h1>'+h1+
 '</h1><div class="woocommerce-product-details__short-description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
test('#166 current exact H1 and direct selected MICRO-LOT flavor and balance',()=>{
 const x=selected166Source(page());
 assert.equal(x.exactSelectedTitle,true,JSON.stringify(x));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#166 different selected bag or new lot cannot authenticate old official item',()=>{
 for(const name of ['PINK BOURBON – Washed Process','Maragogipe – Natural Process','Maragogipe 2027']){
  assert.equal(selected166Source(page(facts,name)).exactSelectedTitle,false,name);
 }
});
test('#166 an SEO page title cannot replace a different chosen H1',()=>{
 assert.equal(selected166Source(page(facts,'TABi – Natural Process','',chosen166.name)).exactSelectedTitle,false);
});
test('#166 unrelated footer cannot supply missing selected flavors',()=>{
 const x=selected166Source(page(facts.replace('notes of wildflowers, black tea, apple, green grapes, and spices','notes not published'),
  chosen166.name,'<footer>'+facts+'</footer>'));
 assert.equal(x.direct.flavor_prose,false);
});
test('#166 related aside cannot fill selected micro-lot badge',()=>{
 const x=selected166Source(page(facts.replace('MICRO-LOT',''),chosen166.name,'<aside>'+facts+'</aside>'));
 assert.equal(x.direct.release_label,false);
});
test('#166 unrelated hidden template cannot supply selected balance description',()=>{
 const x=selected166Source(page(facts.replace('Silky, balanced, and pleasantly bright','No description'),
  chosen166.name,'<template>'+facts+'</template>'));
 assert.equal(x.direct.balance,false);
});
test('#166 navigation cannot supply selected flavor note list',()=>{
 const x=selected166Source(page(facts.replace('notes of wildflowers, black tea, apple, green grapes, and spices','notes unpublished'),
  chosen166.name,'<nav>'+facts+'</nav>'));
 assert.equal(x.direct.flavor_prose,false);
});
test('#166 company-wide Colombian header cannot certify selected coffee origin',()=>{
 const x=selected166Source(page());
 assert.ok(x.direct.flavor_prose);
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen166.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.origin,undefined,JSON.stringify(p.fields));
});
test('#166 actual parser preserves selected washed process and coffee identity',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen166.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen166.name);
 assert.equal(p.fields.process,'Washed',JSON.stringify(p.fields));
});
test('#166 actual parser does not invent roast/decaf from selected sensory language',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen166.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#166 related product cards cannot supply geography or roast',()=>{
 const unrelated='<section class="related products"><h2>Related products</h2><div class="products">'+
  '<article><h2>Pink Bourbon 2026 Colombia Medium Dark Roast</h2><p>Producer: Other Farm, Elevation: 1800</p></article></div></section>';
 const p=extractPublicCoffeeFacts(page(facts,chosen166.name,unrelated),{source_url:chosen166.url});
 assert.ok(p.ok!==true || (!p.fields?.roast_level&&!p.fields?.producer&&!p.fields?.origin),JSON.stringify(p));
});
test('#166 hostile other-coffee SEO must fail closed or exclude injected tasting fields',()=>{
 const p=extractPublicCoffeeFacts(page(facts,chosen166.name,'','Pink Bourbon Colombia Natural Strawberry Dark Roast'),
  {source_url:chosen166.url});
 assert.ok(p.ok!==true||(!p.fields?.roast_level&&!String(p.fields?.tasting_notes||'').includes('Strawberry')),JSON.stringify(p));
});
test('#166 neutral SEO retains exact source identity and direct notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen166.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(['wildflowers','black tea','green grapes','spices'].every(x=>
  String(p.fields.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p.fields));
});

const elementor=(title=chosen166.name,{post='2194',button='2194',action=chosen166.url,desc=true,extra=''}={})=>
 '<html><head><title>Old unrelated SEO</title></head><body><main>'+
 '<div data-elementor-type="product" class="elementor elementor-location-single post-'+post+' product type-product">'+
 '<div class="elementor-widget-woocommerce-product-title" data-widget_type="woocommerce-product-title.default">'+
 '<h2 class="product_title entry-title">'+title+'</h2></div>'+
 (desc?'<div class="elementor-widget-woocommerce-product-content" data-widget_type="woocommerce-product-content.default">'+facts+'</div>':'')+
 '<form class="cart" action="'+action+'"><button name="add-to-cart" value="'+button+
 '" class="single_add_to_cart_button">Add to cart</button></form></div>'+extra+'</main></body></html>';
test('#166 H1-free Elementor selected H2 purchase bound to exact own coffee',()=>{
 const x=selected166Source(elementor());assert.deepEqual(x.headings,[]);
 assert.deepEqual(x.purchaseH2,[chosen166.name]);assert.equal(x.exactSelectedTitle,true,JSON.stringify(x));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#166 another selected H2 cannot be rescued by old SEO and related cards',()=>{
 for(const title of ['PINK BOURBON – Washed Process','Maragogipe – Natural Process'])
  assert.equal(selected166Source(elementor(title,{extra:'<aside><h2>'+chosen166.name+'</h2></aside>'})).exactSelectedTitle,false);
});
test('#166 mismatched cart ID, URL or absent selected description fails closed',()=>{
 for(const o of [{button:'2199'},{post:'2199'},{action:'https://iwanacoffee.com/product/tabi-natural-process'},{desc:false}])
  assert.equal(selected166Source(elementor(chosen166.name,o)).exactSelectedTitle,false,JSON.stringify(o));
});
test('#166 two selected product roots with independent carts are ambiguous',()=>{
 const extra='<div data-elementor-type="product" class="elementor elementor-location-single post-9999 product">'+
 '<div class="elementor-widget-woocommerce-product-title" data-widget_type="woocommerce-product-title.default">'+
 '<h2 class="product_title entry-title">Other</h2></div>'+
 '<div class="elementor-widget-woocommerce-product-content" data-widget_type="woocommerce-product-content.default"><p>Other coffee</p></div>'+
 '<form class="cart" action="'+chosen166.url+'"><button name="add-to-cart" value="9999" class="single_add_to_cart_button">Buy</button></form></div>';
 assert.equal(selected166Source(elementor(chosen166.name,{extra})).exactSelectedTitle,false);
});
