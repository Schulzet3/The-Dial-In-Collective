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

// Current selected country may be refined by exact H1 and independently
// corroborating selected prose: "washed COUNTRY from LOCALITY area of REGION".
// Never infer a geography from URL, SEO, gazetteer, related SKU or history.
export function selectedCountryAreaOfRegion({name='',country='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||typeof country!=='string'||
   country.length<3||country.length>40||norm(origin)!==norm(country)||
   !Array.isArray(blocks)||blocks.length>2500||
   /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const headings=blocks.filter(block=>block.tag==='h1');
 if(headings.length!==1||norm(headings[0].text)!==norm(name)||
   !norm(name).includes(norm(country)))return null;
 const grammar=new RegExp(
  '\\b(?:washed|natural|honey|anaerobic|coffee|beans?)\\s+'+
  quoteRegex(country)+
  '\\s+from\\s+([\\p{L}\\p{M}\\x27\\u2019.-]{3,45}(?:\\s+[\\p{L}\\p{M}\\x27\\u2019.-]{2,45}){0,2})\\s+area\\s+of\\s+(?:the\\s+)?([\\p{L}\\p{M}\\x27\\u2019.-]{3,45})\\b',
  'giu');
 const candidates=[];
 for(const block of blocks){
  if(block.educational||!['p','li'].includes(block.tag)||
    typeof block.text!=='string'||block.text.length>800||
    /\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|unrelated|another (?:coffee|lot)|other (?:coffee|lot)|hypothetical|not from)\b/iu.test(block.text))continue;
  for(const match of block.text.matchAll(grammar)){
   const locality=match[1].trim(),region=match[2].trim();
   if(locality.length>80||norm(locality)===norm(region)||
     norm(locality)===norm(country)||norm(region)===norm(country)||
     !norm(name).includes(norm(locality))||!norm(name).includes(norm(region)))continue;
   candidates.push({value:locality+', '+region+', '+country[0].toUpperCase()+country.slice(1),
    quote:name+' | '+block.text.slice(0,420)});
  }
 }
 return candidates.length&&new Set(candidates.map(c=>norm(c.value))).size===1?candidates[0]:null;
}


// Current selected lot: a named growing locality is accepted only when
// its own contributing farmers explicitly cultivate there in the same paragraph.
// A country name, SEO, previous lot or generic geographic context is insufficient.
export function selectedCountrySmallholderGrowingLocality({name='',country='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||typeof country!=='string'||
   country.length<3||country.length>40||norm(origin)!==norm(country)||
   !Array.isArray(blocks)||blocks.length>2500||
   !norm(name).includes(norm(country))||
   /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const h1=blocks.filter(block=>block.tag==='h1');
 if(h1.length!==1||norm(h1[0].text)!==norm(name))return null;
 const place='[\\p{Lu}][\\p{L}\\p{M}\\x27\\u2019.-]{2,44}(?:\\s+[\\p{Lu}][\\p{L}\\p{M}\\x27\\u2019.-]{2,44}){0,2}';
 const grammar=new RegExp(
  '\\b(?:the|these|those)\\s+(?:farmers?|growers?)\\s+(?:cultivate|grow)\\s+(?:their|this|the)\\s+coffee\\b[^.!?]{0,120}?\\b(?:on\\s+(?:small\\s+)?farms?\\s+)?(?:around|in)\\s+('+place+'),\\s*('+place+'),\\s*('+quoteRegex(country)+')\\b','giu');
 const currentLot=/\b(?:smallholder\s+)?(?:farmers?|growers?)\s+who\s+(?:contribute|supply)\s+to\s+(?:this|our|the current)\s+(?:lot|coffee)\s+(?:grow|cultivate)\s+(?:their|this|the)\s+coffee\b/iu;
 const results=new Map();
 for(const block of blocks){
  if(block.educational||!['p','li'].includes(block.tag)||
    typeof block.text!=='string'||block.text.length>1500||
    /\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog|customer reviews)\b/iu.test(block.section||''))continue;
  const link=currentLot.exec(block.text);
  if(!link)continue;
  for(const growing of block.text.matchAll(grammar)){
   if(growing.index<=link.index||growing.index-link.index>400)continue;
   const source=block.text.slice(link.index,growing.index+growing[0].length);
   if(/\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|old lot|another lot|other lot|no longer|not from|hypothetical|if|would|could|might|may)\b/iu.test(source))continue;
   const town=growing[1],region=growing[2];
   if([town,region].some(value=>value.length>75||
     norm(value)===norm(country)||/\b(?:coffee|roast|blend|tasting|flavou?r|chocolate|cocoa|natural|washed|farm|finca|estate|shipping|street|county)\b/iu.test(value))||
     norm(town)===norm(region))continue;
   const value=town+', '+region+', '+country[0].toUpperCase()+country.slice(1);
   results.set(norm(value),{value,quote:source.slice(0,420)});
  }
 }
 return results.size===1?[...results.values()][0]:null;
}


// A selected named farm's current story can expose an incompatible one-letter
// Region spelling. Preserve both literals for user review; never auto-correct.
function oneLetterDifference(a,b){
 const x=norm(a),y=norm(b);
 if(!x||!y||x===y||Math.abs(x.length-y.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<x.length&&j<y.length){
  if(x[i]===y[j]){i++;j++;continue;}
  if(++edits>1)return false;
  if(x.length===y.length){i++;j++;}
  else if(x.length>y.length)i++;
  else j++;
 }
 return edits+(x.length-i)+(y.length-j)===1;
}
export function selectedFarmStoryRegionMismatch({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||typeof origin!=='string'||origin.length>115||
   !Array.isArray(blocks)||blocks.length>2500)return null;
 const label=origin.match(/^([^,]{3,65}),\s*([^,]{3,45})$/u);
 if(!label)return null;
 const [,printedRegion,country]=label;
 if(!new RegExp('^'+quoteRegex(country)+'\\s+','iu').test(name))return null;
 const headings=blocks.filter(b=>b.tag==='h1');
 if(headings.length!==1||norm(headings[0].text)!==norm(name))return null;
 const place='[\\p{Lu}][\\p{L}\\p{M}\\x27\\u2019.-]{2,40}(?:\\s+[\\p{Lu}][\\p{L}\\p{M}\\x27\\u2019.-]{2,40}){0,3}';
 const farm=new RegExp('\\b(?:Finca|Farm|Hacienda|Estate)\\s+('+place+')\\s+is\\s+located\\s+in\\s+(?:the\\s+)?(?:highlands\\s+of\\s+)?('+place+'),\\s*('+place+')(?=[.!?;]|\\s|$)','gu');
 const statements=[];
 for(const block of blocks){
  if(block.educational||!['p','li'].includes(block.tag)||
    typeof block.text!=='string'||block.text.length>1200||
    /\b(?:previous(?:ly)?|former(?:ly)?|historic(?:al(?:ly)?)?|old lot|another lot|other coffee|no longer|hypothetical|might|could|would)\b/iu.test(block.text)||
    /\b(?:related|recommended|similar products|other coffees|you may also like|reviews)\b/iu.test(block.section||''))continue;
  for(const match of block.text.matchAll(farm)){
   const [quote,farmName,town,region]=match;
   if(!norm(name).includes(norm(farmName))||
      !new RegExp('\\b'+quoteRegex(region)+'\\b','iu').test(name)||
      !oneLetterDifference(printedRegion,region)||
      [town,region].some(s=>s.length>65||norm(s)===norm(country)))continue;
   statements.push({value:town+', '+region+', '+country,quote});
  }
 }
 return statements.length===1?statements[0]:null;
}
