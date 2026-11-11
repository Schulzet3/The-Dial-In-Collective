import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {applyCoffeeUrlFields,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const original=[
 ['Guatemala Ella Todos Santos MEDIUM ROAST','https://www.swroasting.coffee/product/guatemala-ella-todos-santos-medium-roast/25NBJDMXCAYX4YC5XJZAYZDG','Roast: Medium. Producer: Mujeres Luchando por un Mejor Futuro. Variety: Bourbon, Caturra, Catuai. Washed. 1700-2100 masl. Chocolate.'],
 ['Colombia Camacho Rosado Extralight','https://www.swroasting.coffee/product/colombia-camacho-rosado-extralight/3JUGSMBHQMZS4BR5I5N2SDEA','Roast: Light. Process: Washed. Variety: Bourbon Rosado. Producer: Luis Edgar Camacho. 1720 masl. Sorghum and tulip tones.']
];
function html(name,url,description,body,additionalHead=''){
 return '<!doctype html><html><head><title>'+name+' | S&W Craft Roasting</title>'+
  '<meta property="og:type" content="product"><meta property="og:url" content="'+url+'">'+
  '<meta property="og:title" content="'+name+' | S&W Craft Roasting">'+
  '<meta property="og:site_name" content="S&W Craft Roasting">'+
  '<meta property="og:description" content="'+description+'">'+
  '<meta name="description" content="'+description+'">'+additionalHead+'</head><body>'+body+'</body></html>';
}
const shell='<div class="loading-view"><div class="dot-container"></div></div><div id="app"></div><noscript><iframe src="https://example.invalid"></iframe></noscript>'+
 '<script>window.__BOOTSTRAP_STATE__ = {"siteData":{"page":{"properties":{"name":"Item"}}},"commerceLinks":{"products":{}}};</script>';
for(const [name,url,description] of original){
 test('R117 selected '+name+' SEO-only app shell never certifies coffee',()=>{
  const r=extractPublicCoffeeFacts(html(name,url,description,shell),{source_url:url});
  assert.equal(r.ok,false,JSON.stringify(r));
  assert.equal(r.reason,'ambiguous_or_missing_product');
  assert.equal(coffeeUrlPreviewMarkup(r).includes('Enter the details manually'),true);
 });
}
test('R117 shell named coffee in a generic app bootstrap is not a selected Product',()=>{
 const [name,url,description]=original[0];
 const body=shell.replace('{"siteData":','{"productSuggestion":"'+name+'","otherProduct":"Some Neighbor Blend","siteData":');
 const r=extractPublicCoffeeFacts(html(name,url,description,body),{source_url:url});
 assert.equal(r.ok,false);
});
test('R117 selected visible exact product body is not suppressed by client-shell guard',()=>{
 const [name,url,description]=original[0];
 const actual='<main><article class="product"><h1>'+name+'</h1><div class="product__description"><p>Roast: Medium. Region: Todos Santos, Guatemala. Process: Washed.</p></div></article></main>'+shell;
 const r=extractPublicCoffeeFacts(html(name,url,description,actual),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(String(r.fields?.name||'').includes('Guatemala Ella'),JSON.stringify(r.fields));
});
test('R117 exact same-URL structured Product remains eligible even without visible SSR body',()=>{
 const [name,url,description]=original[1];
 const ld='<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url,description,brand:{'@type':'Brand',name:'S&W Craft Roasting'}})+'</script>';
 const r=extractPublicCoffeeFacts(html(name,url,description,shell,ld),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(String(r.fields?.name||'').includes('Colombia Camacho'),JSON.stringify(r.fields));
});
test('R117 rejected shell cannot overwrite or save previously typed coffee fields',()=>{
 const [name,url,description]=original[1];
 const r=extractPublicCoffeeFacts(html(name,url,description,shell),{source_url:url});
 const form={elements:{namedItem(){throw Error('must not touch form on rejected result');}}};
 assert.deepEqual(applyCoffeeUrlFields(form,r),{filled:0,skipped:0});
});
test('R117 unrelated URL in SEO data does not bypass shell rejection',()=>{
 const [name,url,description]=original[0];
 const other=original[1][1];
 const r=extractPublicCoffeeFacts(html(name,other,description,shell),{source_url:url});
 assert.equal(r.ok,false);
});
