// Country-first geographical title needs current selected H1 and corroborating
// farmers-in-this-region prose. No URL slug, SEO, catalog or nearby card inference.
const norm=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const quoteRegex=value=>String(value).replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const regionName=/^(?:Valley|Valle|Region|Regi[oó]n|District|Province|Department|Highlands)\s+(?:(?:of|de|del|the)\s+)?[\p{Lu}][\p{L}\p{M}'’.-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{2,45}){0,2}$/u;
export function selectedCountryFirstTitleRegion({name='',country='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>155||!country||norm(origin)!==norm(country)||
   !Array.isArray(blocks)||blocks.length>2500)return null;
 const h1=blocks.filter(block=>block.tag==='h1');
 if(h1.length!==1||norm(h1[0].text)!==norm(name))return null;
 const match=name.trim().match(new RegExp('^'+quoteRegex(country)+'\\s+(.{7,105})$','iu'));
 const region=match?.[1]?.trim();
 if(!region||!regionName.test(region)||/\b(?:blend|roast|coffee|decaf|flavou?r|tasting|process|farm|estate|finca|lot|natural|washed|anaerobic|honey|shipping|sale)\b/iu.test(region))return null;
 const proof=blocks.find(block=>!block.educational&&block.tag==='p'&&
  typeof block.text==='string'&&block.text.length<=650&&
  /\b(?:farmers?|growers?|producers?)\s+in\s+this\s+region\b/iu.test(block.text)&&
  !/\b(?:another|other|previous|former|historical|unrelated)\s+(?:coffee|lot|product|region)\b/iu.test(block.text));
 return proof?{value:region+', '+country,quote:name+' | '+proof.text.slice(0,420)}:null;
}


// A selected country-first title can name a producer's region without a
// "Valley" keyword. Require the exact H1 AND the same selected product's
// present producer-of-place statement naming the same person. No historical
// farm purchase, SEO, adjacent SKU or birthplace becomes a current lot.
export function selectedCountryProducerRegion({name='',country='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||!country||norm(origin)!==norm(country)||
  !Array.isArray(blocks)||blocks.length>2500)return null;
 const headings=blocks.filter(block=>block.tag==='h1');
 if(headings.length!==1||norm(headings[0].text)!==norm(name))return null;
 const named=name.trim().match(new RegExp('^'+quoteRegex(country)+'\\s+(.{3,120})$','iu'));
 if(!named)return null;
 const candidates=[];
 for(const block of blocks){
  if(block.educational||block.tag!=='p'||typeof block.text!=='string'||block.text.length>950)continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u)){
   if(sentence.length>650||/\b(?:formerly|previously|historically|unrelated|other coffee|another lot|used to be)\b/iu.test(sentence))continue;
   const credits=[...sentence.matchAll(/\bone\s+of\s+([\p{Lu}][\p{L}\p{M}.'’-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]{2,45}){0,2})[’']s\s+(?:[\p{L}\p{M}'’-]{2,24}\s+){0,5}producers?\b/gu)];
   for(const match of credits){
    const region=match[1];
    if(region.length>70||/\b(?:coffee|blend|roast|process|decaf|washed|natural|honey|lot|farm|finca|estate|producer|ethiopia|colombia|kenya|guatemala)\b/iu.test(region)||
      !named[1].startsWith(region+' '))continue;
    const subject=named[1].slice(region.length).trim().split(/\s+/u);
    if(!subject.length||subject.length>3||subject.some(token=>!/^[\p{Lu}][\p{L}\p{M}’'-]{2,35}$/u.test(token)))continue;
    if(!new RegExp('\\b'+quoteRegex(subject[0])+'\\b','iu').test(sentence))continue;
    candidates.push({value:region+', '+country,quote:name+' | '+sentence.slice(0,420)});
   }
  }
 }
 return new Set(candidates.map(c=>norm(c.value))).size===1?candidates[0]:null;
}
