import test from 'node:test';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
import {safeCoffeeUrl,isCoffeeProductDetailUrl,fetchPublicCoffeeHtml,
 MAX_PRODUCT_HEADER_BYTES,MAX_PUBLIC_HEADER_BYTES} from '../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';
import {extractSelectedReactRouterCoffeeHydration} from '../src/server/coffee-react-router-hydration.mjs';

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


// Additional exact-product Shopify Hydrogen/react-router stream regression.
function selectedHydrogenStream({title='India Gundikhan Washed',handle='india-gundikhan-washed',vendor='Huckleberry Roasters',
 notes=['Butter Cookie','Golden Raisin','Macadamia Nut','Lemon Cream'],roast='Medium',related=true,route='routes/shop.products.$handle'}={}){
 const flat=[null],value=x=>(flat.push(x),flat.length-1);
 const object=fields=>{
  const out={};for(const [k,v] of Object.entries(fields))out['_'+value(k)]=v;
  return value(out);
 };
 const coffee=object({tastingNotes:value(notes.map(value)),roastLevel:value(roast)});
 const selected=object({title:value(title),vendor:value(vendor),handle:value(handle),
  id:value('gid://shopify/Product/8030692966474'),coffee});
 const loader=object({product:selected});
 const relatedCoffee=object({tastingNotes:value(['Sangria','Pomegranate'].map(value)),roastLevel:value('Dark')});
 const relatedProduct=object({title:value('India Gundikhan Natural'),vendor:value('Huckleberry Roasters'),
  handle:value('india-gundikhan-natural'),id:value('gid://shopify/Product/8030692966401'),coffee:relatedCoffee});
 const loaders=object({[route]:loader,...(related?{'routes/shop':object({product:relatedProduct})}:{})});
 const root=object({loaderData:loaders});flat[0]=flat[root];
 return '<script>window.__reactRouterContext.streamController.enqueue('+JSON.stringify(JSON.stringify(flat))+');</script>';
}
test('selected Hydrogen route provides exact notes and Medium, never a related Natural product',()=>{
 const shell='<html><head><title>India Gundikhan Washed | HUCK</title><meta property="og:site_name" content="Huckleberry Roasters">'+
 '<script type="application/ld+json">'+JSON.stringify({...product,additionalProperty:[{name:'Process',value:'Washed'}],description:'Washed selected coffee in India'})+'</script></head><body><main><h1>India Gundikhan Washed</h1></main>';
 const html=shell+selectedHydrogenStream()+'</body></html>';
 const compact=compactCoffeeProductHtml(html);
 assert.match(compact,/streamController\.enqueue/);
 const result=extractPublicCoffeeFacts(compact,{source_url:url});
 assert.equal(result.ok,true,JSON.stringify(result).slice(0,3000));
 assert.equal(result.fields.tasting_notes,'Butter Cookie, Golden Raisin, Macadamia Nut, Lemon Cream');
 assert.equal(result.fields.roast_level,'Medium');
 assert.doesNotMatch(result.fields.tasting_notes,/Sangria|Pomegranate/);
 assert.ok(result.source_facts?.some(f=>f.field==='tasting_notes'&&f.section.includes('selected product React Router')));
});
test('hydration reader refuses wrong handle, vendor, title and unrelated route',()=>{
 const original=options=>extractSelectedReactRouterCoffeeHydration(selectedHydrogenStream(options),{
  source_url:url,expected_name:'India Gundikhan Washed',expected_roaster:'Huckleberry Roasters'});
 assert.equal(original({handle:'india-gundikhan-natural'}),null);
 assert.equal(original({title:'India Gundikhan Natural'}),null);
 assert.equal(original({vendor:'Different Roaster'}),null);
 assert.equal(original({route:'routes/shop'}),null);
});
test('related products cannot donate notes or roast to selected product without their own values',()=>{
 const empty=selectedHydrogenStream({notes:[],roast:'Other'});
 assert.equal(extractSelectedReactRouterCoffeeHydration(empty,{source_url:url,
  expected_name:'India Gundikhan Washed',expected_roaster:'Huckleberry Roasters'}),null);
});
test('compact HTML strips arbitrary executable scripts and retains only bounded selected-data stream',()=>{
 const unsafe='<script>window.location.href="https://coffee.example.org/";</script>';
 const html='<html><body>'+unsafe+selectedHydrogenStream()+'</body></html>';
 const compact=compactCoffeeProductHtml(html);
 assert.doesNotMatch(compact,/window\.location/);
 assert.match(compact,/streamController\.enqueue/);
 assert.equal(extractSelectedReactRouterCoffeeHydration(unsafe,{source_url:url,
  expected_name:'India Gundikhan Washed',expected_roaster:'Huckleberry Roasters'}),null);
});
test('malformed or oversized Hydrogen data cannot become coffee facts',()=>{
 const malformed='<script>window.__reactRouterContext.streamController.enqueue("{invalid}");</script>';
 assert.equal(extractSelectedReactRouterCoffeeHydration(malformed,{source_url:url,
  expected_name:'India Gundikhan Washed',expected_roaster:'Huckleberry Roasters'}),null);
 const oversized='<script>window.__reactRouterContext.streamController.enqueue('+JSON.stringify('['+'0'.repeat(255_000)+']')+');</script>';
 assert.equal(extractSelectedReactRouterCoffeeHydration(oversized,{source_url:url,
  expected_name:'India Gundikhan Washed',expected_roaster:'Huckleberry Roasters'}),null);
 assert.doesNotMatch(compactCoffeeProductHtml(oversized),/streamController\.enqueue/);
});

test('current Hydrogen Medium is not replaced by different coffee Dark Roast card',()=>{
 const staleCard='<aside><h3>Bom Senso Dark Roast</h3><p>Dark Roast</p></aside>';
 const shell='<html><head><meta property="og:site_name" content="Huckleberry Roasters">'+
 '<script type="application/ld+json">'+JSON.stringify({...product,
  additionalProperty:[{name:'Process',value:'Washed'}]})+
 '</script></head><body><main><h1>India Gundikhan Washed</h1><article>'+staleCard+'</article></main>';
 const data=compactCoffeeProductHtml(shell+selectedHydrogenStream()+'</body></html>');
 const result=extractPublicCoffeeFacts(data,{source_url:url});
 assert.equal(result.fields.tasting_notes,'Butter Cookie, Golden Raisin, Macadamia Nut, Lemon Cream',JSON.stringify(result).slice(0,3000));
 assert.equal(result.fields.roast_level,'Medium',JSON.stringify(result).slice(0,3000));
 assert.doesNotMatch(result.fields.tasting_notes,/Sangria|Pomegranate/);
});
