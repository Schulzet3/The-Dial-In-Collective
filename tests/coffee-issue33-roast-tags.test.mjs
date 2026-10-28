import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

const source='https://roaster.example.com/products/colombia-huila';
const req=shopifyProductRequest(source);
const product=(description,tags=['Light Roast','Medium Roast'])=>({
 handle:req.handle,title:'Colombia Huila',vendor:'Verified Roaster',description,tags
});
const page=body=>extractPublicCoffeeFacts('<main><h1>Colombia Huila</h1>'+body+'</main>',{source_url:source});
const endpoint=(description,tags)=>extractShopifyAjaxData(product(description,tags),req);

test('specific selected Medium-Light roast prevails over overlapping nonspecific Shopify catalog tags',()=>{
 // Source-backed Yellowstone #77: current title-adjacent literal Medium-Light
 // Roast vs broad store tags Light Roast and Medium Roast, not purchase options.
 const base=page('<div class="product-info-block"><div class="rte cf"><p><strong>Juicy & Dynamic - Medium-Light Roast</strong></p></div></div>');
 const extra=endpoint('<p><strong>NOTES: CHERRY, CITRUS, CUSTARD</strong></p>');
 assert.equal(base.fields.roast_level,'Medium-Light');
 assert.equal(base.roast_source,'product_explicit_text');
 assert.equal(extra.fields.roast_level,undefined);
 assert.ok(extra.conflicts?.includes('roast_level'));
 assert.equal(extra.roast_tag_ambiguity_only,true);
 const combined=mergePublicProductPreview(base,extra);
 assert.equal(combined.fields.roast_level,'Medium-Light');
 assert.ok(!combined.conflicts?.includes('roast_level'));
 assert.deepEqual(product('x').tags,['Light Roast','Medium Roast']);
});

test('competing DIRECT current product specifications remain conflicted despite marketing tags',()=>{
 const base=page('<p>Roast: Medium-Light</p>');
 const extra=endpoint('<p>Roast: Dark</p>');
 assert.notEqual(extra.roast_tag_ambiguity_only,true);
 const combined=mergePublicProductPreview(base,extra);
 assert.equal(combined.fields.roast_level,undefined);
 assert.ok(combined.conflicts?.includes('roast_level'));
});

test('ambiguous marketing roast tags without one current selected roast remain withheld',()=>{
 const base=page('<p>Origin: Huila, Colombia</p>');
 const extra=endpoint('<p>NOTES: CHERRY, CITRUS, CUSTARD</p>');
 const combined=mergePublicProductPreview(base,extra);
 assert.equal(combined.fields.roast_level,undefined);
 assert.ok(combined.conflicts?.includes('roast_level'));
});

test('two explicit contradictory roast labels on product HTML stay unresolved',()=>{
 const base=page('<p>Roast: Light</p><p>Roast: Dark</p>');
 const extra=endpoint('<p>NOTES: CHERRY, CITRUS, CUSTARD</p>');
 assert.ok(base.conflicts?.includes('roast_level'));
 const combined=mergePublicProductPreview(base,extra);
 assert.equal(combined.fields.roast_level,undefined);
 assert.ok(combined.conflicts?.includes('roast_level'));
});
