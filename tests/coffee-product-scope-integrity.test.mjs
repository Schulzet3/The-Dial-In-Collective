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
