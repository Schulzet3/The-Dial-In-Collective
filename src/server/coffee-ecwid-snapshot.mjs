
// Public Ecwid static product snapshots for precise Wix-hosted coffee pages.
// Store IDs are public storefront transport identifiers, never product facts.
// A product result requires the exact -pID URL, Ecwid HTTPS, and matching
// product title; canonical URLs may legitimately be blank in this endpoint.
import {safeCoffeeUrl,fetchPublicCoffeeJson,MAX_HTML_BYTES} from './coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from './coffee-page-metadata.mjs';

const knownStores=new Map([['mangotreecoffee.org','6820274']]);
const normalize=value=>String(value||'').normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const publicStoreIds=html=>{
 const all=new Set();
 if(typeof html!=='string'||html.length>1_000_000)return all;
 for(const m of html.matchAll(/(?:app\.ecwid\.com\/script\.js\?|script\.js\?)(\d{5,14})(?=[^\d])/gi))all.add(m[1]);
 return all;
};
export function ecwidProductRequest(raw,html=''){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 const match=url.pathname.match(/^\/shop\/([a-z0-9._~%+-]+)-p(\d{6,14})\/?$/i);
 if(!match)return null;
 const host=url.hostname.replace(/^www\./,'');
 const configured=knownStores.get(host);
 const ids=publicStoreIds(html);
 if(ids.size>1||(configured&&ids.size===1&&!ids.has(configured)))return null;
 const storeId=ids.size===1?[...ids][0]:configured;
 if(!storeId)return null;
 let slug;try{slug=decodeURIComponent(match[1]).replace(/[-_]+/g,' ');}catch{return null;}
 if(!normalize(slug))return null;
 const requestUrl='https://storefront.ecwid.com/product-page/'+storeId+'/'+match[2]+'/static-code';
 return {requestUrl,expectedName:slug,productId:match[2],sourceUrl:url.toString(),storeId};
}
export function extractEcwidSnapshotData(data,request,{extract=extractPublicCoffeeFacts}={}){
 if(!data||typeof data!=='object'||!request||typeof data.title!=='string')return null;
 if(normalize(data.title)!==normalize(request.expectedName))return null;
 if(data.canonicalUrl){
  try{
   const canonical=safeCoffeeUrl(data.canonicalUrl),source=safeCoffeeUrl(request.sourceUrl);
   if(!canonical||!source||canonical.hostname.replace(/^www\./,'')!==source.hostname.replace(/^www\./,'')||
     !canonical.pathname.endsWith('-p'+request.productId))return null;
  }catch{return null;}
 }
 const parts=[data.metaDescriptionHtml,data.ogTagsHtml,data.jsonLDHtml,data.htmlCode];
 if(!parts.some(x=>typeof x==='string'&&x.includes(data.title)))return null;
 if(parts.some(x=>x!=null&&typeof x!=='string'))return null;
 const page='<html><head>'+parts.slice(0,3).filter(Boolean).join(' ')+'</head><body><main>'+
  String(data.htmlCode||'')+'</main></body></html>';
 if(Buffer.byteLength(page)>MAX_HTML_BYTES)return null;
 const preview=extract(page,{source_url:request.sourceUrl});
 if(!preview?.ok||normalize(preview.fields?.name)!==normalize(data.title))return null;
 return preview;
}
export async function extractEcwidProduct(raw,html='',{
 readJson=fetchPublicCoffeeJson,extract=extractPublicCoffeeFacts
}={}){
 const request=ecwidProductRequest(raw,html);
 if(!request)return null;
 try{
  const response=await readJson(request.requestUrl);
  if(!response?.ok||typeof response.json!=='string'||Buffer.byteLength(response.json)>MAX_HTML_BYTES)return null;
  const data=JSON.parse(response.json);
  return extractEcwidSnapshotData(data,request,{extract});
 }catch{return null;}
}
