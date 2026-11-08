import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

// Original unchanged 603 selected row #549, CURRENT official chosen H1:
// https://www.realdope.coffee/products/tanazania-peaberry
// The literal direct current product caption says "Origin: Tanzania (Peaberry)".
// Peaberry is bean formation/classification, not a producing locality.
// HTML below is a source-shaped test fixture, NOT a fresh official raw capture.
const url='https://www.realdope.coffee/products/tanazania-peaberry';
const selected=(origin,extra='')=>'<html><head><meta property="og:type" content="product">'+
 '<link rel="canonical" href="'+url+'"></head><body><main><article>'+
 '<h1>Tanzania Peaberry</h1><section class="product-description">'+
 '<p>Origin: '+origin+'</p><p>Roast: Dark</p>'+
 '<p>Tasting notes: Earthy, fruity, hints of cacao</p></section>'+extra+
 '</article></main></body></html>';
function parse(origin,extra=''){
 const result=extractPublicCoffeeFacts(selected(origin,extra),{source_url:url});
 assert.equal(result?.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Tanzania Peaberry');
 return result;
}

test('R46 #549 selected explicit Origin country is not contaminated by parenthesized bean classification',()=>{
 const result=parse('Tanzania (Peaberry)');
 assert.equal(result.fields.origin,'Tanzania',JSON.stringify(result.fields));
 assert.equal(result.fields.roast_level,'Dark');
 const preview={...result,source_url:url};
 assert.match(coffeeUrlPreviewMarkup(preview),/Add Coffee/);
 assert.ok(coffeeSourceReviewSnapshot(preview));
});

test('R46 preserve exact selected bare country and never strip a legitimate regional descriptor',()=>{
 assert.equal(parse('Tanzania').fields.origin,'Tanzania');
 assert.notEqual(parse('Tanzania (Southern Highlands)').fields.origin,'Tanzania');
});

test('R46 multi-country captions or unknown countries must not be reduced to first country',()=>{
 for(const caption of ['Tanzania, Kenya (Peaberry)','Kenya, Tanzania (Peaberry)',
  'Tanzania (Peaberry), Kenya','Fantasia (Peaberry)']){
  assert.notEqual(parse(caption).fields.origin,'Tanzania',caption);
 }
});

test('R46 unselected related-product Origin must not supply chosen product geography',()=>{
 const other='<section class="product-recommendations"><h2>Other Coffee</h2>'+
  '<p>Origin: Tanzania (Peaberry)</p></section>';
 const result=extractPublicCoffeeFacts('<html><body><main><h1>Tanzania Peaberry</h1>'+
  '<p>Roast: Dark</p>'+other+'</main></body></html>',{source_url:url});
 assert.equal(result?.ok,true);
 assert.notEqual(result.fields.origin,'Tanzania');
});
