import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

// Public Shopify Ajax Product API, not merchant/Admin APIs. All reads use the
// same bounded connection-time DNS-pinned HTTPS transport as product previews.
// A response must identify the exact handle on the supplied product URL.
import {safeCoffeeUrl,fetchPublicCoffeeJson,MAX_HTML_BYTES} from './coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from './coffee-page-metadata.mjs';

const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,'');
export function shopifyProductRequest(raw){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 // Locale prefix is optional; collections can refer to the same product.
 const m=url.pathname.match(/^\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?(?:collections\/[a-z0-9][a-z0-9-]*\/)?products\/([a-z0-9][a-z0-9-]{0,155})\/?$/i);
 if(!m)return null;
 const path='/'+(m[1]?m[1]+'/':'')+'products/'+m[2]+'.js';
 const endpoint=new URL(path,url.origin).toString();
 if(!safeCoffeeUrl(endpoint))return null;
 return {url:endpoint,handle:m[2].toLowerCase(),sourceUrl:url.toString()};
}
export function extractShopifyAjaxData(data,request,{extract=extractPublicCoffeeFacts}={}){
 if(!request||!data||Array.isArray(data)||typeof data!=='object'||
    typeof data.title!=='string'||!data.title.trim()||data.title.length>200||
    typeof data.handle!=='string'||data.handle.toLowerCase()!==request.handle)return null;
 const description=typeof data.description==='string'&&data.description.length<=20000?data.description:'';
 const tags=Array.isArray(data.tags)?data.tags.slice(0,70).filter(v=>typeof v==='string'&&v.length<=150):
  typeof data.tags==='string'?data.tags.split(',').slice(0,70).map(s=>s.trim()):[];
 const product={'@context':'https://schema.org','@type':'Product',
  name:data.title,url:request.sourceUrl,description,
  ...(typeof data.vendor==='string'&&data.vendor.length<150?{brand:{'@type':'Brand',name:data.vendor}}:{}),
  tags};
 // Escape HTML metacharacters inside JSON-LD to prevent closing <script>.
 const json=JSON.stringify(product).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
 // Current product description only; never let embedded checkout or scripts
 // escape the current-product boundary or run as executable code.
 const story=removeElements(description,['script', 'style', 'form', 'iframe', 'nav', 'footer'])
  .replace(/<\/?main\b[^<>]*>/gi,' ');
 const html='<html><head><script type="application/ld+json">'+json+'</script></head>'+
  '<body><main><h1>'+data.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+
  '</h1>'+story+'</main></body></html>';
 if(Buffer.byteLength(html)>MAX_HTML_BYTES)return null;
 const result=extract(html,{source_url:request.sourceUrl});
 if(!result?.ok||norm(result.fields?.name)!==norm(data.title))return null;
 return result;
}
function originParts(value){
 return String(value||'').split(/\s*(?:,|\/|;|&|\band\b)\s*/i)
  .map(part=>norm(part)).filter(Boolean);
}
function compatibleOrigins(a,b){
 const first=originParts(a),second=originParts(b);
 if(!first.length||!second.length)return null;
 const subset=(small,large)=>small.every(segment=>large.includes(segment));
 if(!subset(first,second)&&!subset(second,first))return null;
 return first.length>=second.length?a:b;
}
export function mergePublicProductPreview(base,extra){
 if(!extra?.ok)return base;
 if(!base?.ok)return extra;
 if(norm(base.fields?.name)!==norm(extra.fields?.name))return base;
 const fields={...extra.fields};
 // Empty source fields must not erase supported facts from the other read.
 for(const [key,value] of Object.entries(base.fields||{}))
  if(typeof value==='string'?value.trim():value!=null)fields[key]=value;
 const conflicts=new Set([...(base.conflicts||[]),...(extra.conflicts||[])]);
 for(const key of ['origin','roast_level','process','variety','producer','release_label']){
  if(base.fields?.[key]&&extra.fields?.[key]&&norm(base.fields[key])!==norm(extra.fields[key])){
   // "Gedeb, Ethiopia" and "Ethiopia" are compatible levels of geographic
   // precision, not contradictory countries. Keep the more specific sourced
   // origin; genuinely divergent blends/harvests remain conflicts.
   const origin=key==='origin'?compatibleOrigins(base.fields[key],extra.fields[key]):null;
   if(origin){fields.origin=origin;continue;}
   delete fields[key];conflicts.add(key);
  }
 }
 for(const key of conflicts)delete fields[key];
 return {...base,fields,available:Object.keys(fields),
  roaster_details:{...extra.roaster_details,...base.roaster_details},
  ...(conflicts.size?{conflicts:[...conflicts].sort()}:{}),
  ...(base.roaster_recipe?{}:extra.roaster_recipe?{roaster_recipe:extra.roaster_recipe}:{})};
}
// Backwards-compatible name for existing extractor consumers/tests.
export const mergeShopifyPreview=mergePublicProductPreview;
export async function extractShopifyProduct(raw,{
 readJson=fetchPublicCoffeeJson,extract=extractPublicCoffeeFacts,deadlineAt=null
}={}){
 const request=shopifyProductRequest(raw);if(!request)return null;
 try{
  const response=await readJson(request.url,{shopifyProduct:true,deadlineAt});
  if(!response?.ok||typeof response.json!=='string'||Buffer.byteLength(response.json)>MAX_HTML_BYTES)return null;
  return extractShopifyAjaxData(JSON.parse(response.json),request,{extract});
 }catch{return null;}
}
