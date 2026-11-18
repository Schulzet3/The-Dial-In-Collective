// Exact selected current coffee origin: a named growing region within a
// named province can refine an already independently accepted area/country.
// No place is derived from SEO, URL handle, vendor address, old lot, or menu.
const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const place=String.raw`[\p{Lu}][\p{L}\p{M}’'-]{2,44}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,44}){0,2}`;
const sourcing=new RegExp(String.raw`(?:^|[.!?]\s+)Sourced from (?:the )?(`+place+
 String.raw`) region within (?:the )?province of (`+place+
 String.raw`)\s*,\s*this coffee is grown\b`,'gu');
const stale=/\b(?:previous(?:ly)?|historical(?:ly)?|formerly|last year|prior (?:lot|harvest)|other coffees?|another coffee|different coffee|not sourced|no longer|could|would|might|for example|generally|usually)\b/iu;
const outside=/\b(?:related|recommend(?:ed)?|you may also like|customer reviews|history|old lot|other coffee|guide|education)\b/iu;
export function selectedCurrentPublishedSourcingRegion({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<5||name.length>160||
  typeof origin!=='string'||origin.length<6||origin.length>130||
  !Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const parts=origin.split(/\s*,\s*/u);
 // Already-accepted broad area + producing country, OR a precisely reversed
 // four-part tuple with the same direct current region/province witnesses.
 // Never reorder a different source claim or invent a missing country.
 const base=parts.length===4?parts.slice(2):parts;
 if(![2,4].includes(parts.length)||parts.some(p=>p.length<3||p.length>55||
  !/^[\p{Lu}][\p{L}\p{M}'’ -]+$/u.test(p))||
  !key(name).includes(key(base[0])))return null;
 const headings=blocks.filter(b=>b?.tag==='h1'&&!b.educational);
 if(headings.length!==1||key(headings[0].text)!==key(name))return null;
 const candidates=new Map();
 for(const b of blocks){
  if(!b||b.tag!=='p'||b.educational||typeof b.text!=='string'||
   b.text.length>1200||stale.test(b.text)||outside.test(String(b.section||'')))continue;
  const sentences=b.text.matchAll(sourcing);
  for(const m of sentences){
   const region=m[1].trim(),province=m[2].trim();
   if([region,province].some(p=>p.length>65||key(p)===key(parts[0])||
    key(p)===key(parts[1]))||key(region)===key(province))continue;
   if(parts.length===4&&
    (key(parts[0])!==key(province)||key(parts[1])!==key(region)))continue;
   const value=[region,province,...base].join(', ');
   candidates.set(key(value),{value,quote:m[0].trim().slice(0,420)});
  }
 }
 return candidates.size===1?[...candidates.values()][0]:null;
}
