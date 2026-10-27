// Focused source-bound regression controls from failed public acceptance run
// 40062287845. Fixtures are minimal reproductions of public source structure.
// Preserve source contradictions and the original frozen audit oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {fixtureCoffeeHtml} from '../scripts/audit/coffee-fixture-sanitize.mjs';

const sey='https://www.seycoffee.com/products/2026-ruarai-aa-separation-kenya';
const manhattan='https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/';
const circulor='https://coffeacirculor.com/products/kenya-coffea-circulor-outo-isolated-sl34-aa-washed-wx';
const parse=(html,url)=>extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:url});
const page=(name,body,url)=>'<html><head><title>'+name+'</title><meta property="og:type" content="product"><meta property="og:title" content="'+name+'"><link rel="canonical" href="'+url+'"></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';

test('SEY own product prose identifies Nyeri, not adjacent Mount Kenya landmark',()=>{
 const html=parse(page('2026 Ruarai AA Separation - Kenya','<p>Region: Nyeri</p><p>Country: Kenya</p>',sey),sey);
 const json=parse(page('2026 Ruarai AA Separation - Kenya','<p>This is our first release from Kenya this season. This coffee comes from Nyeri on the western slopes of Mount Kenya—one of the most famous coffee-producing regions in the world.</p>',sey),sey);
 assert.equal(json.fields.origin,'Nyeri, Kenya');
 const merged=mergePublicProductPreview(html,json);
 assert.equal(merged.fields.origin,'Nyeri, Kenya');
 assert.ok(!merged.conflicts?.includes('origin'));
});

test('a genuinely contradictory independent coffee origin is still withheld',()=>{
 const html=parse(page('2026 Ruarai AA Separation - Kenya','<p>Region: Nyeri</p><p>Country: Kenya</p>',sey),sey);
 const other=parse(page('2026 Ruarai AA Separation - Kenya','<p>Origin: Embu, Kenya</p>',sey),sey);
 const merged=mergePublicProductPreview(html,other);
 assert.equal(merged.fields.origin,undefined);
 assert.ok(merged.conflicts?.includes('origin'));
});

test('malformed WooCommerce related section cannot donate later orphan product cards',()=>{
 const html=page('Samuel Jr.','<div><div class="fancy-title">Tastes Like</div><div class="subtitle">Star anise<span> &bullet;</span> Dark fudge<span> &bullet;</span> Verbena</div></div>'+
 '<section class="related products"><h2>Related products</h2><ul class="products columns-4">'+
 '<li class="product"><h2>Gundikhan</h2><p>Different coffee</p></li></section></li>\n'+
 '<li id="product-7244" class="product type-product"><a href="/product/coffees/competition/fredy-orantes/"><h2>Fredy Orantes</h2><div class="product__info--tastes-like"><div class="fancy-title">Tastes Like</div><div>Green grapes • Lime • Honey</div></div></a></li>'+ 
 '<li class="product"><h2>Rosa Dominguez</h2><div class="fancy-title">Tastes Like</div><div>Red Apple • Clementine • Fudge</div></li>'+ 
 '<section class="product-story"><h2>Our Story</h2><p>Origin: Cauca, Colombia</p><p>Producer: Diego Bermudez</p><p>Our Samuel Jr. coffee has notes of star anise, dark fudge, and verbena.</p></section>',manhattan);
 const parsed=parse(html,manhattan);
 assert.match(parsed.fields.tasting_notes||'',/star anise.*dark fudge.*verbena/i);
 assert.ok(!parsed.conflicts?.includes('tasting_notes'));
 assert.match(parsed.fields.origin||'',/Cauca.*Colombia/i,'genuine story after related cards is retained');
 assert.doesNotMatch((parsed.fields.tasting_notes||'')+JSON.stringify(parsed.source_facts||[]),/Green grapes|Red Apple/i);
});

test('same-product published contradictory notes still require review',()=>{
 const html=page('Samuel Jr.','<p>Tasting Notes: Star anise, dark fudge, verbena</p><p>Flavor Notes: Cocoa, orange, almond</p>',manhattan);
 const parsed=parse(html,manhattan);
 assert.equal(parsed.fields.tasting_notes,undefined);
 assert.ok(parsed.conflicts?.includes('tasting_notes'));
});

test('Circulor contradictory named cultivars remain a real conflict',()=>{
 const html=page('Outo','<h2>Variety</h2><p>SL34</p><table><tr><th>Varietal</th><td>Ruiru 11</td></tr></table><p>Origin: Meru, Kenya</p>',circulor);
 const parsed=parse(html,circulor);
 assert.equal(parsed.fields.variety,undefined);
 assert.ok(parsed.conflicts?.includes('variety'));
 assert.equal(parsed.fields.origin,'Meru, Kenya');
});

test('public fixture sanitizer is inert and retains permitted DOM for source parity',()=>{
 const html=page('Current Coffee','<form action="https://bad.invalid/submit" onsubmit="alert(1)"><input type="hidden" name="coffee_variant" value="washed"><input type="hidden" name="csrf_token" value="secret"><input type="email" name="email" value="nobody@example.com"><label>Tasting Notes: peach, jasmine</label></form>'+ 
 '<script>alert("execute")</script><script type="application/json">{"name":"Current Coffee","email":"nobody@example.com","variety":"Bourbon"}</script>'+ 
 '<a href="javascript:alert(1)" onclick="alert(1)">Link</a>', 'https://roaster.example/products/current-coffee');
 const sanitized=fixtureCoffeeHtml(html);
 assert.match(sanitized,/<form\b/i);
 assert.match(sanitized,/<input\b[^>]*name="coffee_variant"/i);
 assert.doesNotMatch(sanitized,/csrf_token|nobody@example.com|onsubmit=|onclick=|alert\("execute"\)/i);
 assert.doesNotMatch(sanitized,/action="https:/i);
 assert.match(sanitized, /href="#"/);
 assert.match(sanitized,/"variety":"Bourbon"/);
 const original=parse(html,'https://roaster.example/products/current-coffee');
 const replay=parse(sanitized,'https://roaster.example/products/current-coffee');
 assert.equal(replay.fields.tasting_notes,original.fields.tasting_notes);
});


test('anonymous product JSON script data-product marker survives fixture sanitization',()=>{
 const url='https://coffeacirculor.com/products/selected-coffee';
 const html=page('Selected Coffee','<script type="application/json" data-product-json>'+
  JSON.stringify({id:43,title:'Selected Coffee',handle:'selected-coffee',tags:['Coffee'],vendor:'Coffea Circulor',available:true,variants:[{id:123,name:'Selected Coffee - 250g',available:true,price:1200}]})+'</script>',url);
 const original=parse(html,url),replay=parse(fixtureCoffeeHtml(html),url);
 assert.ok(original.source_facts?.length>=5);
 assert.deepEqual(replay,original);
});


test('NOMAD public Yoast checkout URL template survives without leaking other checkout secrets',()=>{
 const url='https://nomadcoffee.es/products/centroamericano-natural-anaerobico';
 const variantUrl=url+'?variant=123';
 const product={"@context":"https://schema.org","@type":"Product","name":"Centroamericano Natural Anaeróbico","url":url,"hasVariant":[{"@type":"Product","name":"Centroamericano Natural Anaeróbico - 1kg / Café en Grano","@id":"https://nomadcoffee.es/#/schema/Product/selected-123","offers":{"@type":"Offer","@id":"https://nomadcoffee.es/#/schema/Offer/selected-123","url":variantUrl,"price":"100.00","priceCurrency":"EUR","checkoutPageURLTemplate":"https://nomadcoffee.es/cart/add?id=123&quantity=1","checkoutAuthToken":"sensitive-checkout-token"}}]};
 const html=page('Centroamericano Natural Anaeróbico','<script type="application/ld+json">'+JSON.stringify(product)+'</script>',url);
 const original=parse(html,url),sanitized=fixtureCoffeeHtml(html,{source_url:url}),replay=parse(sanitized,url);
 assert.match(JSON.stringify(original.source_facts),/checkoutPageURLTemplate/);
 assert.match(sanitized,/checkoutPageURLTemplate/);
 assert.doesNotMatch(sanitized,/sensitive-checkout-token/);
 // The only intentionally removed key is a synthetic secret: it must not
 // reappear in the public captured source, yet real purchase fields survive.
 assert.match(JSON.stringify(replay.source_facts),/checkoutPageURLTemplate/);
});

test('fixture checkout exception rejects unbound, relative, HTTP and foreign-origin templates',()=>{
 const url='https://nomadcoffee.es/products/centroamericano-natural-anaerobico';
 const variantUrl=url+'?variant=123';
 const safe='https://nomadcoffee.es/cart/add?id=123&quantity=1';
 const product=template=>({'@type':'Product',name:'Selected Coffee',url,
  offers:{'@type':'Offer',url:variantUrl,checkoutPageURLTemplate:template}});
 for(const template of [
  '/cart/add?id=123&quantity=1',
  'http://nomadcoffee.es/cart/add?id=123&quantity=1',
  'https://foreign.example/cart/add?id=123&quantity=1',
  'https://nomadcoffee.es/cart/add?variant=123',
  'https://nomadcoffee.es/cart/add?id=999&quantity=1',
  safe+'&session=DO_NOT_RETAIN'
 ]){
  const data=product(template);
  const fixture=fixtureCoffeeHtml('<script type="application/ld+json">'+JSON.stringify(data)+'</script>',{source_url:url});
  assert.doesNotMatch(fixture,/checkoutPageURLTemplate|DO_NOT_RETAIN/,template);
 }
 const unbound=product(safe);delete unbound.offers.url;
 const fixture=fixtureCoffeeHtml('<script type="application/ld+json">'+JSON.stringify(unbound)+'</script>',{source_url:url});
 assert.doesNotMatch(fixture,/checkoutPageURLTemplate/);
});
