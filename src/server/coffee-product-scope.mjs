import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
const OTHER=/^(?:you may also like|related products|related coffees|more coffees|customer reviews|recently viewed|shop similar)\b/i;
const PRODUCT_SECTION=/^(?:our story|the story|about this coffee|about the coffee|coffee story|product details|coffee details|brewing|brew it|brew guide|espresso (?:recipe|brewing|guide)|transparency)\b/i;
const CONTAINER=new Set(['section','div','ul','ol','article','product-recommendations','recommendations']);
const DECORATION=new Set(['svg','canvas','audio','button']);
function withoutRelatedProducts(page){
 const {nodes,scannedEnd}=coffeeHtmlElements(page),ranges=[];
 page=page.slice(0,scannedEnd);
 const headings=nodes.filter(node=>/^h[2-6]$/.test(node.tag)&&node.contentEnd-node.headEnd<=1000)
  .map(node=>({...node,level:Number(node.tag[1]),title:page.slice(node.headEnd,node.contentEnd).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim()}));
 const firstAfter=(items,at)=>{let low=0,high=items.length;while(low<high){const mid=(low+high)>>>1;if(items[mid].start<=at)low=mid+1;else high=mid;}return items[low];};
 const contentAfter=(heading,container)=>{
  let cursor=heading.end;
  // A heading wrapper often ends with an SVG arrow or accessibility-hidden
  // icon. Skip entire decorative subtrees, including long SVG attributes,
  // before deciding whether this block actually contains recommendations.
  for(let step=0;step<16&&cursor<container.contentEnd;step++){
   const following=firstAfter(nodes,cursor-1),end=Math.min(following?.start??container.contentEnd,container.contentEnd);
   if(page.slice(cursor,Math.min(end,cursor+4000)).replace(/<[^<>]{0,2000}>/g,' ').trim())return true;
   if(!following||following.start>=container.contentEnd)return false;
   if(!DECORATION.has(following.tag)&&!/\baria-hidden\s*=\s*["']true["']/i.test(following.attributes))return true;
   cursor=following.end;
  }
  return false;
 };
 // Prefer a named recommendation component. Removing its bounded element
 // preserves genuine product sections appearing later on the same page.
 for(const node of nodes){
  if(!CONTAINER.has(node.tag))continue;
  const explicit=node.tag==='product-recommendations'||node.tag==='recommendations'||
   /\b(?:class|id|aria-label)\s*=\s*["'][^"']{0,1000}\b(?:product[-_ ]recommendations|related[-_ ]products|related[-_ ]coffees|recently[-_ ]viewed|upsells|cross-sells)\b[^"']{0,1000}["']/i.test(node.attributes);
  if(explicit)ranges.push([node.start,node.end]);
 }
 const namedRanges=[];
 for(const [start,end] of ranges){
  const last=namedRanges.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else namedRanges.push([start,end]);
 }
 // A resume marker must be a peer or higher-level product section. A nested
 // recommendation's "Product Details" and a coffee named "Espresso" are
 // still recommendations. Index the bounded heading levels per parent so
 // repeated recommendation blocks never rescan the remaining page.
 const productByParent=new Map();let productNamedAt=0;
 for(const node of headings){
  if(!PRODUCT_SECTION.test(node.title))continue;
  while(productNamedAt<namedRanges.length&&namedRanges[productNamedAt][1]<=node.start)productNamedAt++;
  if(namedRanges[productNamedAt]&&node.start>=namedRanges[productNamedAt][0]&&node.start<namedRanges[productNamedAt][1])continue;
  const levels=productByParent.get(node.parent)||Array.from({length:7},()=>[]);
  for(let level=node.level;level<=6;level++)levels[level].push(node);
  productByParent.set(node.parent,levels);
 }
 const nextProduct=(parent,level,start)=>firstAfter(productByParent.get(parent)?.[level]||[],start);
 let namedAt=0,coveredUntil=0;
 for(const node of headings){
  if(!OTHER.test(node.title)||node.start<coveredUntil)continue;
  while(namedAt<namedRanges.length&&namedRanges[namedAt][1]<=node.start)namedAt++;
  if(namedRanges[namedAt]&&node.start>=namedRanges[namedAt][0]&&node.end<=namedRanges[namedAt][1])continue;
  let parent=node.parent,container=null,resume=null,removeStart=node.start;
  // Only an enclosing block that begins with this heading can be discarded;
  // never discard the entire main product or a preceding description.
  for(let level=0;parent!==null&&level<5;level++){
   const candidate=nodes[parent];
   if(!CONTAINER.has(candidate.tag)||node.start-candidate.headEnd>4000)break;
   const before=page.slice(candidate.headEnd,node.start).replace(/<[^<>]{0,2000}>/g,' ').trim();
   if(before)break;
   const next=nextProduct(parent,node.level,node.start);
   if(next&&next.start<candidate.contentEnd){resume=next;removeStart=candidate.headEnd;break;}
   // Skip a heading-only wrapper. Once its actual recommendation container
   // is found, stop climbing: its outer layout may also hold the real story.
   if(contentAfter(node,candidate)||candidate.tag==='section'){container=candidate;break;}
   removeStart=candidate.start;parent=candidate.parent;
  }
  if(container){ranges.push([container.start,container.end]);coveredUntil=container.end;continue;}
  // Unwrapped recommendations have no closing container. Resume only at an
  // explicitly named product section; an arbitrary next coffee heading does
  // not establish that the selected coffee has resumed.
  const next=resume||nextProduct(node.parent,node.level,node.start);
  const end=next?.start??page.length;
  ranges.push([removeStart,end]);coveredUntil=end;
 }
 if(!ranges.length)return page;
 const chunks=[];let cursor=0;
 for(const [start,end] of ranges.sort((a,b)=>a[0]-b[0])){
  if(end<=cursor)continue;
  if(start>cursor)chunks.push(page.slice(cursor,start));
  chunks.push(' ');cursor=end;
 }
 chunks.push(page.slice(cursor));return chunks.join('');
}
// Text parsers must share the same product scope. Structured JSON is read
// separately; scripts, navigation and recommendation cards are never facts.
export function productMarkup(html){
 if(typeof html!=='string'||html.length>2_000_000)return '';
 let page=removeElements(removeComments(html),['script','style','nav','footer','aside','template','noscript','select']);
 // Keep product specifications before the H1, which some storefronts use.
 // A custom element such as <main-product-selector> is NOT a <main>.
 // This function is called twice in the extraction flow; false matching
 // would discard the selected coffee's heading and flavor fields.
 const main=page.match(/<main(?=[\s>])[^<>]{0,2000}>/i);
 if(main){page=page.slice(main.index+main[0].length);const end=page.search(/<\/main\s*>/i);if(end>=0)page=page.slice(0,end);}
 return withoutRelatedProducts(page);
}
