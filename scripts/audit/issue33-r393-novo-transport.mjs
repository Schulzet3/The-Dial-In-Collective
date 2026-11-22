#!/usr/bin/env node
// DEVELOPMENT-only original603 #241 first-party transport diagnostic; never field certification.
import https from 'node:https';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {safeCoffeeUrl,guardedLookup,fetchPublicCoffeeHtml,fetchPublicCoffeeJson,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const host='novocoffee.com',base='https://novocoffee.com/product/buesaco';
const canonical=base+'/',store='https://novocoffee.com/wp-json/wc/store/v1/products?slug=buesaco';
const hash=x=>createHash('sha256').update(x).digest('hex');
const out=process.env.DIC_ISSUE33_R393_DIR||'/tmp/dic33-r393';
mkdirSync(out,{recursive:true});
function official(raw){
 const u=safeCoffeeUrl(raw);
 if(!u||u.hostname!==host)throw Error('unsafe_nonofficial_diagnostic_url');
 return u;
}
function ownRedirect(value,from){
 if(typeof value!=='string')return null;
 try{const u=official(new URL(value,from).toString());return u.pathname+u.search;}catch{return null;}
}
async function head(raw){
 const u=official(raw);
 return new Promise(resolve=>{
  let finished=false,req;
  const finish=v=>{if(finished)return;finished=true;clearTimeout(timer);resolve(v);};
  const timer=setTimeout(()=>{req?.destroy();finish({outcome:'timeout'});},7000);
  try{
   req=https.request({protocol:'https:',hostname:u.hostname,servername:u.hostname,
    port:443,path:u.pathname+u.search,method:'HEAD',lookup:guardedLookup(),
    family:4,agent:false,rejectUnauthorized:true,timeout:6500,maxHeaderSize:32000,
    headers:{'User-Agent':'DialInCollective-CoffeePreview/1.0',Accept:'text/html',Connection:'close'}},res=>{
    res.resume();
    finish({outcome:'responded',status:res.statusCode||0,redirect_path:ownRedirect(res.headers.location,u)});
   });
   req.on('timeout',()=>{req.destroy();finish({outcome:'timeout'});});
   req.on('error',()=>finish({outcome:'transport_error'}));
   req.end();
  }catch{finish({outcome:'transport_error'});}
 });
}
async function html(raw,label){
 official(raw);
 const res=await fetchPublicCoffeeHtml(raw,{maxBytes:MAX_PRODUCT_RETRY_BYTES,deadlineAt:Date.now()+10000});
 if(!res.ok)return {label,outcome:'UNAVAILABLE',reason:res.reason||'unknown'};
 const final=official(res.source_url||raw);
 const headings=selectedProductHeadings(productMarkup(res.html));
 const parser=extractPublicCoffeeFacts(res.html,{source_url:final.toString()});
 const exact=headings.length===1&&headings[0].trim().toLowerCase()==='buesaco'&&
  parser.ok===true&&String(parser.fields?.name||'').trim().toLowerCase()==='buesaco';
 const row={label,outcome:exact?'IDENTITY_MATCHED':'IDENTITY_UNVERIFIED',
  final_path:final.pathname+final.search,html_bytes:Buffer.byteLength(res.html,'utf8'),
  html_sha256:hash(res.html),selected_headings:headings.slice(0,3),parser_ok:parser.ok===true,
  selected_product_identity:exact};
 if(exact){
  const artifact=label+'-selected.html';
  writeFileSync(join(out,artifact),res.html,'utf8');row.raw_html_artifact=artifact;
 }
 return row;
}
async function storeApi(){
 official(store);
 const res=await fetchPublicCoffeeJson(store,{deadlineAt:Date.now()+10000});
 if(!res.ok)return {outcome:'UNAVAILABLE',reason:res.reason||'unknown'};
 const body=res.json||'';
 let json;try{json=JSON.parse(body)}catch{return {outcome:'NON_JSON',bytes:Buffer.byteLength(body)}}
 const items=Array.isArray(json)?json:[];
 return {outcome:'FIRST_PARTY_JSON_ONLY',bytes:Buffer.byteLength(body),sha256:hash(body),
  items:items.length,exact_slug_name_matches:items.filter(x=>x?.slug==='buesaco'&&
   String(x?.name||'').trim().toLowerCase()==='buesaco').length,
  current_html_identity_certified:false};
}
const heads=[],pages=[];
for(const [label,url] of [['original',base],['canonical_slash',canonical]]){
 heads.push({label,...await head(url)});
 try{pages.push(await html(url,label));}catch(e){pages.push({label,outcome:'DIAGNOSTIC_ERROR',code:String(e?.message||'error').slice(0,100)});}
}
let api;try{api=await storeApi()}catch(e){api={outcome:'DIAGNOSTIC_ERROR',code:String(e?.message||'error').slice(0,100)}}
const evidence={kind:'ISSUE33_241_RUNNER_TRANSPORT_DIAGNOSTIC_NOT_ACCEPTANCE',
 source_sha:process.env.GITHUB_SHA||null,case_number:241,original_url:base,
 canonical_url:canonical,store_url:store,utc:new Date().toISOString(),
 head_probes:heads,html_probes:pages,store_api_probe:api,
 original603_manually_certified:false,selected_603_field_certification:false,
 production_writes:0,private_data:false};
writeFileSync(join(out,'r393-novo-transport.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('[DIC33 R393 DIAGNOSTIC ONLY] '+JSON.stringify(evidence));
