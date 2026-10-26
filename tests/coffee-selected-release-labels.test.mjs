import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const req=shopifyProductRequest('https://example.org/products/selected-release');
function product(data={}){
 return extractShopifyAjaxData({handle:'selected-release',title:'Selected Release',description:'<p>Our selected current coffee.</p>',...data},req);
}
test('selected product explicit monthly Limited Blend title is specific and not overridden by its generic tag',()=>{
 const value=product({title:'Under the Rainbow (October Limited Blend)',tags:['coffee','Limited Blend','october']});
 assert.equal(value.fields.release_label,'October Limited Blend');
 assert.ok(!value.conflicts?.includes('release_label'));
});
test('a standalone exact selected product Limited Blend tag is retained without inferring adjacent month',()=>{
 for(const tags of [['coffee','Limited Blend','september'],['Limited Blend']]){
  const value=product({title:'Balthvs Manifest',tags});
  assert.equal(value.fields.release_label,'Limited Blend');
 }
});
test('exact selected product Limited Edition title is a supported release statement',()=>{
 const value=product({title:'Guatemala Geisha Limited Edition'});
 assert.equal(value.fields.release_label,'Limited Edition');
});
test('strong standalone selected description label is retained without the purchase restriction',()=>{
 const value=product({title:'Costa Rica Perla Negra Peaberry',description:'<p>Current lot information.</p><p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p>'});
 assert.equal(value.fields.release_label,'LIMITED RELEASE');
});
test('selected current name as subject of seasonal release is required',()=>{
 const accepted=product({title:'solar flare - claudia samboni | joelle ater',description:'<p>solar flare is a limited summer release built around an anaerobic processed micro-lot.</p>'});
 assert.equal(accepted.fields.release_label,'limited summer release');
 for(const description of [
  '<p>our next coffee is a limited summer release</p>',
  '<p>solar energy is a limited summer release</p>',
  '<p>Solar Flare was our limited summer release last year</p>'
 ]){
  const value=product({title:'solar flare - claudia samboni | joelle ater',description});
  assert.equal(value.fields.release_label,undefined);
 }
});
test('unsupported generic categories, unrelated page promotions and title hyphens do not fabricate a release',()=>{
 for(const tags of [['coffee','new'],['limited'],['Limited Collection'],['October','coffee']]){
  const value=product({title:'The Farm Red Honey',tags,description:'<p>Our October sales promotion is limited.</p>'});
  assert.equal(value.fields.release_label,undefined);
 }
 const unrelated=extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product" /></head><body><main><h1>Selected Release</h1><div class="related-products"><strong>LIMITED RELEASE</strong> Another coffee</div></main></body></html>',{source_url:req.sourceUrl});
 assert.ok(!unrelated.fields?.release_label);
});
test('direct contradictory current release statement is not silently overridden',()=>{
 const value=product({title:'Guatemala Geisha Limited Edition',description:'<p>Release: 2025 harvest</p>'});
 assert.equal(value.fields.release_label,undefined);
 assert.ok(value.conflicts?.includes('release_label'));
});
test('rejects a mismatched endpoint product handle even if it contains valid release text',()=>{
 assert.equal(product({handle:'some-other-product',title:'Limited Edition'}),null);
});
