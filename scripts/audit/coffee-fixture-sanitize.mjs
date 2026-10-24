// Sanitized, anonymous public coffee-source captures for the opt-in live
// acceptance suite. This is never executed in the member-facing app.
import {rawElements,removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';

const sensitiveKey=/(?:password|secret|token|csrf|authorization|cookie|customer|session|email|phone|cart|checkout)/i;
export function sanitizePublicJson(value){
 return JSON.stringify(value,(key,item)=>sensitiveKey.test(key)?undefined:item)
  .replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
}
export function fixtureCoffeeHtml(html){
 const compact=compactCoffeeProductHtml(html);
 if(!compact)return '';
 const chunks=[];let cursor=0;
 for(const block of rawElements(compact)){
  chunks.push(compact.slice(cursor,block.start));
  const type=block.attributes.match(/\btype\s*=\s*["'](application\/(?:ld\+)?json)["']/i)?.[1];
  if(type&&block.closed){
   const id=block.attributes.match(/\bid\s*=\s*["']([a-z0-9_-]{1,160})["']/i)?.[1];
   // Exact product-marked JSON script attributes are needed to recognize
   // same-product Shopify payloads, particularly Circulor. Only preserve
   // inert product-identity flags and a tightly validated id.
   const productFlag=block.attributes.match(/\bdata-(?:product(?:-json|-data)?|shopify-product)(?=\s|=|$)/i)?.[0]||'';
   try{chunks.push('<script type="'+type+'"'+(id?' id="'+id+'"':'')+(productFlag?' '+productFlag:'')+'>'+sanitizePublicJson(JSON.parse(block.body))+'</script>');}
   catch{/* Invalid JSON is not preserved as executable markup. */}
  }
  cursor=block.end;
 }
 chunks.push(compact.slice(cursor));
 // Keep form and safe input DOM boundaries. Removing them wholesale altered
 // the extraction of actual NOMAD and Circulor public source pages, including
 // conflict evidence. Scrub sensitive fields and active handlers instead.
 return removeElements(chunks.join(''),['iframe','noscript','select','textarea'])
  .replace(/<input\b[^<>]{0,4000}>/gi,tag=>
   /\btype\s*=\s*["']?(?:password|email|file)\b|\b(?:name|id)\s*=\s*["']?[^"'\s>]*(?:csrf|token|password|secret|session|customer|checkout|cart|email|phone)/i.test(tag)?' ':tag)
  .replace(/\s(?:on[a-z]+|nonce|action|formaction)\s*=\s*(?:"[^"]{0,8000}"|'[^']{0,8000}'|[^\s>]{1,1000})/gi,'')
  .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']{0,8000}\2/gi,'$1="#"')
  .replace(/<meta\b[^<>]{0,2000}(?:csrf|token|session)[^<>]{0,2000}>/gi,'');
}