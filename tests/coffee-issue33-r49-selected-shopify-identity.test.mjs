import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedShopifyCurrentVisibleIdentity as verify} from '../scripts/audit/issue33-shopify-current-visible-identity.mjs';
const url='https://www.seycoffee.com/products/2026-yaye-arbegona-ethiopia';
const name='2026 Yaye Arbegona - Ethiopia';
const hero=(kind,producer='Yaye Arbegona',country='Ethiopia')=>
 '<div class="coffee_title coffee_title'+kind+'"><span class="coffeeTitle_producer">'+producer+
 '</span><span class="coffeeTitle_farm"></span><span class="coffeeTitle_varietyProcess">ETHIOPIAN LANDRACE - WASHED</span><span class="coffeeTitle_country">'+country+'</span></div>';
const fixture=({id=15427620012286,trackerId=id,itemId=id,selected=name,productUrl=url,
 trackerPage='www.seycoffee.com/products/2026-yaye-arbegona-ethiopia',
 parsed='SEY - '+name,brand='SEY COFFEE',first=hero('Mobile'),second=hero('Desktop'),og=''}={})=>({
 html:'<html><head><title>'+og+'</title><meta property="og:title" content="'+og+
 '"></head><body><script id="__st">var __st='+JSON.stringify({
 p:'product',rtyp:'product',rid:trackerId,pageurl:trackerPage})+';</script>'+
 '<script>var item = {Name: '+JSON.stringify(selected)+', ProductID: '+itemId+
 ', URL: '+JSON.stringify(productUrl)+', Brand: '+JSON.stringify(brand)+'};</script>'+
 first+second+'</body></html>',parsed
});
const yes=(opts={})=>{const x=fixture(opts);
 return verify(x.html,{source_url:url,expected_name:name,parsed_name:x.parsed});};
test('R49 H1-free selected active Shopify product identity has exact tracker ID, URL, analytics item and visible matching hero',()=>{
 const got=yes();
 assert.equal(got?.selected_title,name);
 assert.equal(got?.visible_producer,'Yaye Arbegona');
 assert.equal(got?.verified_product_id,'15427620012286');
});
test('R49 rejects mismatched current product ID and related product identity',()=>{
 assert.equal(yes({itemId:15427620012287}),null);
 assert.equal(yes({selected:'2025 Yaye Arbegona - Ethiopia'}),null);
 assert.equal(yes({trackerId:15427620012287}),null);
});
test('R49 reused handle or wrong official domain never proves current identity',()=>{
 assert.equal(yes({productUrl:'https://www.seycoffee.com/products/2025-yaye-arbegona-ethiopia'}),null);
 assert.equal(yes({trackerPage:'www.other-roaster.com/products/2026-yaye-arbegona-ethiopia'}),null);
});
test('R49 SEO-only, missing or mismatched visible selected hero never proves an archived release',()=>{
 assert.equal(yes({first:'',second:'',og:name}),null);
 assert.equal(yes({first:hero('Mobile','Different Farmer'),second:hero('Desktop')}),null);
 assert.equal(yes({first:hero('Mobile'),second:hero('Desktop','Yaye Arbegona','Kenya')}),null);
 assert.equal(yes({first:hero('Mobile'),second:hero('Mobile')}),null);
});
test('R49 name must be supported by exact official Shopify title and parsed selected coffee',()=>{
 assert.equal(yes({parsed:'SEY - 2025 Yaye Arbegona - Ethiopia'}),null);
 assert.equal(yes({parsed:'Another Roaster - '+name}),null);
 assert.equal(yes({parsed:'2026 Yaye Arbegona - Ethiopia'}).selected_title,name);
});
test('R49 a script or hidden unrelated H1 is not substituted for a selected visible Shopify hero',()=>{
 const x=fixture({first:'<h1>Another Coffee</h1>'+hero('Mobile')});
 assert.equal(verify(x.html,{source_url:url,expected_name:name,parsed_name:x.parsed}),null);
});
