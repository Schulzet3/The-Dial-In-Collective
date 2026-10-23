import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewHandler} from '../netlify/functions/coffee-url-preview.mjs';
import {wooProductRequest,extractWooStoreData} from '../src/server/coffee-woocommerce-store.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

const source='https://coffee-example.com/products/arbey-cordoba-26';
const values={name:'Arbey Cordoba',roaster:'Example Roaster',release_label:'2026',
 origin:'Huila, Colombia',process:'Washed',roast_level:'Light',elevation_m:'1886 masl',
 variety:'Bourbon Ají',producer:'Arbey Cordoba',tasting_notes:'mango, bing cherry, pineapple'};
const labels={release_label:'Harvest',origin:'Origin',process:'Process',roast_level:'Roast Level',
 elevation_m:'Elevation',variety:'Variety',producer:'Producer',tasting_notes:'Tasting Notes'};
const htmlFor=fields=>'<script type="application/ld+json">'+JSON.stringify({
 '@type':'Product',name:fields.name,url:source,brand:fields.roaster,
 additionalProperty:Object.entries(fields).filter(([key])=>labels[key]).map(([key,value])=>({name:labels[key],value}))
})+'</script><main><h1>'+fields.name+'</h1></main>';
const endpointData=fields=>({title:fields.name,handle:'arbey-cordoba-26',vendor:fields.roaster,
 description:Object.entries(fields).filter(([key])=>labels[key]).map(([key,value])=>'<p>'+labels[key]+': '+value+'</p>').join('')});
const env=key=>({SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_nonfunctional'}[key]);
const request=()=>new Request('https://app.dialincollective.com/api/coffee-preview',{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture.jwt',Origin:'https://app.dialincollective.com'},
 body:JSON.stringify({source_url:source})
});
function fixture({catalog=null,fields=values,page=null,jsonData=endpointData(values),freshReason=null,cachedReason=null}={}){
 const state={catalog,admitted:true,emailVerified:true},calls=[];
 const apiFetch=async (url,options)=>{
  const method=url.split('/').at(-1),body=options.body?JSON.parse(options.body):null;
  calls.push({method,body});
  let data;
  if(method==='user')data={id:'fixture-member'};
  else if(method==='dic_session_status')data={admitted:state.admitted,emailVerified:state.emailVerified};
  else if(method==='dic_preview_cached_verified')data=state.catalog;
  else if(method==='dic_preview_preflight'){
   const reason=body.p_cached?cachedReason:freshReason;
   data=reason?{allowed:false,reason}:{allowed:true,...(body.p_cached?{}:{ticket:'00000000-0000-4000-8000-000000000123'})};
  }else if(method==='dic_preview_complete')data={charged:true};
  return {ok:true,json:async()=>data};
 };
 const sourceCalls=[];
 const handler=createPreviewHandler({env,apiFetch,
  readHtml:async (url,options)=>{sourceCalls.push({type:'html',url,options});if(page instanceof Error)throw page;return page||{ok:true,html:htmlFor(fields)};},
  readLargeHtml:async (url,options)=>{sourceCalls.push({type:'large',url,options});return {ok:false,reason:'page_too_large'};},
  readJson:async (url,options)=>{sourceCalls.push({type:'json',url,options});return jsonData?{ok:true,json:JSON.stringify(jsonData)}:{ok:false,reason:'source_unavailable'};}
 });
 const invoke=async()=>{const response=await handler(request());return {status:response.status,body:await response.json()};};
 return {state,calls,sourceCalls,invoke};
}
const catalog=fields=>({ok:true,source:'verified_catalog',source_url:source,fields});

test('a missing variety triggers one exact-product enrichment even when six other facts exist',async()=>{
 const fields={...values};delete fields.variety;
 const f=fixture({fields}),{body,status}=await f.invoke();
 assert.equal(status,200);assert.equal(body.fields.variety,'Bourbon Ají');
 assert.equal(body.verification,'unverified');assert.equal(body.catalog_approved,undefined);
 assert.deepEqual(f.sourceCalls.map(x=>x.type),['html','json']);
 assert.equal(f.sourceCalls[1].url,'https://coffee-example.com/products/arbey-cordoba-26.js');
 assert.equal(f.sourceCalls[0].options.deadlineAt,f.sourceCalls[1].options.deadlineAt);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_preflight').length,1);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
});
test('every missing autofill fact is eligible for bounded enrichment, including harvest and roaster',async()=>{
 for(const key of Object.keys(values).filter(key=>key!=='name')){
  const fields={...values};delete fields[key];
  const f=fixture({fields}),{body}=await f.invoke();
  assert.equal(body.fields[key],values[key],key);
  assert.equal(f.sourceCalls.filter(x=>x.type==='json').length,1,key);
 }
});
test('complete HTML core facts still gain complementary endpoint recipe and supplementary details',async()=>{
 const jsonData=endpointData(values);
 jsonData.description+='<p>Recommended Rest: 14–21 days</p><h2>Espresso Recommendations:</h2>'+
  '<p>Dose: 18g Output: 45g Time: 25s–30s</p>';
 const f=fixture({jsonData}),{body}=await f.invoke();
 assert.deepEqual(body.fields,values);
 assert.deepEqual(body.roaster_recipe,{dose_g:18,time_s_min:25,time_s_max:30,method:'Espresso',yield_g:45});
 assert.equal(body.roaster_details.recommended_rest,'14–21 days');
 assert.deepEqual(f.sourceCalls.map(x=>x.type),['html','json']);
 assert.equal(f.sourceCalls[0].options.deadlineAt,f.sourceCalls[1].options.deadlineAt);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_preflight').length,1);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
});
test('complete HTML core facts are checked against exact-product endpoint conflicts',async()=>{
 const f=fixture({jsonData:endpointData({...values,variety:'Caturra',release_label:'2025'})}),{body}=await f.invoke();
 assert.equal(body.fields.variety,undefined);assert.equal(body.fields.release_label,undefined);
 assert.deepEqual(body.conflicts,['release_label','variety']);
 assert.equal(body.fields.producer,values.producer);assert.equal(body.verification,'unverified');
 assert.equal(body.catalog_approved,undefined);
 assert.deepEqual(f.sourceCalls.map(x=>x.type),['html','json']);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
});
test('a complete approved catalog retains the free cooldown-enforced fast path',async()=>{
 const f=fixture({catalog:catalog({...values})}),{body}=await f.invoke();
 assert.equal(body.source,'approved_catalog');assert.equal(body.catalog_approved,true);
 assert.equal(body.source_verified,false);assert.equal(body.verification,'unverified');
 assert.equal(body.cached,true);assert.equal(f.sourceCalls.length,0);
 assert.deepEqual(f.calls.filter(x=>x.method==='dic_preview_preflight').map(x=>x.body),[{p_cached:true}]);
 assert.equal(f.calls.some(x=>x.method==='dic_preview_complete'),false);
});
test('an incomplete approved catalog cannot suppress fresh fields or confer approval on them',async()=>{
 const f=fixture({catalog:catalog({name:values.name,roaster:values.roaster})}),{body}=await f.invoke();
 assert.equal(body.fields.variety,'Bourbon Ají');assert.equal(body.source,'unverified_public_page');
 assert.equal(body.catalog_approved,undefined);assert.equal(body.verification,'unverified');
 assert.equal(body.cached,undefined);assert.equal(f.sourceCalls[0].type,'html');
 assert.deepEqual(f.calls.filter(x=>x.method==='dic_preview_preflight').map(x=>x.body),[{p_cached:false}]);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
});
test('fresh source fields do not silently inherit absent or obsolete catalog values',async()=>{
 const fields={...values};delete fields.variety;
 const f=fixture({catalog:catalog({name:values.name,roaster:values.roaster,variety:'Old Variety'}),fields,jsonData:null});
 const {body}=await f.invoke();assert.equal(body.ok,true);assert.equal(body.fields.variety,undefined);
 assert.equal(body.catalog_approved,undefined);assert.equal(body.source,'unverified_public_page');
});
test('warm public evidence wins over an incomplete catalog and stays quota-free',async()=>{
 const f=fixture();const first=await f.invoke();
 f.state.catalog=catalog({name:values.name,roaster:values.roaster});
 const catalogCalls=f.calls.filter(x=>x.method==='dic_preview_cached_verified').length;
 const second=await f.invoke();
 assert.deepEqual(second.body.fields,first.body.fields);assert.equal(second.body.cached,true);
 assert.equal(second.body.catalog_approved,undefined);assert.equal(second.body.source,'unverified_public_page');
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_cached_verified').length,catalogCalls);
 assert.equal(f.sourceCalls.length,2);assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
 assert.deepEqual(f.calls.filter(x=>x.method==='dic_preview_preflight').map(x=>x.body),[{p_cached:false},{p_cached:true}]);
});
test('fresh admission and verified email are required before returning warm or catalog evidence',async()=>{
 for(const denied of ['admitted','emailVerified']){
  const f=fixture();await f.invoke();f.state.catalog=catalog({...values});f.state[denied]=false;
  const {status,body}=await f.invoke();assert.equal(status,403);assert.equal(body.reason,'admitted_member_required');
  assert.equal(f.sourceCalls.length,2);assert.equal(f.calls.filter(x=>x.method==='dic_preview_preflight').length,1);
 }
});
test('denied retrieval quota cannot fetch; a usable catalog may still take its allowed free path',async()=>{
 const f=fixture({freshReason:'daily_preview_limit'}),denied=await f.invoke();
 assert.equal(denied.status,429);assert.equal(f.sourceCalls.length,0);
 const cached=fixture({catalog:catalog({name:values.name,roaster:values.roaster}),freshReason:'daily_preview_limit'});
 const {body}=await cached.invoke();assert.equal(body.ok,true);assert.equal(body.source,'approved_catalog');
 assert.equal(body.source_verified,false);assert.equal(body.refresh_reason,'daily_preview_limit');
 assert.equal(cached.sourceCalls.length,0);assert.equal(cached.calls.some(x=>x.method==='dic_preview_complete'),false);
 assert.deepEqual(cached.calls.filter(x=>x.method==='dic_preview_preflight').map(x=>x.body),[{p_cached:false},{p_cached:true}]);
});
test('catalog fallback never bypasses a shared cooldown refusal',async()=>{
 const f=fixture({catalog:catalog({name:values.name,roaster:values.roaster}),freshReason:'preview_cooldown'});
 const {status,body}=await f.invoke();assert.equal(status,429);assert.equal(body.reason,'preview_cooldown');
 assert.equal(f.sourceCalls.length,0);assert.equal(f.calls.filter(x=>x.method==='dic_preview_preflight').length,1);
});
test('transient or thrown source failures retain usable catalog details without charging or warming them',async()=>{
 for(const page of [{ok:false,reason:'source_unavailable'},new Error('Source transport unavailable')]){
  const f=fixture({catalog:catalog({name:values.name,roaster:values.roaster}),page,jsonData:null});
  const {status,body}=await f.invoke();assert.equal(status,200);assert.equal(body.ok,true);
  assert.equal(body.source,'approved_catalog');assert.equal(body.source_verified,false);assert.equal(body.cached,true);
  assert.ok(['source_unavailable','source_fetch_failed'].includes(body.refresh_reason));
  assert.equal(f.calls.some(x=>x.method==='dic_preview_complete'),false);
  await f.invoke();assert.equal(f.sourceCalls.filter(x=>x.type==='html').length,2,'fallback must not become a fresh source-cache entry');
 }
});
test('a completed non-transient source failure charges once and falls back without claiming verification',async()=>{
 const f=fixture({catalog:catalog({name:values.name,roaster:values.roaster}),page:{ok:false,reason:'page_too_large'},jsonData:null});
 const {body}=await f.invoke();assert.equal(body.ok,true);assert.equal(body.refresh_reason,'page_too_large');
 assert.equal(body.source,'approved_catalog');assert.equal(body.source_verified,false);
 assert.equal(f.calls.filter(x=>x.method==='dic_preview_complete').length,1);
 assert.deepEqual(f.sourceCalls.map(x=>x.type),['html','large','json']);
});
test('nested Woo product permalinks require an exact returned canonical path',()=>{
 const url='https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/';
 const req=wooProductRequest(url);assert.equal(req?.slug,'samuel-jr');
 assert.equal(req.api,'https://manhattancoffeeroasters.com/wp-json/wc/store/v1/products/samuel-jr');
 const data={name:'Samuel Jr.',slug:'samuel-jr',permalink:url,description:'<p>Variety: Caturra Chiroso</p>'};
 assert.equal(extractWooStoreData(data,req)?.fields.variety,'Caturra Chiroso');
 for(const wrong of [undefined,'','https://manhattancoffeeroasters.com/product/other/samuel-jr/',
  'https://other-coffee.com/product/coffees/world-class/samuel-jr/']){
  assert.equal(extractWooStoreData({...data,permalink:wrong},req),null,String(wrong));
 }
 for(const bad of ['https://manhattancoffeeroasters.com/product-category/coffees/world-class/',
  'https://manhattancoffeeroasters.com/product/a/b/c/d/e/samuel-jr/',
  'https://127.0.0.1/product/coffees/world-class/samuel-jr/'])assert.equal(wooProductRequest(bad),null,bad);
});
test('product-endpoint roast enrichment retains its provisional evidence and HTML recipe/details',()=>{
 const extra=extractShopifyAjaxData({title:values.name,handle:'arbey-cordoba-26',description:'<p>Agtron: 75</p>'},shopifyProductRequest(source));
 assert.equal(extra.fields.roast_level,'Light');assert.match(extra.roast_hint,/Provisional/);
 const recipe={dose_g:18,yield_g:36,time_s_min:22,time_s_max:24};
 const base={ok:true,fields:{name:values.name},roaster_details:{farm:'El Diviso'},roaster_recipe:recipe};
 const result=mergePublicProductPreview(base,extra);
 assert.equal(result.fields.roast_level,'Light');assert.equal(result.roast_hint,extra.roast_hint);
 assert.equal(result.roast_source,'agtron_provisional_review');
 assert.deepEqual(result.roaster_recipe,recipe);assert.equal(result.roaster_details.farm,'El Diviso');
 assert.equal(result.roaster_details.agtron,'75');
});
test('roast conflict from either source cannot resurrect a value or positive roast provenance',()=>{
 const base={ok:true,fields:{name:values.name,roast_level:'Light'},roast_source:'explicit_label',roast_hint:'Light is marked.'};
 const extra={ok:true,fields:{name:values.name,roast_level:'Medium'},roast_source:'agtron_provisional_review',roast_hint:'Provisional Medium.'};
 for(const [a,b] of [[base,extra],[extra,base],
  [{...base,fields:{name:values.name},conflicts:['roast_level']},extra],
  [base,{...extra,fields:{name:values.name},conflicts:['roast_level']}]] ){
  const result=mergePublicProductPreview(a,b);
  assert.equal(result.fields.roast_level,undefined);assert.ok(result.conflicts.includes('roast_level'));
  assert.equal(result.roast_source,undefined);assert.match(result.roast_hint,/Conflicting source roast details/);
 }
});
test('existing HTML roast provenance survives compatible enrichment without taking endpoint assumptions',()=>{
 const base={ok:true,fields:{name:values.name,roast_level:'Light'},roast_source:'explicit_label',roast_hint:'The product explicitly labels Light.'};
 const extra={ok:true,fields:{name:values.name,roast_level:'Light',variety:'Bourbon Ají'},roast_source:'agtron_provisional_review',roast_hint:'Provisional Light.'};
 const result=mergePublicProductPreview(base,extra);
 assert.equal(result.roast_source,base.roast_source);assert.equal(result.roast_hint,base.roast_hint);
 assert.equal(result.fields.variety,'Bourbon Ají');
});
test('explicit mixed processing survives a narrower endpoint or HTML summary with its source details',()=>{
 const read=process=>extractShopifyAjaxData({title:values.name,handle:'arbey-cordoba-26',
  description:'<p>Process: '+process+'</p>'},shopifyProductRequest(source));
 const mixed=read('Washed & Natural'),washed=read('Washed');
 washed.roaster_details={processing_detail:'Washed'};
 for(const [base,extra] of [[mixed,washed],[washed,mixed]]){
  const result=mergePublicProductPreview(base,extra);
  assert.equal(result.fields.process,'Other/Unknown');
  assert.equal(result.roaster_details.processing_detail,'Washed & Natural');
  assert.ok(!result.conflicts?.includes('process'));
 }
});
test('mixed-process enrichment never clears an already documented process conflict',()=>{
 const conflicted={ok:true,fields:{name:values.name},conflicts:['process']};
 const mixed={ok:true,fields:{name:values.name,process:'Other/Unknown'},roaster_details:{processing_detail:'Washed & Natural'}};
 for(const [base,extra] of [[conflicted,mixed],[mixed,conflicted]]){
  const result=mergePublicProductPreview(base,extra);
  assert.equal(result.fields.process,undefined);assert.ok(result.conflicts.includes('process'));
 }
 const result=mergePublicProductPreview({ok:true,fields:{name:values.name,process:'Washed'}},
  {ok:true,fields:{name:values.name,process:'Natural'}});
 assert.equal(result.fields.process,undefined);assert.ok(result.conflicts.includes('process'));
});
test('a ratio-only HTML reference gains a compatible complete endpoint espresso recipe',()=>{
 const base={ok:true,fields:{name:values.name},roaster_recipe:{ratio:2.5,method:'Espresso'}};
 const recipe={dose_g:18,yield_g:45,time_s_min:25,time_s_max:30,temperature:'94°C',method:'Breville Espresso'};
 const result=mergePublicProductPreview(base,{ok:true,fields:{name:values.name},roaster_recipe:recipe});
 assert.deepEqual(result.roaster_recipe,{...recipe,ratio:2.5});
 assert.deepEqual(base.roaster_recipe,{ratio:2.5,method:'Espresso'},'source object stays unchanged');
 const range={dose_g:18,yield_g_min:40,yield_g_max:48,time_s_min:25,time_s_max:30,ratio:2.5,method:'Espresso'};
 assert.deepEqual(mergePublicProductPreview(base,{ok:true,fields:{name:values.name},roaster_recipe:range}).roaster_recipe,range);
});
test('different or uncorroborated espresso recipes are not combined into a new recipe',()=>{
 const base={ok:true,fields:{name:values.name},roaster_recipe:{ratio:2.5,method:'Espresso'}};
 const recipe={dose_g:18,yield_g:36,time_s_min:25,time_s_max:30,method:'Espresso'};
 for(const extra of [recipe,{...recipe,ratio:2.5},{...recipe,yield_g:45,ratio:2},
  {dose_g:18,yield_g_min:40,yield_g_max:48,time_s_min:25,time_s_max:30,method:'Espresso'},
  {dose_g:18,yield_g:45,method:'Espresso'},
  {...recipe,ratio:2.5,yield_g:undefined,yield_g_min:50,yield_g_max:60}]){
  assert.deepEqual(mergePublicProductPreview(base,{ok:true,fields:{name:values.name},roaster_recipe:extra}).roaster_recipe,base.roaster_recipe);
 }
});
test('a complete HTML espresso recipe retains all its measurements when the endpoint differs',()=>{
 const recipe={dose_g:18,yield_g:45,time_s_min:25,time_s_max:30,method:'Espresso',temperature:'94°C'};
 const base={ok:true,fields:{name:values.name},roaster_recipe:recipe};
 for(const extra of [{ratio:2.5,method:'Espresso'},
  {dose_g:18,yield_g:36,time_s_min:20,time_s_max:22,method:'Espresso',temperature:'92°C'}]){
  assert.deepEqual(mergePublicProductPreview(base,{ok:true,fields:{name:values.name},roaster_recipe:extra}).roaster_recipe,recipe);
 }
});
