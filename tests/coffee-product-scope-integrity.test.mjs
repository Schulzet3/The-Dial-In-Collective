import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {coffeeHtmlElements} from '../src/server/coffee-html-structure.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/actual-coffee';
const page=body=>'<main><h1>Actual Coffee</h1>'+body+'</main>';
const parse=body=>extractPublicCoffeeFacts(page(body),{source_url});

test('a recommended coffee named Espresso cannot reopen the current product scope',()=>{
 const body='<h2>More Coffees</h2><h3>Espresso</h3><p>Variety: Robusta</p>';
 assert.doesNotMatch(productMarkup(page(body)),/Robusta/);
 assert.equal(parse(body).fields.variety,undefined);
});

test('a nested recommended coffee cannot hide a later sibling product story',()=>{
 const body='<section><h2>More Coffees</h2><article><h3>Espresso</h3>'+
  '<p>Variety: Robusta</p></article></section>'+
  '<section><h2>The Story</h2><p>Variety: Chiroso</p></section>';
 const scoped=productMarkup(page(body));
 assert.doesNotMatch(scoped,/Robusta/);assert.match(scoped,/Chiroso/);
 assert.equal(parse(body).fields.variety,'Chiroso');
});

test('an Our Current Offerings grid cannot contribute other product origins',()=>{
 const body='<p>Region: El Paraiso</p><p>Country: Honduras</p><div class="collection">'+
  '<div class="collection__title"><h2>OUR CURRENT OFFERINGS</h2></div><slider-component><ul class="product-grid">'+
  '<li><h3><a href="/products/other">Colombia - Embrujo Mr. Hat</a></h3><p>Variety: Robusta</p></li>'+
  '</ul></slider-component></div><section><h2>The Story</h2><p>Producer: Ana Torres</p></section>';
 const result=parse(body),scoped=productMarkup(page(body));
 assert.equal(result.fields.origin,'El Paraiso, Honduras');assert.equal(result.fields.producer,'Ana Torres');
 assert.equal(result.fields.variety,undefined);assert.doesNotMatch(scoped,/Embrujo|Robusta/);
 assert.ok(!result.conflicts?.includes('origin'));assert.match(scoped,/Ana Torres/);
 const current=parse('<h2>Our current offering</h2><p>Origin: Colombia</p>');
 assert.equal(current.fields.origin,'Colombia');
});

test('product-like headings inside recommendation cards do not become resume markers',()=>{
 const body='<div><section><div><h2>Related Coffees</h2></div>'+
  '<article><h3>Product Details</h3><p>Variety: Robusta</p></article></section>'+
  '<section><h2>About this coffee</h2><p>Variety: Chiroso</p></section></div>';
 const scoped=productMarkup(page(body));
 assert.doesNotMatch(scoped,/Robusta/);assert.match(scoped,/Chiroso/);
 assert.equal(parse(body).fields.variety,'Chiroso');
});

test('decorative icons do not turn a recommendations heading wrapper into the entire component',()=>{
 for(const icon of ['<svg><path d="M0 0"/></svg>',
  '<span aria-hidden="true"><svg><text>arrow</text></svg></span>']){
  const body='<section><div><h2>More Coffees</h2>'+icon+'</div>'+
   '<article><h3>Other Coffee</h3><p>Variety: Robusta</p></article></section>'+
   '<section><h2>The Story</h2><p>Variety: Chiroso</p></section>';
  const scoped=productMarkup(page(body));
  assert.doesNotMatch(scoped,/Robusta/);assert.match(scoped,/Chiroso/);
  assert.equal(parse(body).fields.variety,'Chiroso');
 }
});

test('flat recommendations resume only at a peer or higher-level product section',()=>{
 const body='<h2>More Coffees</h2><h3>Product Details</h3><p>Variety: Robusta</p>'+
  '<h2>About this coffee</h2><p>Variety: Chiroso</p>';
 const scoped=productMarkup(page(body));
 assert.doesNotMatch(scoped,/Robusta/);assert.match(scoped,/Chiroso/);
 assert.equal(parse(body).fields.variety,'Chiroso');
});

test('a shared container retains its actual product details after related cards',()=>{
 const body='<section><h2>More Coffees</h2><article><h3>Other Coffee</h3>'+
  '<p>Variety: Robusta</p></article><h2>Product Details</h2><p>Variety: Chiroso</p></section>';
 const scoped=productMarkup(page(body));
 assert.doesNotMatch(scoped,/Robusta/);assert.match(scoped,/Chiroso/);
 assert.equal(productMarkup(scoped),scoped);
 assert.equal(parse(body).fields.variety,'Chiroso');
});

test('named recommendations and selected-product espresso instructions remain independent',()=>{
 const body='<p>Variety: Chiroso</p><h2>Brew It</h2><h3>Espresso</h3>'+
  '<p>Coffee in 18g, espresso out 36g, brew time 25 seconds.</p>'+
  '<product-recommendations><h2>Product Details</h2><p>Variety: Robusta</p></product-recommendations>'+
  '<section class="product-story"><h2>Our Story</h2><p>Producer: Ana Torres</p></section>';
 const scoped=productMarkup(page(body));
 assert.match(scoped,/Espresso/);assert.match(scoped,/Ana Torres/);assert.doesNotMatch(scoped,/Robusta/);
 const result=parse(body);assert.equal(result.fields.variety,'Chiroso');assert.equal(result.fields.producer,'Ana Torres');
});

test('a WooCommerce product carousel cannot donate other coffee facts to the selected product',()=>{
 const body='<p>Variety: Pink Bourbon</p><p>Process: Washed</p>'+
  '<div class="elementor-widget-eael-woo-product-carousel"><div class="products swiper-wrapper">'+
  '<article class="product swiper-slide"><h2>TABi - Natural Process</h2><p>Variety: Tabi</p></article></div></div>'+
  '<div class="product-carousel product-gallery"><p>Producer: Ana Torres</p></div>';
 const scoped=productMarkup(page(body));
 assert.doesNotMatch(scoped,/TABi/);assert.match(scoped,/product-gallery/);
 const result=parse(body);assert.equal(result.fields.process,'Washed');assert.equal(result.fields.variety,'Pink Bourbon');
 assert.equal(result.fields.producer,'Ana Torres');assert.ok(!result.conflicts?.length);
});

test('semantic navigation is excluded even when a storefront uses custom menu elements',()=>{
 for(const menu of ['<full-menu><p>Origin: Kenya</p></full-menu>',
  '<ul role="menubar"><li>Variety: Tabi</li></ul>',
  '<div role="navigation"><p>Process: Natural</p></div>']){
  const html='<h1>Actual Coffee</h1>'+menu+'<div role="tabpanel"><p>Origin: Colombia</p>'+
   '<p>Variety: Pink Bourbon</p><p>Process: Washed</p></div>';
  const result=extractPublicCoffeeFacts(html,{source_url});
  assert.equal(result.fields.origin,'Colombia');assert.equal(result.fields.variety,'Pink Bourbon');
  assert.equal(result.fields.process,'Washed');assert.ok(!result.conflicts?.length);
 }
});

test('a recommendation heading with a Shop All link still scopes its complete product grid',()=>{
 for(const marker of ['', ' js-recommendations-target']){
  const recommendations='<section class="featured-products-grid"'+marker+'><div class="section-head">'+
   '<h2>More coffees</h2><a href="/collections/coffee">Shop All</a></div><div class="featured-products-grid__grid">'+
   '<card-product data-product-url="/products/other"><h3>Other Coffee</h3><p>Variety: Robusta</p></card-product></div></section>';
  const result=parse('<p>Variety: Bourbon Ají</p>'+recommendations+'<section><h2>The Story</h2><p>Producer: Ana Torres</p></section>');
  assert.equal(result.fields.variety,'Bourbon Ají');assert.equal(result.fields.producer,'Ana Torres');
  assert.ok(!JSON.stringify(result.source_facts).includes('Robusta'));
  assert.doesNotMatch(productMarkup(page(recommendations)),/Other Coffee/);
 }
});

test('explicit review widgets and custom navigation cannot contradict the selected coffee roast',()=>{
 for(const foreign of [
  '<div class="jdgm-rev__body"><p>Our other coffee is a light roast.</p></div>',
  '<div class="testimonials__text"><h2><p>I enjoy the light roast.</p></h2></div>',
  '<div class="hidden"><div id="nav"><ul><li>Light Roast</li></ul></div></div>',
  '<div class="header__navigation"><a>Light Roast</a></div>',
  '<li data-meganav-mobile-target="shop-coffee"><p>Light Roast</p></li>',
  '<div data-meganav-mobile data-meganav-handle="shop-coffee"><p>Light Roast</p></div>'
 ]){
  const result=extractPublicCoffeeFacts('<h1>Actual Coffee</h1><p>Roast: Dark</p>'+foreign,{source_url});
  assert.equal(result.fields.roast_level,'Dark');assert.ok(!result.conflicts?.includes('roast_level'));
  assert.doesNotMatch(productMarkup('<h1>Actual Coffee</h1>'+foreign),/light roast/i);
 }
});

test('depth overflow keeps inspected product facts and discards the unscanned remainder',()=>{
 const body='<p>Origin: Colombia</p>'+'<div>'.repeat(130)+'</div>'.repeat(130)+
  '<h2>More Coffees</h2><p>Variety: Robusta</p>';
 const scoped=productMarkup(page(body));
 assert.match(scoped,/Origin: Colombia/);assert.doesNotMatch(scoped,/Robusta/);
 const result=parse(body);assert.equal(result.fields.origin,'Colombia');assert.equal(result.fields.variety,undefined);
 const scan=coffeeHtmlElements(page(body));assert.equal(scan.truncated,true);assert.ok(scan.scannedEnd<page(body).length);
});

test('node overflow discards unscanned recommendations without deleting earlier facts',()=>{
 const body='<p>Origin: Colombia</p>'+'<span></span>'.repeat(40_000)+
  '<h2>More Coffees</h2><p>Variety: Robusta</p>';
 const scoped=productMarkup(page(body));
 assert.match(scoped,/Origin: Colombia/);assert.doesNotMatch(scoped,/Robusta/);
 const scan=coffeeHtmlElements(page(body));assert.equal(scan.truncated,true);assert.ok(scan.scannedEnd<page(body).length);
});

test('an unterminated opening tag fails closed before source text it cannot scope',()=>{
 for(const tail of ['<div data-x="broken<h2>More Coffees</h2><p>Variety: Robusta</p>',
  '<div data-x=broken<h2>More Coffees</h2><p>Variety: Robusta</p>']){
  const scoped=productMarkup(page('<p>Origin: Colombia</p>'+tail));
  assert.match(scoped,/Origin: Colombia/);assert.doesNotMatch(scoped,/Robusta/);
 }
});

test('quoted angle brackets and large decorative attributes do not hide later product facts',()=>{
 const body='<div title="not > a close tag"></div><svg><path d="'+'M0 0 '.repeat(14000)+'"/></svg>'+
  '<section><h2>Product Details</h2><p>Variety: Bourbon Ají</p></section>';
 const scoped=productMarkup(page(body));assert.match(scoped,/Bourbon Ají/);
 assert.equal(productMarkup(scoped),scoped);assert.equal(parse(body).fields.variety,'Bourbon Ají');
});

test('malformed repeated H1 tags cannot turn a large heading-content allowance into repeated full scans',()=>{
 const code="import {extractPublicCoffeeFacts as extract} from './src/server/coffee-page-metadata.mjs';"+
  "const result=extract('<h1>'.repeat(400000),{source_url:'https://example.invalid/products/audit'});"+
  "if(result.ok)throw new Error('Unclosed headings cannot identify a coffee');console.log('bounded');";
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{
  cwd:new URL('..',import.meta.url),timeout:3000,encoding:'utf8'
 });
 assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);
 assert.equal(result.stdout.trim(),'bounded');
});

test('two-letter span words are ordinary title words, not animated single-character leaves',()=>{
 const html='<main><h1><div class="word"><span>La</span><span>Fe</span></div></h1>'+
  '<p>Variety: Chiroso</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(result.fields.name,'La Fe');assert.equal(result.fields.variety,'Chiroso');
});

test('selected cost asides survive shared scope while unrelated sidebars remain excluded',()=>{
 const body='<p>Variety: Bourbon Ají</p><section><h2>Transparency</h2>'+
  '<aside class="cost__aside"><h3>Our cost</h3><p>$13.86/lb</p><p>$8.70/lb green cost</p></aside></section>'+
  '<aside class="sidebar"><h2>Another Coffee</h2><p>Variety: Robusta</p><p>$99.99/lb</p></aside>'+
  '<aside class="cost__aside related-products"><h2>Other Product</h2><p>$88.88/lb</p></aside>'+
  '<aside class="cost__aside" hidden><p>$77.77/lb</p></aside>';
 const scoped=productMarkup(page(body));
 assert.match(scoped,/<div data-coffee-product-aside="cost"/);assert.match(scoped,/\$13\.86\/lb/);
 assert.doesNotMatch(scoped,/Robusta|99\.99|88\.88|77\.77/);assert.equal(productMarkup(scoped),scoped);
 const result=parse(body);assert.equal(result.fields.variety,'Bourbon Ají');
 assert.ok(result.source_facts.some(fact=>fact.value.includes('$13.86/lb')));
 assert.ok(!JSON.stringify(result.source_facts).includes('$99.99/lb'));
});

test('selected brewing recommendations are preserved independently of product recommendations',()=>{
 const body='<section class="brew-recommendations"><h2>Choose Your Brew</h2><p>Use 18g coffee with 300g water.</p></section>'+
  '<section class="product__recommendations"><h2>Other Coffee</h2><p>Variety: Robusta</p></section>'+
  '<section class="brew-recommendations product-recommendations"><p>Variety: Liberica</p></section>';
 const scoped=productMarkup(page(body));assert.match(scoped,/18g coffee with 300g water/);
 assert.doesNotMatch(scoped,/Robusta|Liberica/);
 assert.ok(parse(body).source_facts.some(fact=>fact.value.includes('18g coffee with 300g water')));
});

test('visible controls admit selected ingredient and direction panels but hidden unrelated panels stay excluded',()=>{
 const body='<button aria-controls="ingredients">Ingredients</button>'+
  '<button aria-controls="allergen">Allergen Info</button><button aria-controls="directions">Directions</button>'+
  '<div id="ingredients" hidden><p>100% Arabica coffee.</p></div>'+
  '<div id="allergen" aria-hidden="true"><p>Allergen-Free</p></div>'+
  '<div id="directions" hidden><p>Use 2 tbsp per 6 oz water.</p></div>'+
  '<nav><button aria-controls="unrelated">Ingredients</button></nav>'+
  '<div id="unrelated" hidden><p>Variety: Robusta</p></div>';
 const scoped=productMarkup(page(body));assert.match(scoped,/100% Arabica/);assert.match(scoped,/Allergen-Free/);
 assert.match(scoped,/2 tbsp per 6 oz/);assert.doesNotMatch(scoped,/Robusta/);
 const result=parse(body);assert.ok(result.source_facts.some(fact=>fact.value.includes('2 tbsp per 6 oz')));
 const wrapper='<div id="ingredients-accordion"><button aria-controls="ingredients-accordion">Ingredients</button>'+
  '<div class="accordion__content" aria-hidden="true" id="accordion-content-ingredients"><p>100% Arabica Coffee</p></div>'+
  '<div hidden><p>Variety: Robusta</p></div></div>';
 const nested=productMarkup(page(wrapper));assert.match(nested,/100% Arabica Coffee/);assert.doesNotMatch(nested,/Robusta/);
 assert.ok(parse(wrapper).source_facts.some(fact=>fact.value.includes('100% Arabica Coffee')));
});
