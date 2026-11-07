// An exact selected product's present beans, never old lots or national context.
const key=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
export function selectedCurrentColombianDepartmentOrigin({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||
 !/^Colombia(?:\s*,\s*Latin America)?$/iu.test(String(origin||'').trim())||
 !Array.isArray(blocks)||blocks.length>2500||
 /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const h1=blocks.filter(b=>b.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name))return null;
 const current=blocks.filter(b=>!b.educational&&['p','li','dd','div','span'].includes(b.tag));
 const country=/\bOrigin\s*:\s*Colombia(?=\s*(?:(?:Roast|Varietal|Process|Tasting|Recommended for)\s*:|$))/iu;
 if(!current.some(b=>country.test(b.text))||
 current.some(b=>/\bOrigin\s*:\s*(?!Colombia\b)[\p{L}\p{M}]/iu.test(b.text)))return null;
 const farmers=current.filter(b=>b.tag==='p'&&/\bSourced from small family farms\b/iu.test(b.text));
 const results=new Map(), allCurrentClaims=new Set();
 for(const block of current){
  if(block.tag!=='p'||typeof block.text!=='string'||block.text.length>1450||
  /\b(?:related products|you may also like|other coffees|customer reviews)\b/iu.test(block.section||''))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u)){
   if(!/^These beans come from the\s+/iu.test(sentence)||
   /\b(?:historically|formerly|previously|used to|last year's|previous lot|other coffee|another lot|not from|no longer)\b/iu.test(sentence))continue;
   const match=sentence.match(/^These beans come from the\s+([\p{Lu}][\p{L}\p{M}'’-]{2,44}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,44}){0,2})\s+department\b/u);
   if(!match)continue;
   const place=match[1].trim();
   // Every present-tense selected beans department is a competing witness,
   // even if the competing paragraph lacks independent farm attribution.
   allCurrentClaims.add(key(place));
   if(place.length>72||/\b(?:Colombia|Latin America|Coffee|Andes|World|Region)\b/iu.test(place)||
    !farmers.some(f=>f.start>=block.start&&f.start<block.end+2500))continue;
   results.set(key(place),{value:place+', Colombia',quote:sentence.slice(0,450)});
  }
 }
 return results.size===1&&allCurrentClaims.size===1&&
  allCurrentClaims.has([...results.keys()][0])?[...results.values()][0]:null;
}
