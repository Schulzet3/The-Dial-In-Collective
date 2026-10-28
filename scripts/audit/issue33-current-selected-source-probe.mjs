// Independently inspect ONLY explicitly supplied public roaster pages on a
// short-lived GitHub runner. No credentials, no Supabase, quota, member history,
// image downloads, full page logs, private records or production writes.
import {createHash} from 'node:crypto';
import {safeCoffeeUrl,fetchPublicCoffeeHtml,fetchPublicCoffeeJson} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../../src/server/coffee-shopify-ajax.mjs';
const current=[
 {id:72,coffee:'Thrive Horizon Organic',url:'https://thrivefarmers.com/products/horizon-organic'},
 {id:6,coffee:'Beanstock selected Colombian coffee',url:'https://beanstockcoffee.com/products/colombian-supremo-organic'},
 {id:'Cortez',coffee:'Cortez current selected coffee reused slug',url:'https://cortezcoffee.com/products/el-salvador-santa-ana-copy'}
];
const clip=value=>typeof value==='string'?value.slice(0,220):null;
const picked=result=>{
 const fields=result?.ok?result.fields||{}:{};
 return Object.fromEntries(['name','roaster','origin','roast_level','process','producer',
  'variety','elevation_m','tasting_notes','release_label']
  .filter(key=>fields[key]!=null).map(key=>[key,clip(fields[key])]));
};
const diagnostic=[];
for(const row of current){
 const record={id:row.id,coffee:row.coffee,requested_url:row.url,
  html:{ok:false},product_json:{ok:false},merged:{ok:false}};
 try{
  if(!safeCoffeeUrl(row.url))throw Error('unsafe_static_url');
  const fetched=await fetchPublicCoffeeHtml(row.url);
  const htmlOk=fetched?.ok===true;
  record.html={ok:htmlOk,reason:htmlOk?null:fetched?.reason||'unavailable'};
  let htmlPreview=null;
  if(htmlOk){
   record.html.source_sha256=createHash('sha256').update(fetched.html).digest('hex');
   record.html.bytes=Buffer.byteLength(fetched.html);
   htmlPreview=extractPublicCoffeeFacts(fetched.html,{source_url:fetched.source_url||row.url});
   record.html.parsed=htmlPreview?.ok===true;
   record.html.fields=picked(htmlPreview);
   record.html.conflicts=htmlPreview?.conflicts||[];
   if(row.id===72){
    record.html.selected_product_has_acodihue=/\bACODIHUE\b/i.test(fetched.html);
    record.html.contains_other_farmer_profile=/\bMEET\s+Marta\s+Solares\b/i.test(
      fetched.html.replace(/<[^>]{0,2000}>/g,' '));
    record.html.possible_cross_profile_producer=Boolean(record.html.contains_other_farmer_profile&&
      /La Esperanza/i.test(record.html.fields.producer||''));
   }
  }
  const target=shopifyProductRequest(row.url);
  if(target){
   const json=await fetchPublicCoffeeJson(target.url);
   record.product_json={ok:json?.ok===true,reason:json?.ok?null:json?.reason||'unavailable'};
   if(json?.ok){
    record.product_json.body_sha256=createHash('sha256').update(json.json).digest('hex');
    const value=JSON.parse(json.json);
    record.product_json.selected_title=clip(value?.title);
    record.product_json.handle=clip(value?.handle);
    const parsed=extractShopifyAjaxData(value,target);
    record.product_json.parsed=parsed?.ok===true;
    record.product_json.fields=picked(parsed);
    if(htmlPreview?.ok&&parsed?.ok){
     const merged=mergePublicProductPreview(htmlPreview,parsed);
     record.merged={ok:merged?.ok===true,fields:picked(merged),conflicts:merged?.conflicts||[],
      roast_hint:clip(merged?.roast_hint)};
    }
   }
  }
 }catch(error){record.error_class=String(error?.name||'Error');}
 diagnostic.push(record);
 console.log('[DIC ISSUE33 EXACT CURRENT PUBLIC SOURCE] '+JSON.stringify(record));
}
const result={schema_version:1,source_kind:'credential_free_direct_public_https_with_dns_pinning',
 observed_at_utc:new Date().toISOString(),attempts:diagnostic.length,
 html_fetched:diagnostic.filter(x=>x.html?.ok).length,
 shopify_product_json_fetched:diagnostic.filter(x=>x.product_json?.ok).length,
 data_mutations:0,member_requests:0,credential_reads:0,
 status:'PROBE_COMPLETED_NOT_AUTOMATIC_ACCEPTANCE'};
console.log('[DIC ISSUE33 SOURCE PROBE SUMMARY] '+JSON.stringify(result));
