// Exact selected present micro-lot growing sector, not generic SEO or a mill site.
const key=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const claim=/\bCultivated in the\s+([\p{L}\p{M}’'\- ]{6,100}?)\s+mountains of\s+([\p{Lu}][\p{L}\p{M}’'\-]{2,45}),\s*this micro-lot from\s+([\p{Lu}][\p{L}\p{M}’'\-]{2,45})\s+is located in a sector of\s+([\p{Lu}][\p{L}\p{M}’'\-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'\-]{2,45}){0,3})\s+that (?:he|she|they) refer(?:s)? to as\s+([\p{Lu}][\p{L}\p{M}’'\-]{1,50}(?:\s+[\p{Lu}][\p{L}\p{M}’'\-]{1,50}){0,2})(?=[.!?]|$)/giu;
const stale=/\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|last year|past lot|other coffee|another lot|not grown|no longer|could|might|would|hypothetical|for example|generally)\b/iu;
export function selectedCurrentNamedMicroLotSector({name='',origin='',producer='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>160||/\b(?:blend|assortment|sampler)\b/iu.test(name)||
 typeof producer!=='string'||producer.length>140||typeof origin!=='string'||origin.length>150||
 !Array.isArray(blocks)||blocks.length>2500)return null;
 const parts=origin.split(',').map(p=>p.trim());
 if(parts.length!==3||parts.some(p=>p.length<3||p.length>80))return null;
 const h1=blocks.filter(b=>b.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name))return null;
 const first=producer.trim().split(/\s+/u)[0];
 if(first.length<3||!/\p{Lu}/u.test(first[0]))return null;
 const current=blocks.filter(b=>b&&!b.educational&&
  ['p','li','dd','div','span'].includes(b.tag)&&typeof b.text==='string'&&b.text.length<=1800&&
  !/\b(?:recommended|other coffees?|related products?|reviews|education|learning|history|brew(?:ing)? guide)\b/iu.test(b.section||''));
 if(!/^[\p{L}\p{M} -]+$/u.test(parts[2]))return null;
 const direct=new RegExp('\\bOrigin\\s*:\\s*'+parts[2]+'(?=\\s*(?:(?:Roast|Varietal|Variety|Process|Tasting|Recommended for)\\s*:|$))','iu');
 if(!current.some(b=>direct.test(b.text))||
  current.some(b=>/\bOrigin\s*:\s*[\p{Lu}][\p{L}\p{M}]{2,36}/u.test(b.text)&&!direct.test(b.text)))return null;
 if(!current.some(b=>b.tag==='p'&&key(b.text).includes(key(producer))&&
  /\b(?:producer|grower|farmer)\b/iu.test(b.text)))return null;
 const claims=new Map(),competitors=new Set();
 for(const b of current){
  if(b.tag!=='p')continue;
  for(const sentence of b.text.split(/(?<=[.!?])\s+/u)){
   if(sentence.length>950||stale.test(sentence))continue;
   for(const match of sentence.matchAll(claim)){
    const [,mountain,region,person,locality,sector]=match;
    competitors.add([key(mountain),key(region),key(person),key(locality),key(sector)].join(':'));
    if(key(mountain)!==key(parts[1])||key(region)!==key(parts[0])||
       key(person)!==key(first)||[region,locality,sector].some(v=>v.length>80)||
       [region,locality,sector].some(v=>/\b(?:coffee|world|origin|region|sector|mountains)\b/iu.test(v)))continue;
    const value=[sector,locality,region,parts[2]].join(', ');
    claims.set(key(value),{value,quote:match[0].slice(0,430)});
   }
  }
 }
 return competitors.size===1&&claims.size===1?[...claims.values()][0]:null;
}
