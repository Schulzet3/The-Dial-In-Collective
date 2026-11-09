// Direct CURRENT selected-lot contrast: "This time from the X region" after a
// prior-lot sentence applies to the chosen coffee, not the previous coffee.
// Only one unique bounded literal in the selected product may refine an already
// independently accepted single producing country. No SEO/URL/related/history.
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const forbidden=/\b(?:chocolate|cherry|caramel|cocoa|orange|berry|plum|floral|honey|natural|washed|roast|process|coffee|beans?|grade|flavou?r|aroma|tasting|producer|brew|unknown|different|another)\b/iu;
const outOfScope=/\b(?:other coffees?|related products?|recommended|you may also like|customer reviews?|testimonials?|education|brew guide|past releases?|previous harvest)\b/iu;
const crossProductLead=/\b(?:another|different|other)\s+coffee\b/iu;
const stale=/\b(?:previously|former(?:ly)?|historical(?:ly)?|prior(?: lot)?|last year|different coffee|another coffee|other coffee|old lot|no longer|hypothetical|for example|not from|might be|could be)\b/iu;
const direct=/^This\s+time\s+from\s+(?:the\s+)?([\p{Lu}][\p{L}\p{M}'’.-]{2,35}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{2,35})?)\s+region\b/u;
export function selectedCurrentLotContrastedRegion({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<10||name.length>160||
  typeof origin!=='string'||origin.length<4||origin.length>60||
  origin.includes(',')||!Array.isArray(blocks)||blocks.length>2500||
  !norm(name).startsWith(norm(origin)+' ')||
  /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||norm(h1[0]?.text)!==norm(name))return null;
 const regions=new Map();
 for(const b of blocks){
  if(!b||!['p','span','div','li'].includes(b.tag)||
   b.educational||typeof b.text!=='string'||b.text.length>1300||
   outOfScope.test(b.section||'')||
   crossProductLead.test(b.text.slice(0,180)))continue;
  for(const sentence of b.text.split(/(?<=[.!?])\s+/u)){
   const text=sentence.trim(); if(text.length<27||text.length>850||stale.test(text)||
    outOfScope.test(text.slice(0,90)))continue;
   const m=text.match(direct);if(!m)continue;
   const region=m[1].trim();
   if(region.length<4||region.length>75||norm(region)===norm(origin)||
    forbidden.test(region))continue;
   if(!regions.has(norm(region)))
    regions.set(norm(region),{value:region+', '+origin,quote:text.slice(0,450)});
  }
 }
 return regions.size===1?[...regions.values()][0]:null;
}
