
// Public, read-only WooCommerce Store API product by exact SEO slug.
// This is the unauthenticated customer-facing Store API, NOT the admin REST
// API or any cart/checkout/customer endpoint. No cookies or tokens are sent.
import {safeCoffeeUrl,fetchPublicCoffeeJson,MAX_HTML_BYTES} from './coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from './coffee-page-metadata.mjs';

const normalize=v=>String(v||'').normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
export function wooProductRequest(raw){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 // Woo merchants can localize or customize the public product permalink base.
 // Keep the allowlist narrow and always require exact slug AND returned permalink.
 const m=url.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:product|coffee|coffees|beans)\/([a-z0-9][a-z0-9-]{0,155})\/?$/i);
 if(!m)return null;
 const slug=m[1].toLowerCase();
 const api=new URL('/wp-json/wc/store/v1/products/'+slug,url.origin).toString();
 return safeCoffeeUrl(api)?{api,slug,sourceUrl:url.toString()}:null;
}
function exactPermalink(value,source){
 if(!value)return true;
 const p=safeCoffeeUrl(value),u=safeCoffeeUrl(source);
 return !!p&&!!u&&p.hostname.replace(/^www\./,'')===u.hostname.replace(/^www\./,'')&&
  p.pathname.replace(/\/+$/,'')===u.pathname.replace(/\/+$/,'');
}
export function extractWooStoreData(data,request,{extract=extractPublicCoffeeFacts}={}){
 if(!request||!data||Array.isArray(data)||typeof data!=='object'||data.is_password_protected===true||
  typeof data.name!=='string'||!data.name.trim()||data.name.length>200||
  typeof data.slug!=='string'||data.slug.toLowerCase()!==request.slug||
  (typeof data.permalink==='string'&&!exactPermalink(data.permalink,request.sourceUrl)))return null;
 const descriptions=[data.short_description,data.description].filter(x=>typeof x==='string'&&x.length<=16000);
 const detail=descriptions.join('\n');
 const properties=[];
 for(const attribute of Array.isArray(data.attributes)?data.attributes.slice(0,35):[]){
  if(typeof attribute?.name!=='string'||attribute.name.length>70)continue;
  const vals=Array.isArray(attribute.terms)?attribute.terms.slice(0,8).map(t=>t?.name).filter(v=>typeof v==='string'):
   Array.isArray(attribute.options)?attribute.options.slice(0,8).filter(v=>typeof v==='string'):[];
  if(vals.length>0)properties.push({name:attribute.name,value:vals.join(', ')});
 }
 const product={
  '@context':'https://schema.org','@type':'Product',name:data.name,
  url:request.sourceUrl,description:detail,additionalProperty:properties
 };
 const serialized=JSON.stringify(product).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
 const html='<html><head><script type="application/ld+json">'+serialized+'</script></head>'+
  '<body><main><h1>'+data.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</h1>'+
  // Do not execute scripts, and do not let HTML tags escape selected scope.
  detail.replace(/<(script|style|form|iframe|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
   .replace(/<\/?main\b[^>]*>/gi,' ')+'</main></body></html>';
 if(Buffer.byteLength(html)>MAX_HTML_BYTES)return null;
 const result=extract(html,{source_url:request.sourceUrl});
 return result?.ok&&normalize(result.fields?.name)===normalize(data.name)?result:null;
}
export async function extractWooProduct(raw,{readJson=fetchPublicCoffeeJson,extract=extractPublicCoffeeFacts,deadlineAt=null}={}){
 const request=wooProductRequest(raw);if(!request)return null;
 try{
  const result=await readJson(request.api,{deadlineAt});
  if(!result?.ok||typeof result.json!=='string'||Buffer.byteLength(result.json)>MAX_HTML_BYTES)return null;
  return extractWooStoreData(JSON.parse(result.json),request,{extract});
 }catch{return null;}
}
