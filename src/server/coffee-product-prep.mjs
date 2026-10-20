// Read-only HTML compaction after a fully bounded, safely fetched response.
// Keep Product JSON-LD, inline application/json product state, all visible
// markup and SVG roast indicators. No remote scripts are executed.
import {MAX_PRODUCT_RETRY_BYTES} from './coffee-url-guard.mjs';
export function compactCoffeeProductHtml(html){
 if(typeof html!=='string'||Buffer.byteLength(html,'utf8')>MAX_PRODUCT_RETRY_BYTES)return '';
 return html.replace(/<script\b([^>]{0,1800})>[\s\S]*?<\/script\s*>/gi,(tag,attributes)=>{
   const type=attributes.match(/\btype\s*=\s*["']([^"']{1,100})["']/i)?.[1]?.toLowerCase();
   return type==='application/ld+json'||type==='application/json'?tag:' ';
  })
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ');
}
