import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedShopifyMainProductH2Identity as check} from '../scripts/audit/issue33-shopify-main-product-h2.mjs';
const url='https://dailyrisecoffee.com/products/organic-brazil';
const opts={source_url:url,expected_name:'Brazil Organic',parsed_name:'Brazil Organic'};
function make(o={}){
 const h=o.handle||'organic-brazil',title=o.title||'Brazil Organic',a=o.action||'/cart/add';
 const form=o.noForm?'':'<form class="main-product--form" action="'+a+'" method="post" id="product_form_7077"><input name="form_type" value="'+(o.type||'product')+'"><div class="product--block" data-block-type="heading"><h2 class="product--block--heading" data-item="section-heading">'+title+'</h2>'+(o.extra||'')+'</div></form>';
 const root='<div class="main-product--root" data-handle="'+h+'" data-section-type="product_page" data-product-id="template__main_7077">'+form+'<product-options-element data-main-product="true" data-product-handle="'+(o.optionsHandle||h)+'" data-product-url="/products/'+h+'"></product-options-element></div>';
 return '<main>'+root+(o.duplicate?root:'')+'</main><aside class="related-products"><h2>'+(o.related||'Other Coffee')+'</h2></aside>';
}
test('exact purchasable selected H2 is accepted',()=>assert.equal(check(make(),opts)?.selected_title,'Brazil Organic'));
test('related product cannot replace selected title',()=>assert.equal(check(make({title:'Other Coffee',related:'Brazil Organic'}),opts),null));
test('reused handle fails',()=>assert.equal(check(make({handle:'different'}),opts),null));
test('absent purchase form fails',()=>assert.equal(check(make({noForm:true}),opts),null));
test('non-cart action fails',()=>assert.equal(check(make({action:'/contact'}),opts),null));
test('nonproduct form fails',()=>assert.equal(check(make({type:'contact'}),opts),null));
test('options handle mismatch fails',()=>assert.equal(check(make({optionsHandle:'other'}),opts),null));
test('duplicate root fails',()=>assert.equal(check(make({duplicate:true}),opts),null));
test('multiple selected headings fail',()=>assert.equal(check(make({extra:'<h2 class="product--block--heading" data-item="section-heading">Brazil Organic</h2>'}),opts),null));
test('parsed identity mismatch fails',()=>assert.equal(check(make(),{...opts,parsed_name:'Other'}),null));
test('query and insecure sources fail',()=>{
 assert.equal(check(make(),{...opts,source_url:url+'?variant=1'}),null);
 assert.equal(check(make(),{...opts,source_url:'http://dailyrisecoffee.com/products/organic-brazil'}),null);
});
