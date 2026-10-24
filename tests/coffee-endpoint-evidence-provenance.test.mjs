import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyProductRequest,extractShopifyAjaxData} from '../src/server/coffee-shopify-ajax.mjs';
import {wooProductRequest,extractWooStoreData} from '../src/server/coffee-woocommerce-store.mjs';

for(const platform of ['shopify','woo'])test(platform+' evidence points to the exact public endpoint and preserves truncation',()=>{
 const url='https://roaster.example.org/'+(platform==='shopify'?'products':'product')+'/current-coffee';
 const request=platform==='shopify'?shopifyProductRequest(url):wooProductRequest(url);
 const input=platform==='shopify'?{title:'Current Coffee',handle:request.handle,description:'<p>Variety: Bourbon</p>'}:
  {name:'Current Coffee',slug:request.slug,permalink:url,description:'<p>Variety: Bourbon</p>'};
 const facts=[{label:'Raw evidence',value:'"Whole bean"',source_type:'html',source_url:url,source_path:'/description',part:1,format:'json',section:'Product details'}];
 Object.defineProperty(facts,'truncated',{value:true});
 const extract=()=>({ok:true,fields:{name:'Current Coffee'},source_url:url,source_facts:facts});
 const result=(platform==='shopify'?extractShopifyAjaxData:extractWooStoreData)(input,request,{extract});
 const endpoint=platform==='shopify'?request.url:request.api;
 assert.equal(result.source_url,url);assert.equal(result.source_facts_truncated,true);
 assert.ok(result.source_facts.length>1);
 for(const fact of result.source_facts){assert.equal(fact.source_type,'product_json');assert.equal(fact.source_url,endpoint);}
 const retained=result.source_facts.find(fact=>fact.label==='Raw evidence');
 assert.equal(retained.source_path,'/description');assert.equal(retained.part,1);assert.equal(retained.format,'json');assert.equal(retained.section,'Product details');
 assert.equal(facts[0].source_type,'html');assert.equal(facts.truncated,true);
});
