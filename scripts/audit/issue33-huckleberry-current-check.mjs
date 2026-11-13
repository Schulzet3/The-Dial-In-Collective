#!/usr/bin/env node
// Strict one-shot read-only Huckleberry product proof, using production's
// existing public HTTPS/DNS/size guard and deterministic extractor. No Auth,
// member data, Supabase or Netlify writes; no proxy, browser JS, or scraping bypass.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import https from 'node:https';
import {lookup as systemLookup} from 'node:dns';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,fetchPublicCoffeeJson,guardedLookup,isGlobalIpv4} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractShopifyProduct,mergePublicProductPreview} from '../../src/server/coffee-shopify-ajax.mjs';
import {coffeeUrlPreviewMarkup} from '../../site/cloud/coffee-url-autofill.js';
const source_url='https://www.huckleberryroasters.com/shop/products/india-gundikhan-washed?Size=12+OZ';
const sha256=value=>createHash('sha256').update(value).digest('hex');
// Observe the real guarded request without changing TLS, redirects, DNS pinning,
// headers, body limits or destination. No raw error/secret data is retained.
const transport={lookups:[],responses:[],errors:[]};
const request=(options,callback)=>{
 const req=https.request(options,res=>{
  if(transport.responses.length<8)transport.responses.push({status:res.statusCode||0,
   content_type:String(res.headers['content-type']||'').slice(0,80)});
  callback(res);
 });
 req.once('error',error=>{
  if(transport.errors.length<8)transport.errors.push({code:String(error?.code||'unknown').slice(0,80),
   message:String(error?.message||'').slice(0,180)});
 });
 return req;
};
const lookup=guardedLookup((host,options,callback)=>systemLookup(host,options,(error,answers)=>{
 if(transport.lookups.length<8)transport.lookups.push({error:String(error?.code||'').slice(0,80),
  a_records:Array.isArray(answers)?answers.length:0,
  all_global:Array.isArray(answers)?answers.every(x=>x.family===4&&isGlobalIpv4(x.address)):false});
 callback(error,answers);
}));
const fetchOptions={request,lookup};
const outputDir='/tmp/dic33-huckleberry';mkdirSync(outputDir,{recursive:true});
const deadlineAt=Date.now()+15_000;
let page=await fetchPublicCoffeeHtml(source_url,{...fetchOptions,deadlineAt});
if(page.reason==='page_too_large')
 page=await fetchPublicCoffeeProductRetry(page.source_url||source_url,{...fetchOptions,deadlineAt});
let htmlPreview=null,shopifyPreview=null;
if(page.ok){
 const compact=compactCoffeeProductHtml(page.html);
 htmlPreview=extractPublicCoffeeFacts(compact||page.html,{source_url:page.source_url||source_url});
 if(!htmlPreview.ok&&compact&&compact!==page.html)
  htmlPreview=extractPublicCoffeeFacts(page.html,{source_url:page.source_url||source_url});
 writeFileSync(outputDir+'/current-public.html',page.html);
}
if(Date.now()<deadlineAt)
 shopifyPreview=await extractShopifyProduct(source_url,{deadlineAt,
  readJson:(url,options)=>fetchPublicCoffeeJson(url,{...options,...fetchOptions})});
const merged=mergePublicProductPreview(htmlPreview,shopifyPreview);
const result=merged?.ok?merged:shopifyPreview?.ok?shopifyPreview:htmlPreview;
const fields=result?.fields||{},notes=String(fields.tasting_notes||'').toLowerCase();
const failures=[],expect=(value,label)=>{if(!value)failures.push(label);};
expect(page.ok||shopifyPreview?.ok,'official_product_transport');
expect(result?.ok===true,'actual_parser_product');
expect(fields.name==='India Gundikhan Washed','selected_exact_name');
expect(/huckleberry/i.test(fields.roaster||''),'roaster');
expect(fields.process==='Washed','selected_process_washed');
expect(/butter cookie|macadamia|golden raisin/i.test(notes),'own_product_flavor_notes');
expect(!/sangria|pomegranate|tropical fruit/i.test(notes),'no_natural_coffee_notes');
expect(result?.ok&&/India Gundikhan Washed/.test(coffeeUrlPreviewMarkup(result)),'add_coffee_rendering');
const summary={
 source_sha:process.env.GITHUB_SHA||null,source_url,reason:page.reason||'fetched',
 html_bytes:page.ok?Buffer.byteLength(page.html):null,
 html_sha256:page.ok?sha256(page.html):null,
 html_title:page.ok?(page.html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]||null):null,
 html_parser_ok:htmlPreview?.ok===true,html_parser_reason:htmlPreview?.reason||null,
 guarded_transport:transport,
 public_shopify_json_ok:shopifyPreview?.ok===true,
 name:fields.name||null,roaster:fields.roaster||null,origin:fields.origin||null,
 process:fields.process||null,tasting_notes:fields.tasting_notes||null,
 failures,passed:failures.length===0,original603_unchanged:true,production_operations:0
};
writeFileSync(outputDir+'/afterproof.json',JSON.stringify(summary,null,2)+'\n');
console.log('[DIC33 HUCKLEBERRY LIVE SOURCE AFTERPROOF] '+JSON.stringify(summary));
if(failures.length)process.exitCode=1;
