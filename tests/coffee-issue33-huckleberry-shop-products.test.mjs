import test from 'node:test';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
import {safeCoffeeUrl,isCoffeeProductDetailUrl,fetchPublicCoffeeHtml,
 MAX_PRODUCT_HEADER_BYTES,MAX_PUBLIC_HEADER_BYTES} from '../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://www.huckleberryroasters.com/shop/products/india-gundikhan-washed?Size=12+OZ';
const canonical='https://www.huckleberryroasters.com/shop/products/india-gundikhan-washed';
const product={
 '@context':'https://schema.org','@type':'Product','name':'India Gundikhan Washed',
 'url':canonical,'brand':{'@type':'Brand',name:'Huckleberry Roasters'},
 'additionalProperty':[
  {'@type':'PropertyValue',name:'Process',value:'Washed'},
  {'@type':'PropertyValue',name:'Tasting Notes',value:'Butter Cookie, Golden Raisin, Macadamia Nut, Lemon Cream'}
 ],
 'description':'Saif Ulla grew this washed coffee at Gundikhan Estate, India. We taste butter cookie, macadamia, citrus, fig and golden raisin.'
};
const unrelated={...product,name:'India Gundikhan Natural',
 url:'https://www.huckleberryroasters.com/shop/products/india-gundikhan-natural',
 additionalProperty:[{name:'Process',value:'Natural'},{name:'Tasting Notes',value:'Sangria, Pomegranate'}]};
function html(p=product,{heading=true,other=unrelated}={}){
 return '<html><head><meta property="og:type" content="product"><meta property="og:title" content="India Gundikhan Washed">'+
 '<meta property="og:site_name" content="Huckleberry Roasters">'+
 '<script type="application/ld+json">'+JSON.stringify(p)+'</script>'+
 '<script type="application/ld+json">'+JSON.stringify(other)+'</script>'+
 '</head><body><main><article>'+(heading?'<h1>India Gundikhan Washed</h1>':'')+
 '<p>Processing: Washed</p><p>Tasting Notes: Butter Cookie, Golden Raisin, Macadamia Nut, Lemon Cream</p>'+
 '</article></main><aside><h2>India Gundikhan Natural</h2><p>Sangria, Pomegranate</p></aside></body></html>';
}
test('Huckleberry Size=12 OZ is a safe, bounded product-detail URL',()=>{
 assert.equal(safeCoffeeUrl(url)?.pathname,'/shop/products/india-gundikhan-washed');
 assert.equal(isCoffeeProductDetailUrl(url),true);
});
test('shop/products creates one exact same-host Shopify public product read',()=>{
 const request=shopifyProductRequest(url);
 assert.ok(request);
 assert.equal(request.handle,'india-gundikhan-washed');
 assert.equal(request.url,'https://www.huckleberryroasters.com/products/india-gundikhan-washed.js');
 assert.equal(request.sourceUrl,url);
});
test('existing ordinary Shopify public endpoint compatibility is unchanged',()=>{
 const request=shopifyProductRequest('https://coffee.example.org/products/ethiopia-test?variant=12345');
 assert.equal(request?.url,'https://coffee.example.org/products/ethiopia-test.js');
 assert.equal(request?.handle,'ethiopia-test');
});
test('reject directories, IPs, credentials and arbitrary paths',()=>{
 for(const path of [
 'https://www.huckleberryroasters.com/shop',
 'https://www.huckleberryroasters.com/shop/products/',
 'https://www.huckleberryroasters.com/shop/products/../secrets',
 'https://127.0.0.1/shop/products/india-gundikhan-washed',
 'https://user:pass@huckleberryroasters.com/shop/products/india-gundikhan-washed'
 ])assert.equal(shopifyProductRequest(path),null,path);
});
test('canonical selected Product JSON-LD survives bag Size query without borrowing the Natural coffee',()=>{
 const r=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r).slice(0,3000));
 assert.equal(r.fields.name,'India Gundikhan Washed');
 assert.match(r.fields.roaster||'',/Huckleberry/i);
 assert.equal(r.fields.process,'Washed');
 assert.match(r.fields.tasting_notes||'',/Butter Cookie|Golden Raisin|Macadamia Nut/i);
 assert.doesNotMatch(r.fields.tasting_notes||'',/Sangria|Pomegranate/i);
 assert.match(coffeeUrlPreviewMarkup(r),/India Gundikhan Washed/);
});
test('headless Huckleberry selection remains bound even when H1 is not rendered',()=>{
 const r=extractPublicCoffeeFacts(html(product,{heading:false}),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r).slice(0,3000));
 assert.equal(r.fields.name,'India Gundikhan Washed');
 assert.equal(r.fields.process,'Washed');
 assert.doesNotMatch(r.fields.tasting_notes||'',/Sangria|Pomegranate/i);
});
test('wrong Product URL cannot replace selected washed coffee with unrelated natural',()=>{
 const wrong={...product,name:'India Gundikhan Natural',url:unrelated.url,
  additionalProperty:unrelated.additionalProperty};
 const r=extractPublicCoffeeFacts(html(wrong,{heading:false,other:wrong}),{source_url:url});
 assert.ok(!r.ok||r.fields?.name!=='India Gundikhan Natural',JSON.stringify(r).slice(0,3000));
});

async function requestOptionsFor(link,{responseType='html'}={}){
 let outbound=null;
 const request=(opts)=>{
  outbound=opts;const stream=new EventEmitter();
  stream.destroy=()=>{};
  stream.end=()=>queueMicrotask(()=>stream.emit('error',new Error('Synthetic request does not contact a host')));
  return stream;
 };
 const response=await fetchPublicCoffeeHtml(link,{request,responseType});
 assert.equal(response.reason,'source_fetch_failed');
 return outbound;
}
test('published exact Huckleberry product gets bounded Shopify-friendly headers',async()=>{
 const opts=await requestOptionsFor(url);
 assert.equal(opts.maxHeaderSize,MAX_PRODUCT_HEADER_BYTES);
 assert.equal(opts.maxHeaderSize,32_000);
 assert.equal(opts.rejectUnauthorized,true);
 assert.equal(opts.agent,false);
 assert.equal(typeof opts.lookup,'function');
 assert.equal(opts.headers.Authorization,undefined);
});
test('public exact-handle Shopify JSON also permits bounded product response headers',async()=>{
 const opts=await requestOptionsFor('https://www.huckleberryroasters.com/products/india-gundikhan-washed.js',
  {responseType:'shopify_json'});
 assert.equal(opts.maxHeaderSize,MAX_PRODUCT_HEADER_BYTES);
});
test('unrelated catalog and landing pages preserve strict 12 KB header limit',async()=>{
 for(const link of ['https://www.huckleberryroasters.com/shop',
  'https://www.huckleberryroasters.com/collections/single-origin']){
  const opts=await requestOptionsFor(link);
  assert.equal(opts.maxHeaderSize,MAX_PUBLIC_HEADER_BYTES);
  assert.equal(opts.maxHeaderSize,12_000);
 }
});
