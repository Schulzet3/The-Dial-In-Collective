// Source-bound regression: original603 #125 Foster Sookoo current country vs old SEO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentOriginCaption} from '../src/server/coffee-selected-product-hero.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://coffee-example.com/products/sookoo-ethiopia';
const h1='<h1 class="product__title">Sookoo (Ethiopia)</h1>';
const current=value=>'<div class="coffee-fact"><div class="coffee-fact__label">Current origin</div><div class="coffee-fact__value">'+value+'</div></div>';
const product=(value='Ethiopia',extra='')=>'<main><article class="product"><product-sticky>'+h1+
 '<div class="coffee-facts">'+current(value)+extra+'</div></product-sticky></article></main>';
const parse=body=>{
 const seo='Region: Guji, Ethiopia. Producer: Sookoo Coffee.';
 const head='<meta property="og:type" content="product"><meta property="og:title" content="Sookoo (Ethiopia)">'+
 '<meta property="og:url" content="'+url+'"><meta property="og:description" content="'+seo+'">';
 const ld={'@context':'https://schema.org','@type':'Product',name:'Sookoo (Ethiopia)',url,description:seo};
 return extractPublicCoffeeFacts('<html><head>'+head+'<script type="application/ld+json">'+JSON.stringify(ld)+
 '</script></head><body>'+body+'</body></html>',{source_url:url});
};
test('exact selected H1 and one current origin country caption',()=>{
 assert.deepEqual(selectedCurrentOriginCaption(product(),{name:'Sookoo (Ethiopia)'}),{origin:'Ethiopia'});
});
test('current selected caption outranks finer region available only in SEO',()=>{
 const r=parse(product());assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Ethiopia',JSON.stringify(r));
 assert.equal(r.conflicts?.includes('origin'),undefined);
});
test('current visibly printed region cannot be removed',()=>{
 const r=parse(product('Ethiopia','<p>Region: Guji, Ethiopia</p>'));
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(r.fields.origin,JSON.stringify(r));
});
test('related products and other selected identities cannot donate a country',()=>{
 const outside='<aside><article><product-sticky>'+current('Kenya')+'</product-sticky></article></aside>';
 assert.deepEqual(selectedCurrentOriginCaption(product()+outside,{name:'Sookoo (Ethiopia)'}),{origin:'Ethiopia'});
 assert.equal(selectedCurrentOriginCaption(product()+outside,{name:'Other Coffee'}),null);
});
test('duplicate selected country captions, invalid country and duplicate H1 fail closed',()=>{
 assert.equal(selectedCurrentOriginCaption(product('Ethiopia',current('Kenya')),{name:'Sookoo (Ethiopia)'}),null);
 assert.equal(selectedCurrentOriginCaption(product('Roaster USA'),{name:'Sookoo (Ethiopia)'}),null);
 assert.equal(selectedCurrentOriginCaption(product()+h1,{name:'Sookoo (Ethiopia)'}),null);
});
test('caption without exact same-product boundary fails closed',()=>{
 assert.equal(selectedCurrentOriginCaption(h1+current('Ethiopia'),{name:'Sookoo (Ethiopia)'}),null);
});
