// Direct current selected growing valley matched to both this product's H1
// and its own present-tense place claim. Never infer from a title alone.
const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const stale=/\b(?:previous(?:ly)?|historical(?:ly)?|formerly|last year|prior (?:lot|harvest)|other coffee|another coffee|not located|no longer|could|would|might|for example|generally|usually)\b/iu;
export function selectedCurrentNamedGrowingValley({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>170||name.length<12||
 typeof origin!=='string'||origin.length>60||origin.length<4||
 !Array.isArray(blocks)||blocks.length>2500||/\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 if(!/^[\p{L}\p{M}' -]+$/u.test(origin))return null;
 const h1=blocks.filter(b=>b.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name))return null;
 // The selected H1 must explicitly start with this very same already
 // independently accepted country, then its own named growing place.
 if(!name.toLocaleLowerCase('en').startsWith(origin.toLocaleLowerCase('en')+' '))return null;
 const titleRemainder=name.slice(origin.length).trim();
 const claims=new Map(),competitors=new Set();
 for(const block of blocks){
  if(!block||block.educational||!['p','li','div'].includes(block.tag)||
   typeof block.text!=='string'||block.text.length>1600||
   /\b(?:related|recommend(?:ed)?|you may also like|customer reviews|history|other coffee|old harvest|guide)\b/iu.test(block.section||''))continue;
  const sentences=block.text.split(/(?<=[.!?])\s+/u);
  for(const sentence of sentences){
   if(sentence.length>700||stale.test(sentence))continue;
   const claim=/\bThis is located in (?:one of (?:the )?)?(?:(?:most|very|especially|particularly|highly)\s+)?(?:[\p{L}\p{M}]+\s+){0,3}?valleys? of\s+([\p{Lu}][\p{L}\p{M}'’-]{2,55}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,35}){0,2})\b/gu;
   for(const match of sentence.matchAll(claim)){
    const region=match[1].trim();
    competitors.add(key(region));
    if(region.length>65||!key(titleRemainder).startsWith(key(region))||
     !new RegExp('^'+region.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+'(?:\\s|$)','iu').test(titleRemainder))continue;
    const value=region+', '+origin;
    claims.set(key(region),{value,quote:match[0].slice(0,350)});
   }
  }
 }
 return claims.size===1&&competitors.size===1&&
  claims.has([...competitors][0])?[...claims.values()][0]:null;
}
