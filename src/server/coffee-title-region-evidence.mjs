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
