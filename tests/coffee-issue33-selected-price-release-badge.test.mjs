// Issue #33 original603 #490: exact current H1 and product-owned price badge.
// Source: current official https://www.greatcirclecoffee.com/products/la-josefina-sudan-rume
// SHA256 f4ad9956fdffea83f54685dff4836296b5c2063804a8b64c133a537169afe273; this
// test uses a sanitized bounded HTML layout, never copied full live HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCurrentCoffeeReleaseBadge} from '../src/server/coffee-selected-source-evidence.mjs';
const url='https://roaster.example/products/la-josefina-sudan-rume';
const title='La Josefina Sudán Rumé / Natural Extended Fermentation';
const badge='<div class="badge next-level" data-badge="next-level"> NEXT LEVEL </div>';
const product=(name=title,body='')=>'<html><head><meta property="og:url" content="'+url+'"><meta property="og:title" content="'+name+'">'+
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url,description:'Origin: Ecuador'})+'</script></head>'+
 '<body><nav><a href="/collections/next-level">NEXT LEVEL</a></nav><main>'+
 '<div class="product-information"><div class="product-title-container"><h1 class="product-title">'+name+'</h1>'+
 '<div class="product-price-container"><div id="selected-price"><span class="price">$32</span>'+
 body+'</div></div></div><p>Origin: Ecuador</p></div></main></body></html>';

test('exact selected current product price badge supplies reviewable release tier',()=>{
 const html=product(title,'<span class="badges">'+badge+'</span>');
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.release_label,'Next Level');
 assert.ok(!result.conflicts?.includes('release_label'));
 assert.ok(result.source_facts?.some(f=>f.field==='release_label'&&f.value==='Next Level'&&
  f.section==='Exact selected product price panel'));
});
test('shop navigation, review quote and unrelated product badge never promote a release',()=>{
 const cases=[
  product(),
  product(title,'<span class="price">NEXT LEVEL</span>'),
  product(title,'<span class="badges"><div class="badge">NEXT LEVEL</div></span>'),
  product(title,'<span class="badges"><div class="badge next-level" data-badge="next-level"> OTHER LEVEL </div></span>'),
  product(title,'')+'<section class="related"><h1>Other Coffee</h1>'+badge+'</section>'
 ];
 for(const html of cases){
  const result=extractPublicCoffeeFacts(html,{source_url:url});
  assert.equal(result.fields?.release_label,undefined,'unsupported badge: '+html.slice(-130));
 }
});
test('a matching product H1 without its own adjacent price badge is not enough',()=>{
 const html='<main><h1>'+title+'</h1><p>General NEXT LEVEL catalog</p><div class="product-price-container">'+badge+'</div></main>';
 assert.equal(selectedCurrentCoffeeReleaseBadge(html,{name:title}),'');
 assert.equal(selectedCurrentCoffeeReleaseBadge(product(title,'<span>'+badge+'</span>'),{name:'Different Coffee'}),'');
});
test('named selected title release is not replaced by generic price tier',()=>{
 const name='Special Lot (Limited Release)';
 const result=extractPublicCoffeeFacts(product(name,badge),{source_url:url});
 assert.equal(result.fields?.release_label,'Limited Release');
 assert.ok(!result.conflicts?.includes('release_label'));
});
