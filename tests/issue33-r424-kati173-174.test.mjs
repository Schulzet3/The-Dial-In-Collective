import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedKatiDirectFailures} from '../scripts/audit/issue33-r424-kati173-174-check.mjs';
test('current selected comparative Tanzania Lighter notes accepted',()=>{
 const t='TANZANIA Peaberry Roast Level: Lighter Tasting Notes: Blackberry, Nutmeg, and Floral';
 assert.deepEqual(selectedKatiDirectFailures(174,t,{name:'TANZANIA Peaberry',tasting_notes:'Blackberry, Nutmeg, Floral'}),[]);
});
test('a stale absolute Medium cannot replace selected comparative Lighter',()=>{
 const t='TANZANIA Peaberry Roast Level: Lighter Tasting Notes: Blackberry, Nutmeg, and Floral';
 assert.ok(selectedKatiDirectFailures(174,t,{roast_level:'Medium',tasting_notes:'Blackberry, Nutmeg, Floral'}).includes('relative_lighter_not_absolute_roast'));
});
test('other product and customer review notes are rejected',()=>{
 const t='PAPUA NEW GUINEA Highlands Roast Level: Darker Tasting Notes: Dark Chocolate, Black Cherry, and Mild Spice';
 assert.ok(selectedKatiDirectFailures(173,t,{tasting_notes:'Dark Chocolate, Black Cherry, Mild Spice, Caramel'}).includes('shopper_review_or_other_coffee_sensory_contamination'));
});
test('unpublished producer and espresso processing are not inferred',()=>{
 const t='PAPUA NEW GUINEA Highlands Roast Level: Darker Tasting Notes: Dark Chocolate, Black Cherry, and Mild Spice';
 assert.ok(selectedKatiDirectFailures(173,t,{tasting_notes:'Dark Chocolate, Black Cherry, Mild Spice',producer:'customer reviewer'}).includes('unpublished_grower_elevation_variety_process_release_decaf'));
});
test('selected seller notes must be present even if archived metadata matches',()=>{
 assert.ok(selectedKatiDirectFailures(174,'TANZANIA Peaberry Roast Level: Lighter',{tasting_notes:'Blackberry, Nutmeg, Floral'}).includes('seller_direct_tasting_not_printed'));
});

import {selectedShopifyMainRichTextCoffee} from '../src/server/coffee-selected-shopify-variant-richtext.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const selected=(name,handle,roast,notes,{wrongHandle=false,wrongId=false,review=false}={})=>{
 const url='https://coffee-store.example/products/'+handle;
 const html='<html><head><link rel="canonical" href="'+url+'">'+
  '<meta property="og:url" content="'+url+'"><meta property="og:site_name" content="Coffee Store"></head>'+
  '<body><main><section><h3><strong>Roast Level: </strong>'+roast+'</h3></section>'+
  '<section><h3><strong>Tasting Notes:</strong> '+notes+'</h3></section>'+
  '<product-info data-url="/products/'+handle+'" data-section="template--4__main" data-product-id="1234567890">'+
  '<variant-selects data-product-handle="'+(wrongHandle?'other-coffee':handle)+
  '" data-product-title="'+name+'" data-section="template--4__main" data-product-id="'+
  (wrongId?'9999999999':'1234567890')+'"></variant-selects></product-info>'+
  (review?'<div class="jdgm-review">Caramel</div>':'')+'</main></body></html>';
 return {url,html};
};
test('full parser accepts exact Shopify main variant no-H1 seller rich-text notes',()=>{
 const {url,html}=selected('TANZANIA Peaberry','tanzania-peaberry','Lighter','Blackberry, Nutmeg, and Floral');
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'TANZANIA Peaberry');
 assert.match(result.fields.tasting_notes,/Blackberry.*Nutmeg.*Floral/u);
 assert.equal(result.fields.roast_level,undefined);
});
test('incorrect variant ID and handle cannot prove exact selected merchant product',()=>{
 for(const option of [{wrongId:true},{wrongHandle:true}]){
  const {url,html}=selected('TANZANIA Peaberry','tanzania-peaberry','Lighter','Blackberry, Nutmeg, and Floral',option);
  assert.equal(selectedShopifyMainRichTextCoffee(html,{source_url:url}),null);
 }
});
test('no customer review contamination in selected seller direct H3 notes',()=>{
 const {url,html}=selected('PAPUA NEW GUINEA Highlands','papua-new-guinea-highlands',
  'Darker','Dark Chocolate, Black Cherry, and Mild Spice',{review:true});
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 assert.match(result.fields.tasting_notes,/Mild Spice/u);
 assert.ok(!/Caramel/u.test(result.fields.tasting_notes));
 assert.equal(result.fields.roast_level,undefined);
});
test('fake selected canonical other coffee fails source identity',()=>{
 const {url,html}=selected('TANZANIA Peaberry','tanzania-peaberry','Lighter','Blackberry, Nutmeg, and Floral');
 assert.equal(selectedShopifyMainRichTextCoffee(html.replace('rel="canonical" href="'+url+'"',
  'rel="canonical" href="https://coffee-store.example/products/other-coffee"'),{source_url:url}),null);
});
