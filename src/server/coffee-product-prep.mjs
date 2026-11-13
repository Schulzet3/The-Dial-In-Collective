import {rawElements,removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
// Read-only HTML compaction after a fully bounded, safely fetched response.
// Keep Product JSON-LD, inline application/json product state, all visible
// markup and SVG roast indicators. No remote scripts are executed.
import {MAX_PRODUCT_RETRY_BYTES} from './coffee-url-guard.mjs';
export function compactCoffeeProductHtml(html){
 if(typeof html!=='string'||Buffer.byteLength(html,'utf8')>MAX_PRODUCT_RETRY_BYTES)return '';
 const chunks=[];let cursor=0;
 for(const block of rawElements(html)){
  chunks.push(html.slice(cursor,block.start));
  const type=block.attributes.slice(0,1800).match(/\btype\s*=\s*["']([^"']{1,100})["']/i)?.[1]?.toLowerCase();
  // A bounded public React Router/Hydrogen server payload is selected product
  // data, not executable input. Preserve only its exact inline JSON enqueue
  // (<=250 KB); every other script is discarded as before.
  const currentHydration=block.closed&&block.body.length<=250_000&&
   block.body.startsWith('window.__reactRouterContext.streamController.enqueue(');
  chunks.push(block.closed&&(type==='application/ld+json'||type==='application/json'||currentHydration)?html.slice(block.start,block.end):' ');
  cursor=block.end;
 }
 chunks.push(html.slice(cursor));
 return removeComments(removeElements(chunks.join(''),['style']));
}
