// Original603 #309: exact currently selected Shopify inline Product roast taxonomy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentInlineShopifyRoastTag} from '../src/server/coffee-current-inline-shopify-product.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://shop.compasscoffee.com/products/horizon-blend';
const root={id:6615007330400,title:'Horizon Blend',handle:'horizon-blend',vendor:'Compass Coffee',
 tags:['12oz','africa','region:africa','medium body','roast:light roast','blend'],
 variants:[{id:4,title:'12oz Tin'},{id:5,title:'5lb Bag'}]};
function markup(obj=root,{title='Horizon Blend',source=url,extra='',story='Light Body: A refreshing choice.'}={}){
 return {source,html:'<html><head><meta property="og:type" content="product"><meta property="og:title" content="'+
 title+'"><meta property="og:site_name" content="Compass Coffee"><meta property="og:url" content="'+source+
 '"></head><body><main><article class="product"><h1>'+title+'</h1><p>'+story+
 '</p></article></main><script>window.theme={};\ntheme.product = '+JSON.stringify(obj)+';\ntheme.product.options = [];</script>'+
 extra+'</body></html>'};
}
function tag(obj=root,opts={}){
 const {source,html}=markup(obj,opts);
 return selectedCurrentInlineShopifyRoastTag(html,{source_url:source,name:opts.title||'Horizon Blend',roaster:'Compass Coffee'});
}
test('#309 exact selected current product roast tag, not marketing light body, recovers Light',()=>{
 const p=tag();assert.equal(p?.value,'Light');
 const {html,source}=markup();const result=extractPublicCoffeeFacts(html,{source_url:source});
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.fields.roast_level,'Light',JSON.stringify(result));
 assert.notEqual(result.fields.origin,'Africa',JSON.stringify(result));
 assert.equal(result.fields.name,'Horizon Blend');
 assert.ok(!result.conflicts||result.conflicts.length===0);
});
test('selected product title mismatch blocks another roast',()=>assert.equal(tag(root,{title:'Another Blend'}),null));
test('different product handle cannot supply roast to selected URL',()=>assert.equal(tag({...root,handle:'another-blend'}),null));
test('different vendor cannot supply exact product roast',()=>assert.equal(tag({...root,vendor:'Other Roastery'}),null));
test('regional taxonomy, unrelated light body and generic catalog category do not prove roast or origin',()=>{
 const x={...root,tags:['region:africa','medium body','best light roast coffee','light']};
 assert.equal(tag(x),null);
 const {html,source}=markup(x);const p=extractPublicCoffeeFacts(html,{source_url:source});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.notEqual(p.fields.origin,'Africa');assert.notEqual(p.fields.roast_level,'Light');
});
test('two conflicting current selected roast tags cannot silently choose',()=>{
 assert.equal(tag({...root,tags:['roast:light roast','roast:dark roast']}),null);
});
test('wrong URL product and unrelated supplementary script cannot donate roast',()=>{
 assert.equal(tag(root,{source:'https://shop.compasscoffee.com/products/other-coffee'}),null);
 const {html}=markup(root,{extra:'<script>theme.product = '+JSON.stringify({...root,handle:'related',title:'Related'})+';</script>'});
 assert.equal(selectedCurrentInlineShopifyRoastTag(html,{source_url:url,name:'Horizon Blend',roaster:'Compass Coffee'})?.value,'Light');
});
test('duplicated conflicting same-product inline assignment fails closed',()=>{
 const {html}=markup(root,{extra:'<script>theme.product = '+JSON.stringify({...root,tags:['roast:dark roast']})+';</script>'});
 assert.equal(selectedCurrentInlineShopifyRoastTag(html,{source_url:url,name:'Horizon Blend',roaster:'Compass Coffee'}),null);
});
test('script tags cannot fake a current product with broken JSON',()=>{
 const broken=markup(root).html.replace('"handle":"horizon-blend"','"handle":');
 assert.equal(selectedCurrentInlineShopifyRoastTag(broken,{source_url:url,name:'Horizon Blend',roaster:'Compass Coffee'}),null);
});
