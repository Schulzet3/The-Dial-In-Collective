import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://www.radialcoffee.com/products/guatemala';
const name='Colombia — Inza Decaf';
const current='Indulge in our meticulously crafted decaf coffee, sourced from a collective of smallholder farms nestled in the vibrant town of Inza, Colombia. This exquisite blend thoughtfully curated by our trusted partner Red Fox Coffee Importers, highlights a myriad of flavors. With notes of sweet dark chocolate, juicy cherries and rich raisins this will surely become an instant classic.';
const page=(description=current)=>'<html><head><meta property="og:url" content="'+url+'">'+
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url,description})+'</script>'+
 '</head><body><main><h1>'+name+'</h1><section class="product-description">'+
 '<p>Washed Process</p><p>Medium Roast</p><p>'+description+'</p></section></main></body></html>';

test('R45 current Inza exact product: producer role ends before situated-location prose, preserves literal anonymous collective',()=>{
 const result=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.producer,'collective of smallholder farms');
 assert.ok(!result.conflicts?.includes('producer'));
 const preview={...result,source_url:url};
 assert.match(coffeeUrlPreviewMarkup(preview),/Add Coffee/);
 assert.ok(coffeeSourceReviewSnapshot(preview));
});
test('R45 separate explicitly labeled named selected producer retains its full entity',()=>{
 const result=extractPublicCoffeeFacts(page('Producer: Cooperativa del Sur del Cauca - COSURCA. Process: Washed. Country: Colombia.'),{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.producer?.replace(/\.$/u,''),'Cooperativa del Sur del Cauca - COSURCA');
});
test('R45 no collective/producer may be inferred from unrelated current regional context',()=>{
 const result=extractPublicCoffeeFacts(page('Washed Process. Medium Roast. Inza, Colombia is known for smallholder farms nestled in vibrant mountains.'),{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.producer,undefined);
});
