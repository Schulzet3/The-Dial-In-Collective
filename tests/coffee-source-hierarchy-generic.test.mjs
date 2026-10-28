import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://roaster.example/products/selected-current-coffee';
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const source=({description='',body='',ogDescription='',metaFields={},name='Selected Current Coffee',seoName=name,urlOverride=url}={})=>{
 const product={'@context':'https://schema.org','@type':'Product',name,url,description};
 const meta='<meta property="og:title" content="'+esc(seoName)+'"><meta property="og:url" content="'+esc(urlOverride)+'"><meta property="og:description" content="'+esc(ogDescription)+'">'+
  Object.entries(metaFields).map(([key,value])=>'<meta name="product:'+key+'" content="'+esc(value)+'">').join('');
 return '<html><head>'+meta+'<script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body><main><h1>'+esc(name)+'</h1>'+body+'</main></body></html>';
};
const parse=opts=>extractPublicCoffeeFacts(source(opts),{source_url:url});

test('selected description wins over stale same-page SEO processing, producer and origin',()=>{
 const result=parse({description:'<p>Process: Washed</p><p>Producer: Ana Lopez</p><p>Country: Colombia</p>',
  ogDescription:'Older Honduras coffee processed Natural',metaFields:{process:'Natural',producer:'Old Estate',origin:'Honduras'}});
 assert.equal(result.ok,true);
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.producer,'Ana Lopez');
 assert.equal(result.fields.origin,'Colombia');
 assert.ok(!result.conflicts?.length);
 assert.equal(result.seo_fallback_fields,undefined);
});
test('visible selected product description block outranks conflicting old metadata',()=>{
 const result=parse({body:'<section class="product-description"><h2>Coffee Description</h2><p>Process: Washed</p><p>Origin: Colombia</p><p>Tasting notes: Floral, Peach, Honey</p></section>',
  metaFields:{process:'Natural',origin:'Peru',tasting_notes:'Chocolate, Hazelnut'}});
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.origin,'Colombia');
 assert.equal(result.fields.tasting_notes,'Floral, Peach, Honey');
 assert.ok(!result.conflicts?.length);
});
test('genuinely conflicting direct selected descriptions require user review',()=>{
 const result=parse({description:'Process: Washed',body:'<p>Process: Natural</p>',metaFields:{process:'Honey'}});
 assert.equal(result.fields.process,undefined);
 assert.ok(result.conflicts?.includes('process'));
 assert.deepEqual(new Set(result.conflict_options?.process?.map(x=>x.value)),new Set(['Washed','Natural']));
 assert.match(coffeeUrlPreviewMarkup({...result,source_url:url}),/Review conflicting details/);
});
test('last resort metadata is visibly labeled and retained in source review',()=>{
 const result=parse({metaFields:{process:'Natural'}});
 assert.equal(result.fields.process,'Natural');
 assert.ok(result.seo_fallback_fields?.includes('process'));
 const preview={...result,source_url:url};
 assert.match(coffeeUrlPreviewMarkup(preview),/Verify metadata-only suggestions/);
 assert.match(coffeeUrlPreviewMarkup(preview),/Not found on this product page/);
 const saved=coffeeSourceReviewSnapshot(preview,{checkedAt:'2026-10-28T00:00:00Z'});
 assert.ok(saved?.seo_fallback_fields?.includes('process'));
});
test('stale or unrelated SEO product identity cannot fill missing current fields',()=>{
 for(const override of [{seoName:'Other Coffee'}, {urlOverride:'https://roaster.example/products/other-coffee'}]){
  const result=parse({...override,metaFields:{process:'Natural',producer:'Historic Producer'}});
  assert.equal(result.fields.process,undefined);
  assert.equal(result.fields.producer,undefined);
  assert.equal(result.seo_fallback_fields,undefined);
 }
});
test('missing facts are displayed for user review and not guessed',()=>{
 const result=parse({description:'<p>Country: Kenya</p>'});
 assert.equal(result.fields.process,undefined);
 const html=coffeeUrlPreviewMarkup({...result,source_url:url});
 assert.match(html,/Not found on this product page:/);
 assert.match(html,/Roast Level/);
 assert.match(html,/Tasting Notes/);
 assert.match(html,/Leave these blank unless you can confirm them/);
});
test('stale SEO cannot manufacture elevation conflict against direct product value',()=>{
 const result=parse({body:'<p>Elevation: 1500 masl</p>',ogDescription:'Elevation 1800 masl; older product from Tanzania'});
 assert.match(result.fields.elevation_m||'',/1500/);
 assert.ok(!result.conflicts?.includes('elevation_m'));
});
test('actual current Shopify Product description wins over matched HTML SEO fallback',async()=>{
 const {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview}=await import('../src/server/coffee-shopify-ajax.mjs');
 const u='https://example-roaster.com/products/current-coffee';
 const html=source({metaFields:{process:'Natural'},urlOverride:u}).replaceAll(url,u);
 const base=extractPublicCoffeeFacts(html,{source_url:u});
 assert.ok(base.seo_fallback_fields?.includes('process'));
 const extra=extractShopifyAjaxData({title:'Selected Current Coffee',handle:'current-coffee',description:'<p>Process: Washed</p>',vendor:'Roaster'},shopifyProductRequest(u));
 assert.equal(extra.fields.process,'Washed');
 const merged=mergePublicProductPreview({...base,source_url:u},{...extra,source_url:u});
 assert.equal(merged.fields.process,'Washed');
 assert.ok(!merged.conflicts?.includes('process'));
 assert.ok(!merged.seo_fallback_fields?.includes('process'));
});
test('conflicting current HTML and current Shopify product detail remains unresolved',async()=>{
 const {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview}=await import('../src/server/coffee-shopify-ajax.mjs');
 const u='https://example-roaster.com/products/current-coffee';
 const html=source({body:'<p>Process: Natural</p>',urlOverride:u}).replaceAll(url,u);
 const base=extractPublicCoffeeFacts(html,{source_url:u});
 const extra=extractShopifyAjaxData({title:'Selected Current Coffee',handle:'current-coffee',description:'<p>Process: Washed</p>',vendor:'Roaster'},shopifyProductRequest(u));
 const merged=mergePublicProductPreview({...base,source_url:u},{...extra,source_url:u});
 assert.equal(merged.fields.process,undefined);
 assert.ok(merged.conflicts?.includes('process'));
});

test('current same-URL SEO-derived series is an explicitly unverified last resort',()=>{
 const html=source({ogDescription:'This Bean Lab Exceptional Series coffee is a current selected release.',
  seoName:'Selected Current Coffee | Bean Lab Exceptional Series'})
  .replace('<meta property="og:title"','<title>Selected Current Coffee | Bean Lab Exceptional Series</title><meta property="og:title"')
  .replace('<meta property="og:description"','<meta property="og:site_name" content="Bean Lab"><meta property="og:description"');
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.fields.release_label,'Exceptional Series');
 assert.ok(result.seo_fallback_fields?.includes('release_label'));
 assert.ok(!result.conflicts?.includes('release_label'));
});
