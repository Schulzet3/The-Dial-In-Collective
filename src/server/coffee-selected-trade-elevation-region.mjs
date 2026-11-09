// Source-bound selected Fair/Direct Trade + Organic, measured elevation,
// at most two explicit locale segments; never a region guess or a gazetteer.
const key=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const stale=/\b(?:previous(?:ly| lot| harvest| crop)?|formerly|historically|old lot|other coffees?|another coffee|different coffee|prior harvest|last year|for example|hypothetical|could be|may be|not from|no longer|used to|unlike)\b/iu;
const other=/\b(?:related|recommendations?|you may also like|other coffees?|customer reviews?|testimonials?|education|past releases?|you might like)\b/iu;
const caption=/(?:(?:Fair|Direct)\s+Trade\s*\/\s*Organic|Organic\s*\/\s*(?:Fair|Direct)\s+Trade)\s*[•·]\s*([\p{Lu}][\p{L}\p{M}'’ -]{2,55}?(?:,\s*[\p{Lu}][\p{L}\p{M}'’ -]{2,40})?)\s*[•·]\s*(\d{3,4}\s*[-–]\s*\d{3,4}|\d{3,4})\s*(?:meters?|metres?|masl)\b/giu;
export function selectedCurrentTradeElevationRegion({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<13||name.length>180||
  typeof origin!=='string'||origin.length<4||origin.length>55||
  origin.includes(',')||!Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment)\b/iu.test(name)||
  key(name.slice(0,origin.length))!==key(origin)||
  !/^\s+\S/u.test(name.slice(origin.length)))return null;
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name))return null;
 const regions=new Map();
 for(const b of blocks){
  if(!b||!['p','span','li','div'].includes(b.tag)||
   b.educational||typeof b.text!=='string'||b.text.length>900||
   stale.test(b.text)||other.test(b.section||'')||
   other.test(b.text.slice(0,85)))continue;
  for(const m of b.text.matchAll(caption)){
   const region=m[1].trim().replace(/\s+/gu,' ');
   if(region.length>60||key(region)===key(origin)||
    /\b(?:coffee|roast|process|flavou?r|variety|producer|farm|beans?|origin|country|region|unknown|chocolate|cherry|caramel)\b/iu.test(region))continue;
   const k=key(region);
   if(!regions.has(k))regions.set(k,{value:region+', '+origin,quote:m[0]});
  }
 }
 return regions.size===1?[...regions.values()][0]:null;
}
