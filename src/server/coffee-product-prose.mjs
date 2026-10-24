import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {productMarkup} from './coffee-product-scope.mjs';

// The whole selected product is bounded by the transport and structural
// scanner. Do not silently lose a real description because a gallery or SVG
// precedes it. Return discrete text blocks, never one flattened page sentence.
const BLOCK=new Set(['p','li','h1','h2','h3','h4','h5','h6','dt','dd','blockquote','figcaption','div','span']);
const INLINE=new Set(['span','a','em','strong','b','i','small','sup','sub','br','u','s','label','abbr']);
const EDUCATION=/^(?:what (?:is|are)|how (?:to|does|do)|how we(?:['’]re| are) brewing|understanding|learn about|glossary|(?:variet(?:y|ies)|cultivars?|processing|fermentation|origins?|elevations?) (?:education|explained|guide)|roast (?:levels|types|profiles) explained|our roast (?:levels|types)|(?:light|medium|dark) roast specialists|brew(?:ing)? (?:guide|tips|recommendations|reccs)|customer reviews|reviews)\b/i;
export const isEducationalCoffeeHeading=value=>EDUCATION.test(String(value||''));
export function productCoffeeProse(html,clean){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function')return [];
 const page=removeElements(productMarkup(html),['svg','canvas','audio','button']);
 const {nodes}=coffeeHtmlElements(page),children=new Map(),blocks=[],seen=new Set();
 for(const [index,node] of nodes.entries())if(node.parent!==null){
  const list=children.get(node.parent)||[];list.push(index);children.set(node.parent,list);
 }
 let section='',sectionLevel=7,inspected=0;
 for(const [index,node] of nodes.entries()){
  const length=node.contentEnd-node.headEnd;
  if(!BLOCK.has(node.tag)||length>100000)continue;
  const direct=children.get(index)||[];
  if((node.tag==='div'||node.tag==='span')&&direct.some(i=>!INLINE.has(nodes[i].tag)))continue;
  if((inspected+=length)>4_000_000)break;
  const body=page.slice(node.headEnd,node.contentEnd),text=clean(body,6001);
  if(!text||text.length>6000)continue;
  if(/^h[2-6]$/.test(node.tag)){
   const level=Number(node.tag[1]);
   if(level<=sectionLevel||EDUCATION.test(text)){section=text;sectionLevel=level;}
  }
  const signature=node.start+'\0'+text;
  if(seen.has(signature))continue;seen.add(signature);
  blocks.push({text,html:body,tag:node.tag,start:node.start,end:node.end,
   section,educational:EDUCATION.test(section)});
 }
 return blocks;
}

// These phrases explicitly deny a claim or discuss another harvest/coffee.
// Evaluate one sentence or clause at a time: a later unrelated negative must
// not erase a positive current-product description earlier in the paragraph.
export const NONCURRENT_COFFEE_PROSE=/\b(?:not|never|without|neither|no|isn['’]t|wasn['’]t|doesn['’]t|don['’]t|didn['’]t|aren['’]t|weren['’]t|can['’]t|cannot|won['’]t|rather than|unlike|generally|typically|usually|for example|for instance|such as|other coffees?|another (?:coffee|lot|farm)|different (?:coffee|lot)|previous (?:harvest|lot|crop|year)|last year|our coffees (?:are|tend)|most (?:of )?our coffees)\b/i;
