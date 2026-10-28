// Read-only selected-product source coverage for exactly the 77 original owner URLs.
// This is a CURRENT SOURCE PROBE, not a claim of correct fields or a substitute
// for individual source adjudication, original603 acceptance or signed-in app QA.
// Never use credentials, pay-per-request APIs, member data or production DB writes.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const register=JSON.parse(readFileSync(new URL('../../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url),'utf8'));
const rows=register.records;
if(!Array.isArray(rows)||rows.length!==77||new Set(rows.map(x=>x.original_product_url)).size!==77||
   rows.some((x,i)=>x.number!==i+1||typeof x.original_product_url!=='string'||!safeCoffeeUrl(x.original_product_url)))
 throw Error('Authoritative numbered 77 intake changed: refuse to probe an unreviewed or unsafe URL list');
const clamp=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,240):null;
const takeFields=result=>{
 const fields=result?.ok?result.fields||{}:{};
 return Object.fromEntries(['name','roaster','origin','elevation_m','roast_level','process','variety','producer','tasting_notes','release_label']
   .filter(key=>fields[key]!=null).map(key=>[key,clamp(fields[key])]));
};
async function one(row){
 const output={number:row.number,roaster:clamp(row.roaster),original_name:clamp(row.original_coffee),
  original_url:row.original_product_url,source_status:'NOT_FETCHED',parsed_current_fields:{},conflicts:[]};
 try{
  const response=await fetchPublicCoffeeHtml(row.original_product_url);
  if(response?.ok!==true){
   output.source_status='UNAVAILABLE';
   output.reason=clamp(response?.reason||'no_public_html');
  }else{
   output.source_status='RETRIEVED';
   output.html_sha256=createHash('sha256').update(response.html).digest('hex');
   output.bytes=Buffer.byteLength(response.html);
   const parsed=extractPublicCoffeeFacts(response.html,{source_url:response.source_url||row.original_product_url});
   output.source_status=parsed?.ok?'PARSED':'PARSER_REJECTED';
   output.parsed_current_fields=takeFields(parsed);
   output.conflicts=(Array.isArray(parsed?.conflicts)?parsed.conflicts:[]).slice(0,12);
   output.roast_hint=clamp(parsed?.roast_hint);
  }
 }catch(e){
  output.source_status='ERROR';
  output.reason=clamp(String(e?.name||'Error'));
 }
 console.log('[DIC ISSUE33 77 CURRENT PUBLIC] '+JSON.stringify(output));
 return output;
}
const all=[];
for(let index=0;index<rows.length;index+=4){
 const batch=await Promise.all(rows.slice(index,index+4).map(one));
 all.push(...batch);
}
const counts={};
for(const row of all)counts[row.source_status]=(counts[row.source_status]||0)+1;
console.log('[DIC ISSUE33 77 CURRENT SUMMARY] '+JSON.stringify({
 schema_version:1,source_kind:'DIRECT_PUBLIC_HTTPS_BOUNDED_DNS_PINNED_NO_CREDENTIALS',
 observed_at_utc:new Date().toISOString(),intake:rows.length,attempted:all.length,
 statuses:counts,unique_original_urls:new Set(all.map(x=>x.original_url)).size,
 member_requests:0,production_writes:0,shopify_json_attempts:0,
 original603_oracle_modified:false,
 acceptance:'SOURCE_REACHABILITY_AND_SELECTED_PARSER_DIAGNOSTIC_ONLY_NOT_77_COFFEE_ACCEPTANCE'
}));
