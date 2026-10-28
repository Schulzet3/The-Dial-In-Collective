// Issue33 safe read-only 2MB official-product retry ONLY for the two
// confirmed oversized original owner URLs; other pages retain 900KB guard.
// This does not approve new data, change fetch caps or test member sessions.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,MAX_PRODUCT_RETRY_BYTES,safeCoffeeUrl} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const register=JSON.parse(readFileSync(new URL('../../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url),'utf8')).records;
const ids=[50,67];
if(MAX_PRODUCT_RETRY_BYTES!==2_000_000)throw Error('Changed product retry limit requires review');
for(const id of ids){
 const row=register.find(x=>x.number===id);
 if(!row||!safeCoffeeUrl(row.original_product_url))throw Error('Missing safe original URL '+id);
 const result={number:id,original_name:row.original_coffee,requested_url:row.original_product_url,max_bytes:MAX_PRODUCT_RETRY_BYTES,source_status:'UNAVAILABLE'};
 try{
  const page=await fetchPublicCoffeeHtml(row.original_product_url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
  if(page?.ok!==true)result.reason=page?.reason||'unavailable';
  else{
   result.source_sha256=createHash('sha256').update(page.html).digest('hex');
   result.bytes=Buffer.byteLength(page.html);
   const parsed=extractPublicCoffeeFacts(page.html,{source_url:page.source_url||row.original_product_url});
   result.source_status=parsed?.ok?'PARSED':'PARSER_REJECTED';
   result.fields=Object.fromEntries(Object.entries(parsed?.fields||{})
    .filter(([key])=>['name','roaster','origin','roast_level','process','elevation_m','producer','variety','tasting_notes'].includes(key))
    .map(([key,value])=>[key,String(value).slice(0,240)]));
   result.conflicts=parsed?.conflicts||[];
  }
 }catch(error){result.reason=String(error?.name||'Error');}
 console.log('[DIC ISSUE33 OVERSIZED SOURCE] '+JSON.stringify(result));
}
console.log('[DIC ISSUE33 OVERSIZED SUMMARY] '+JSON.stringify({
 source_kind:'PUBLIC_PRODUCT_2MB_BOUND_DNS_PINNED',
 attempted:2,member_requests:0,production_writes:0,
 acceptance:'SOURCE_SCOPE_ONLY_NOT_77_ACCEPTED'
}));
