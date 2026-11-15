// Exact selected current producing farm + already-named grower + literal
// geographic qualifier. Never infer location from stale SEO or unrelated lots.
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const direct=/^Grown\s+on\s+the\s+([\p{Lu}][\p{L}\p{M}'’-]{1,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{1,40}){0,3})\s+farm\s+in\s+(northern|southern|eastern|western|central)\s+([\p{Lu}][\p{L}\p{M}'’-]{2,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,40}){0,2})\s*,\s+the\s+([\p{Lu}][\p{L}\p{M}'’-]{2,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{2,40}){0,2}\s+family)\s+has\s+been\s+(?:cultivating|growing|producing)\s+coffee\b/iu;
const stale=/\b(?:formerly|previously|historically|former|last year|old lot|other coffees?|another (?:coffee|farm|lot)|different (?:coffee|farm|lot)|not grown|not from|no longer|hypothetical|for example)\b/iu;
const unrelated=/\b(?:related|recommended|other coffees|you may also like|reviews|customer reviews|education|brewing guide)\b/iu;
export function selectedCurrentNamedFarmCountryRegion({name='',origin='',producer='',process='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>170||typeof origin!=='string'||origin.length>55||origin.includes(',')||
  typeof producer!=='string'||producer.length>120||!producer||
  !['Honey','Washed','Natural'].includes(process)||!Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment)\b/iu.test(name)||
  !name.split(/[^\p{L}\p{M}]+/u).some(x=>norm(x)===norm(origin)))return null;
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||norm(h1[0].text)!==norm(name))return null;
 const locations=new Map();
 for(const b of blocks){
  if(b?.tag!=='p'||b.educational||typeof b.text!=='string'||b.text.length>1200||
   unrelated.test(b.section||'')||stale.test(b.text))continue;
  const m=b.text.trim().match(direct);
  if(!m||norm(m[3])!==norm(origin)||norm(m[4])!==norm(producer))continue;
  const region=m[2][0].toUpperCase()+m[2].slice(1).toLowerCase()+' '+origin;
  locations.set(norm(region),{value:region,quote:m[0].slice(0,520),farm:m[1]});
 }
 return locations.size===1?[...locations.values()][0]:null;
}
