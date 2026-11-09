// Source-bound direct selected product Region inside compound current specs.
// Never substitute generic country education, URL, SEO, previous lot or SKU.
const key=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const stale=/\b(?:previous(?:ly| lot| harvest| crop)?|formerly|historically|old lot|other coffees?|another coffee|different coffee|prior harvest|last year|for example|hypothetical|could be|may be|not from|no longer|used to|unlike)\b/iu;
const other=/\b(?:related|recommendations?|you may also like|other coffees?|customer reviews?|testimonials?|education|past releases?)\b/iu;
const region=/\bRegion\s*:\s*([\p{Lu}][\p{L}\p{M}'’-]{2,48}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,48}){0,2})(?=\s*(?:[.!?;,]|$))/gu;
export function selectedCurrentInlineCompoundRegion({name='',country='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<9||name.length>180||
  typeof country!=='string'||country.length<3||country.length>60||
  key(country)!==key(origin)||String(origin).includes(',')||
  !Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 if(key(name.slice(0,country.length))!==key(country)||
  !/^\s+\S/u.test(name.slice(country.length)))return null;
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name))return null;
 const all=new Set(),matched=new Map();
 for(const b of blocks){
  if(!b||!['p','li','dd','span','div'].includes(b.tag)||b.educational||
   typeof b.text!=='string'||b.text.length>1400||other.test(b.section||''))continue;
  const text=b.text;
  const direct=!stale.test(text)&&b.tag==='p'&&
   (/\b(?:washed|natural|honey|anaerobic)\s+process\b/iu.test(text)||
    /\bProcess\s*:\s*(?:washed|natural|honey|anaerobic)\b/iu.test(text))&&
   /\bVariet(?:y|ies|al|als)\s*:/iu.test(text)&&
   /\bProducer\s*:/iu.test(text)&&/\bFarm\s*:/iu.test(text);
  for(const m of text.matchAll(region)){
   const place=m[1].trim();
   if(place.length>90||key(place)===key(country)||
    /\b(?:coffee|roast|process|flavou?r|variety|producer|farm|beans?|origin|country|region|unknown)\b/iu.test(place))continue;
   all.add(key(place));
   if(direct)matched.set(key(place),{value:place+', '+country,quote:text.slice(0,450)});
  }
 }
 return all.size===1&&matched.size===1&&all.has([...matched.keys()][0])
  ?[...matched.values()][0]:null;
}
