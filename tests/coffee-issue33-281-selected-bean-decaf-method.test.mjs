import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://example-coffee.test/products/ridley-easy-rider-decaf';
const claim='We sampled decaf beans for a year before we discovered this standout bean. It possesses a complexity not often found in decaffeinated beans. It is decaffeinated using the Swiss Water Process which is a patented, eco-friendly, chemical-free process that removes 99.9% of the caffeine from green coffee. It is also fair trade and organic.';
const page=(name='Easy Rider SWP Decaf',inside=claim,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><main class="product"><h1>'+name+'</h1><div class="product-description rte"><p>ORIGIN: Honduras</p><p>ROAST: Dark</p><p>FLAVOR: Cane sugar sweetness with cocoa and citrus.</p><p>'+inside+'</p></div></main>'+extra+'</body></html>';
const parse=(name,inside,extra)=>extractPublicCoffeeFacts(page(name,inside,extra),{source_url:url});
test('exact selected decaf bean and matching same-paragraph pronoun restore documented Water Process',()=>{
 const r=parse('Easy Rider SWP Decaf',claim);
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Easy Rider SWP Decaf');
 assert.equal(r.fields.origin,'Honduras');
 assert.equal(r.fields.roast_level,'Dark');
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r));
 assert.equal(r.fields.process,undefined);
 assert.ok((r.source_facts||[]).some(f=>f.field==='decaffeination_method'&&/It is decaffeinated using the Swiss Water Process/i.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('generic current decaf pronoun evidence is source-bound not merchant-specific',()=>{
 const r=parse('Altitude House Decaf','We chose this exceptional coffee for its quality. It is decaffeinated with Mountain Water Process.');
 assert.equal(r.fields.decaffeination_method,'Water Process');
});
test('no direct bean antecedent and a named other offering cannot infer treatment',()=>{
 const variants=[
  'This is a delicious product. It is decaffeinated using the Swiss Water Process.',
  'Another coffee is a standout bean. It is decaffeinated using the Swiss Water Process.',
  'Previously this standout bean was decaffeinated using the Swiss Water Process.',
  'Our other coffee has this standout bean. It is decaffeinated using the Swiss Water Process.',
  'We discovered this standout bean. It is not decaffeinated using the Swiss Water Process.',
  'We discovered this standout bean. It is decaffeinated without the Swiss Water Process.',
  'We discovered this standout bean. It is decaffeinated using the Swiss Water Process last year.',
 ];
 for(const text of variants){
  const r=parse('Easy Rider SWP Decaf',text);
  assert.equal(r.fields.decaffeination_method,undefined,text+' '+JSON.stringify(r.fields));
 }
});
test('absent, changed, generic and competing selected H1 never inherit method',()=>{
 for(const name of ['Our Coffee Collection','Half-Caf Test Blend','Regular Bean']){
  const r=parse(name,claim);assert.equal(r.fields.decaffeination_method,undefined,name);
 }
 const none=extractPublicCoffeeFacts(page('Easy Rider SWP Decaf',claim).replace(/<h1>[^<]+<\/h1>/,''),{source_url:url});
 assert.equal(none.fields.decaffeination_method,undefined);
 const extra=extractPublicCoffeeFacts(page('Easy Rider SWP Decaf',claim,'<main><h1>Different Decaf</h1><p>'+claim+'</p></main>'),{source_url:url});
 assert.notEqual(extra.fields.decaffeination_method,'Water Process');
});
test('outside current product, SEO and educational contexts do not confer decaf method',()=>{
 const blank='<p>Our carefully sourced decaf is a joy.</p>';
 const extra='<section class="product-recommendations"><h2>Other coffees</h2><p>'+claim+'</p></section>';
 assert.equal(parse('Easy Rider SWP Decaf',blank,extra).fields.decaffeination_method,undefined);
 const seo=extractPublicCoffeeFacts(page('Easy Rider SWP Decaf',blank).replace('</head>','<meta name="description" content="'+claim+'"></head>'),{source_url:url});
 assert.equal(seo.fields.decaffeination_method,undefined);
 assert.equal(parse('Easy Rider SWP Decaf',blank+'<h2>What is decaffeination?</h2><p>'+claim+'</p>').fields.decaffeination_method,undefined);
});
test('same-product conflicting selected methods retain review, never guess',()=>{
 const both=claim+' We also use this standout bean. It is decaffeinated using the Sugar Cane Process.';
 const r=parse('Easy Rider SWP Decaf',both);
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
});
