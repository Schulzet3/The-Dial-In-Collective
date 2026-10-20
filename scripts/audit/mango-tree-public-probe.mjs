
// Read-only, one-product evidence check. No credentials, raw HTML retention,
// Supabase quota, publication, or unauthenticated merchant-management APIs.
import {fetchPublicCoffeeHtml,fetchPublicCoffeeJson,safeCoffeeUrl} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const target='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
const id='734210068';
const summary={product_url:target,scope:'public_only',stores_no_html:true};
try{
 const fetched=await fetchPublicCoffeeHtml(target);
 summary.page={status:fetched.ok?'ok':fetched.reason,bytes:fetched.ok?Buffer.byteLength(fetched.html):null};
 if(fetched.ok){
  const html=fetched.html;
  summary.contains_product_id=html.includes(id);

  // Restrict debug context to a few public product/storefront tokens. Never
  // log the whole page or any credential-bearing query string.
  const contextFor=(needle,limit=3)=>{
   const hits=[];const lower=html.toLowerCase(),part=needle.toLowerCase();let start=0;
   while(hits.length<limit){
    const pos=lower.indexOf(part,start);if(pos<0)break;start=pos+part.length;
    let value=html.slice(Math.max(0,pos-100),Math.min(html.length,pos+160));
    value=value.replace(/(?:token|api[-_]?key|password|secret)\s*[:=]\s*["']?[^"'&\s<>]{1,240}/gi,'REDACTED')
     .replace(/https?:\/\/[^\s"'<>]{1,500}/gi,'[PUBLIC_URL]').replace(/\s+/g,' ');
    hits.push(value.slice(0,260));
   }
   return {count:lower.split(part).length-1,context:hits};
  };
  summary.public_markup_signals={
   ecwid:contextFor('ecwid',5), productId:contextFor(id,5),
   productName:contextFor('Mango Tree Blend',4),
   storeId:contextFor('storeId',3),
   scriptJs:contextFor('script.js?',3),
   jsonld:contextFor('application/ld+json',3)
  };

  const ids=new Set();
  for(const re of [
   /(?:app\.ecwid\.com\/script\.js\?|script\.js\?)(\d{5,14})(?=[^\d])/gi,
   /(?:storeId|store_id|ecwidStoreId|ecwid_store_id)["'\s:=]+["']?(\d{5,14})(?=[^\d])/gi,
   /ecwid\.com\/(?:store|stores|product-browser)\/(\d{5,14})(?=[^\d])/gi
  ])for(const match of html.matchAll(re))ids.add(match[1]);
  summary.public_store_ids=[...ids].slice(0,8);
  const original=extractPublicCoffeeFacts(html,{source_url:target});
  summary.initial_extraction=original.ok?{ok:true,fields:original.fields,conflicts:original.conflicts||[]}:{ok:false,reason:original.reason};
  if(ids.size===1){
   const storeId=[...ids][0];
   const publicUrl='https://storefront.ecwid.com/product-page/'+storeId+'/'+id+'/static-code';
   if(!safeCoffeeUrl(publicUrl))throw Error('invalid_public_product_endpoint');
   const staticResponse=await fetchPublicCoffeeJson(publicUrl);
   summary.snapshot={status:staticResponse.ok?'ok':staticResponse.reason,bytes:staticResponse.ok?Buffer.byteLength(staticResponse.json):null};
   if(staticResponse.ok){
    const data=JSON.parse(staticResponse.json);
    const canonical=String(data?.canonicalUrl||'');
    summary.canonical=canonical.slice(0,250);
    let valid=false;
    try{
     const u=new URL(canonical);
     valid=u.hostname.replace(/^www\./,'')==='mangotreecoffee.org'&&u.pathname.endsWith('-p'+id);
    }catch{}
    summary.matches_exact_product=valid;
    if(valid){
     const combined='<html><head>'+[data.metaDescriptionHtml,data.ogTagsHtml,data.jsonLDHtml]
      .filter(v=>typeof v==='string').join(' ')+'</head><body><main>'+
      String(data.htmlCode||'')+'</main></body></html>';
     if(Buffer.byteLength(combined)>900000)summary.extraction={ok:false,reason:'page_too_large'};
     else{
      const parsed=extractPublicCoffeeFacts(combined,{source_url:target});
      summary.extraction=parsed.ok?{ok:true,fields:parsed.fields,roaster_details:parsed.roaster_details||{},
       roaster_recipe:parsed.roaster_recipe||null,conflicts:parsed.conflicts||[]}:{ok:false,reason:parsed.reason};
     }
    }
   }
  }else summary.snapshot={status:'store_id_missing_or_ambiguous'};
 }
}catch(err){summary.exception_type=String(err?.name||'Error');}
console.log('[DIC MANGO READ-ONLY PROBE] '+JSON.stringify(summary));
