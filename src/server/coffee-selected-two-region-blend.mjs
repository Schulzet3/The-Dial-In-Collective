// Exact CURRENT same-country selected blend, from paired growing-region
// descriptions. Preserve literal separate regions without inventing a blend elevation.
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const stale=/\b(?:previous(?:ly| harvest| crop| lot)?|historically|last year|old lot|former(?:ly)?|other coffee|another coffee|different coffee|not from|no longer|example|hypothetical|could be|may be)\b/iu;
const other=/\b(?:related|recommendations?|you may also like|other coffees?|customer reviews?|testimonials?|education|past releases?)\b/iu;
const pair=/\bOne of the coffees is a (?:fully\s+)?(?:washed|natural|honey|anaerobic)\s+selection from the ([\p{Lu}][\p{L}\p{M}'’-]{2,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,40}){0,2})\s+region grown at \d{3,4}\s*[-–]\s*\d{3,4}\s+meters above sea level\.\s*The other is a (?:fully\s+)?(?:washed|natural|honey|anaerobic)\s+([\p{Lu}][\p{L}\p{M}'’-]{2,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,40}){0,2})\s+grown at \d{3,4}\s*[-–]\s*\d{3,4}\s+MASL\b/iu;
export function selectedCurrentTwoRegionSingleCountryBlend({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>110||typeof origin!=='string'||origin.length<4||
   origin.length>55||origin.includes(',')||!Array.isArray(blocks)||blocks.length>2500||
   norm(name)!==norm(origin)||/\b(?:sampler|assortment)\b/iu.test(name))return null;
 const h=blocks.filter(b=>b?.tag==='h1');
 if(h.length!==1||norm(h[0].text)!==norm(name))return null;
 const selected=blocks.filter(b=>b?.tag==='p'&&!b.educational&&typeof b.text==='string'&&
   b.text.length>35&&b.text.length<=1500&&!other.test(b.section||'')&&!stale.test(b.text));
 if(!selected.some(b=>/\btwo regional lots\b/iu.test(b.text)&&
    /\bcombined them to make a single origin blend\b/iu.test(b.text)))return null;
 const values=new Map();
 for(const b of selected){
   const m=b.text.match(pair);if(!m)continue;
   const [x,y]=[m[1].trim(),m[2].trim()];
   if(norm(x)===norm(y)||[x,y].some(v=>v.length<4||v.length>85||
      /\b(?:coffee|beans?|roast|process|variety|washed|natural|blend|elevation|meters|masl|region)\b/iu.test(v)))continue;
   const value=x+' & '+y+', '+origin;
   values.set(norm(value),{value,quote:m[0].slice(0,550)});
 }
 return values.size===1?[...values.values()][0]:null;
}
