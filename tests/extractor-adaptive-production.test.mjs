import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {gzipSync,deflateSync,brotliCompressSync} from 'node:zlib';
import {
 fetchPublicCoffeeHtml,fetchPublicCoffeeJson,fetchPublicCoffeeProductRetry,
 isCoffeeProductDetailUrl,MAX_HTML_BYTES,MAX_PRODUCT_RETRY_BYTES,safeCoffeeUrl
} from '../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {createPreviewHandler} from '../netlify/functions/coffee-url-preview.mjs';
const url='https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey';
const unrelated='https://roaster.example.com/shop';
const valid='https://coffee-roaster.org/products/ethiopia-2026';
const brandMeta='<meta property="og:type" content="product"><meta property="og:title" content="Gesha 2026"><meta property="og:site_name" content="Sample Roaster">';
const productSource='<html><head>'+brandMeta+'</head><main><h1>Gesha 2026</h1><p>Origin: Ethiopia</p><p>Process: Washed</p></main></html>';
const bigProduct=productSource.replace('</head>','<script>'+'X'.repeat(1_100_000)+'</script></head>');
function fakeHttpReply({body=productSource,encoding=null,status=200,mime='text/html',location=null,headerLength=null,chunks=1}={}){
 const observed=[];
 const request=(options,callback)=>{
  observed.push(options);
  const req=new EventEmitter();
  let response=null;
  req.destroy=()=>{if(response)response.destroy();};
  req.end=()=>{
   response=new EventEmitter();
   response.statusCode=status;
   response.headers={'content-type':mime,...(encoding?{'content-encoding':encoding}:{}),...(location?{location}:{}),...(headerLength!==null?{'content-length':String(headerLength)}:{})};
   response.destroy=()=>{};
   queueMicrotask(()=>{
    callback(response);
    if(status!==200)return;
    const buffer=Buffer.isBuffer(body)?body:Buffer.from(body);
    const n=Math.max(1,Math.min(chunks,20));
    for(let i=0;i<n;i++)
     response.emit('data',buffer.subarray(Math.floor(i*buffer.length/n),Math.floor((i+1)*buffer.length/n)));
    response.emit('end');
   });
  };
  return req;
 };
 return {request,observed};
}
test('larger retry is allowed ONLY for explicit product-shaped HTTPS paths',()=>{
 assert.equal(MAX_HTML_BYTES,900_000);
 assert.equal(MAX_PRODUCT_RETRY_BYTES,2_000_000);
 for(const u of [url,valid,'https://shop.coffee.com/shop/Mango-Tree-Blend-p734210068',
  'https://roaster.net/collections/all/products/ethiopia-123','https://other.coffee/coffee/sidama-washed'])
  assert.equal(isCoffeeProductDetailUrl(u),true,u);
 for(const u of [unrelated,'https://shop.coffee.com/shop/specials',
  'https://shop.coffee.com/collections/coffee','https://roaster.net/products',
  'https://roaster.net/products/all','https://roaster.net/products/sale',
  'https://roaster.net/','https://127.0.0.1/products/ethiopia','http://roaster.net/products/ethiopia',
  'https://roaster.net/products/ethiopia#junk','https://roaster.net/products/abc?redirect=x#junk'])
  assert.equal(isCoffeeProductDetailUrl(u),false,u);
 assert.equal(safeCoffeeUrl('https://169.254.169.254/products/coffee'),null);
});
test('compressed gzip/Brotli/deflate/identity responses preserve exact original HTML',async()=>{
 for(const [encoding,payload] of [
  ['gzip',gzipSync(productSource)],['br',brotliCompressSync(productSource)],
  ['deflate',deflateSync(productSource)],['identity',Buffer.from(productSource)]]){
  const source=fakeHttpReply({body:payload,encoding,chunks:3});
  const found=await fetchPublicCoffeeHtml(valid,{request:source.request});
  assert.equal(found.ok,true,encoding);
  assert.equal(found.html,productSource,encoding);
  assert.equal(source.observed[0].headers['Accept-Encoding'],'gzip, br');
  assert.equal(source.observed[0].rejectUnauthorized,true);
  assert.equal(source.observed[0].agent,false);
  assert.equal(typeof source.observed[0].lookup,'function');
  assert.equal(Object.keys(source.observed[0].headers).some(k=>/authorization|cookie|apikey/i.test(k)),false);
 }
});
test('decoded output is bounded EVEN when compressed wire size is tiny',async()=>{
 for(const [encoding,payload] of [
  ['gzip',gzipSync(bigProduct)],['br',brotliCompressSync(bigProduct)],
  ['deflate',deflateSync(bigProduct)]]){
  const source=fakeHttpReply({body:payload,encoding,chunks:4});
  const atNormal=await fetchPublicCoffeeHtml(valid,{request:source.request});
  assert.equal(atNormal.reason,'page_too_large',encoding);
  const atLarger=await fetchPublicCoffeeProductRetry(valid,{request:source.request});
  assert.equal(atLarger.ok,true,encoding);
  assert.equal(atLarger.html,bigProduct);
 }
 const bomb=gzipSync('x'.repeat(2_100_000));
 assert.equal((await fetchPublicCoffeeProductRetry(valid,{request:fakeHttpReply({body:bomb,encoding:'gzip'}).request})).reason,'page_too_large');
});
test('malformed, unsupported, oversized and missing-HTML responses fail closed',async()=>{
 for(const [headers,expected] of [
  [{body:Buffer.from('invalid'),encoding:'gzip'},'not_html'],
  [{body:Buffer.from('junk'),encoding:'compress'},'not_html'],
  [{body:'x'.repeat(MAX_HTML_BYTES+1),chunks:12},'page_too_large'],
  [{body:'good',headerLength:MAX_HTML_BYTES+1},'page_too_large'],
  [{body:'{}',mime:'application/json'},'not_html']
 ]){
  const result=await fetchPublicCoffeeHtml(valid,{request:fakeHttpReply(headers).request});
  assert.equal(result.reason,expected);
 }
 const unbounded=fakeHttpReply();
 assert.equal((await fetchPublicCoffeeHtml(unrelated,{request:unbounded.request,maxBytes:MAX_PRODUCT_RETRY_BYTES})).reason,'invalid_source');
 assert.equal(unbounded.observed.length,0);
 assert.equal((await fetchPublicCoffeeJson(valid,{request:unbounded.request,maxBytes:MAX_PRODUCT_RETRY_BYTES})).reason,'invalid_source');
 assert.equal(unbounded.observed.length,0);
 assert.equal((await fetchPublicCoffeeProductRetry(unrelated,{request:unbounded.request})).reason,'invalid_url');
 assert.equal(unbounded.observed.length,0);
});
test('expanded retries preserve TLS DNS pins, revalidate redirects, refuse private targets',async()=>{
 let calls=0;const options=[];
 const forwarded=(opts,cb)=>{
  options.push(opts);
  const page=calls++===0?
   fakeHttpReply({status:302,location:'/products/ethiopia-2026'}):
   fakeHttpReply({body:gzipSync(productSource),encoding:'gzip'});
  return page.request(opts,cb);
 };
 const found=await fetchPublicCoffeeProductRetry(valid,{request:forwarded});
 assert.equal(found.ok,true);
 assert.equal(calls,2);
 assert.equal(found.source_url,valid);
 assert.ok(options.every(x=>x.rejectUnauthorized===true&&typeof x.lookup==='function'&&x.agent===false));
 const bad=fakeHttpReply({status:302,location:'http://169.254.169.254/products/secret'});
 assert.equal((await fetchPublicCoffeeProductRetry(valid,{request:bad.request})).reason,'redirect_requires_review');
 assert.equal(bad.observed.length,1);
});
test('expired common deadline prevents late second network attempts',async()=>{
 const source=fakeHttpReply();
 const late=await fetchPublicCoffeeProductRetry(valid,{request:source.request,deadlineAt:Date.now()-1});
 assert.equal(late.reason,'source_unavailable');
 assert.equal(source.observed.length,0);
});
test('compaction preserves Product JSON-LD, inline product JSON and visible coffee labels',()=>{
 const value={ '@type':'Product',name:'Gesha 2026',url:valid,additionalProperty:[{name:'Origin',value:'Ethiopia'}]};
 const html='<html><head><script type="application/ld+json">'+JSON.stringify(value)+'</script>'+
  '<script type="application/json" data-product="true">{"title":"Gesha 2026","vendor":"Sample Roaster"}</script>'+
  '<style>.a{color:#000}</style><script>window.example="do not execute";</script></head>'+
  '<main><h1>Gesha 2026</h1><p>Origin: Ethiopia</p><p>Process: Washed</p></main><!--ignore--></html>';
 const compact=compactCoffeeProductHtml(html);
 assert.doesNotMatch(compact,/window\.example|\.a\{color|<!--ignore/);
 assert.match(compact,/application\/ld\+json/);
 assert.match(compact,/application\/json/);
 assert.match(compact,/Process: Washed/);
 const a=extractPublicCoffeeFacts(html,{source_url:valid});
 const b=extractPublicCoffeeFacts(compact,{source_url:valid});
 assert.deepEqual(b.fields,a.fields);
 assert.equal(compactCoffeeProductHtml('z'.repeat(MAX_PRODUCT_RETRY_BYTES+1)),'');
});
const memberEnvironment=k=>({
 SUPABASE_URL:'https://azviqqejypsefzilgonr.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_nonfunctional'
})[k];
const authorizedFetch=async endpoint=>({
 ok:true,
 json:async()=>endpoint.endsWith('/auth/v1/user')?{id:'authenticated-owner'}:
  endpoint.endsWith('/rpc/dic_session_status')?{admitted:true,emailVerified:true}:
  endpoint.endsWith('/rpc/dic_preview_cached_verified')?null:
  endpoint.endsWith('/rpc/dic_preview_preflight')?{allowed:true,ticket:'00000000-0000-4000-8000-000000000123'}:
  endpoint.endsWith('/rpc/dic_preview_complete')?{charged:true}:null
});
const request=(source_url=valid,auth=true)=>new Request('https://app.dialincollective.com/api/coffee-preview',{
 method:'POST',headers:{'Content-Type':'application/json',
  ...(auth?{'Authorization':'Bearer test.authorized.member'}:{}),
  'Origin':'https://app.dialincollective.com'},
 body:JSON.stringify({source_url})
});
test('member app fetches oversized specific product exactly twice, applying compact parsing',async()=>{
 const events=[];
 const app=createPreviewHandler({apiFetch:authorizedFetch,env:memberEnvironment,
  readHtml:async(_u,opts)=>{events.push(['normal',opts]);return {ok:false,reason:'page_too_large',source_url:valid};},
  readLargeHtml:async(u,opts)=>{events.push(['large',opts,u]);return {ok:true,html:bigProduct,source_url:u};}});
 const res=await app(request());
 const body=await res.json();
 assert.equal(res.status,200);
 assert.equal(body.ok,true);
 assert.equal(body.fields.name,'Gesha 2026');
 assert.equal(body.fields.origin,'Ethiopia');
 assert.equal(body.fields.process,'Washed');
 assert.equal(body.verification,'unverified');
 assert.deepEqual(events.map(x=>x[0]),['normal','large']);
 assert.equal(events[1][2],valid);
 assert.equal(events[0][1].deadlineAt,events[1][1].deadlineAt);
});
test('catalogs, untrusted redirects and nonoversize errors never trigger enlarged retry',async()=>{
 for(const [u,p] of [[unrelated,{ok:false,reason:'page_too_large',source_url:unrelated}],
  [valid,{ok:false,reason:'page_too_large',source_url:unrelated}],
  [valid,{ok:false,reason:'source_unavailable',source_url:valid}]]){
  let largeCalls=0;
  const app=createPreviewHandler({apiFetch:authorizedFetch,env:memberEnvironment,
   readHtml:async()=>p,
   readLargeHtml:async()=>{largeCalls++;return {ok:true,html:productSource};}});
  const response=await app(request(u));
  const body=await response.json();
  assert.equal(body.ok,false);
  assert.equal(largeCalls,0);
 }
});
test('unauthenticated and denied member accounts cause ZERO external network reads',async()=>{
 for(const admitted of [false,true]){
  let normal=0,large=0;
  const apiFetch=async endpoint=>({ok:true,json:async()=>endpoint.endsWith('/auth/v1/user')?
   {id:'member'}:endpoint.endsWith('/rpc/dic_session_status')?
    {admitted,emailVerified:true}:{allowed:false,reason:'daily_preview_limit'}});
  const app=createPreviewHandler({apiFetch,env:memberEnvironment,
   readHtml:async()=>{normal++;return {ok:false,reason:'page_too_large'};},
   readLargeHtml:async()=>{large++;return {ok:true,html:productSource};}});
  const body=await (await app(request())).json();
  assert.equal(body.ok,false);
  assert.equal(normal,0);
  assert.equal(large,0);
 }
 let calls=0;
 const app=createPreviewHandler({apiFetch:authorizedFetch,env:memberEnvironment,
  readHtml:async()=>{calls++;return {ok:false,reason:'page_too_large'};}});
 assert.equal((await app(request(valid,false))).status,401);
 assert.equal(calls,0);
});

test('product-only text/plain HTML is conditionally accepted; ordinary text and non-product URLs are not',async()=>{
 const product=fakeHttpReply({body:productSource,mime:'text/plain; charset=utf-8'});
 assert.equal((await fetchPublicCoffeeHtml(valid,{request:product.request})).ok,true);
 assert.equal((await fetchPublicCoffeeHtml(valid,{request:fakeHttpReply({body:'plain text',mime:'text/plain'}).request})).reason,'not_html');
 assert.equal((await fetchPublicCoffeeHtml(unrelated,{request:fakeHttpReply({body:productSource,mime:'text/plain'}).request})).reason,'not_html');
 assert.equal((await fetchPublicCoffeeJson(valid,{request:fakeHttpReply({body:productSource,mime:'text/plain'}).request})).reason,'not_html');
});
