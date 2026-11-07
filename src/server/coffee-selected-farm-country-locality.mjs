// Refine a selected country's origin only when its current product directly
// links a named farm, an active producer, a location and this coffee's process.
// Preserve an unverified regional spelling as literal review, not geography.
const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const place=String.raw`[\p{Lu}][\p{L}\p{M}’'-]{1,40}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{1,40}){0,2}`;
const location=new RegExp(String.raw`\b(?:Finca\s+)?(`+place+String.raw`)\s+is located in\s+(`+place+String.raw`),\s*(`+place+String.raw`)(?=\s+next to\b|[.;]|$)`,'gu');
const producerClaim=/\bgroup of family farms\b[^.!?]{0,230}\brun by\s+([\p{Lu}][\p{L}\p{M}’'-]+(?:\s+[\p{Lu}][\p{L}\p{M}’'-]+){0,3})(?=[,.;]|$)/u;
const processClaim=/\bthe\s+(Honey|Washed|Natural)\s+process\b[^.!?]{0,140}\bused by\s+(?:Finca\s+)?([\p{Lu}][\p{L}\p{M}’'-]+(?:\s+[\p{Lu}][\p{L}\p{M}’'-]+){0,3})(?=[,.;]|$)/iu;
const stale=/\b(?:previously|formerly|historically|last year|old lot|other coffee|another coffee|other farm|another farm|not from|no longer|hypothetical|for example|usually|generally)\b/iu;
const outside=/\b(?:related|recommend(?:ed|ations)?|other coffees?|you may also like|customer reviews|education|brewing guide)\b/iu;

export function selectedCurrentFarmCountryLocality({name='',origin='',producer='',process='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>180||typeof origin!=='string'||origin.length<3||
  origin.length>45||! /^[\p{L}\p{M} -]+$/u.test(origin)||origin.includes(',')||
  typeof producer!=='string'||producer.length<5||producer.length>120||
  !['Honey','Washed','Natural'].includes(process)||
  !Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const hs=blocks.filter(b=>b?.tag==='h1');
 if(hs.length!==1||key(hs[0].text)!==key(name)||
  !name.split(/[^\p{L}\p{M}]+/u).some(w=>key(w)===key(origin)))return null;
 const ps=blocks.filter(b=>b?.tag==='p'&&!b.educational&&
  typeof b.text==='string'&&b.text.length<=1200&&!stale.test(b.text)&&!outside.test(b.section||''));
 const candidates=[],destinations=new Map();
 for(const b of ps)for(const m of b.text.matchAll(location)){
  const [,farm,town,region]=m,who=b.text.match(producerClaim);
  const f=key(farm),geo=key(town)+':'+key(region);
  const places=destinations.get(f)||new Set();
  places.add(geo);destinations.set(f,places);
  if(!who||key(who[1])!==key(producer)||[farm,town,region].some(v=>v.length>90)||f===key(town))continue;
  const linked=ps.filter(p=>p.section===b.section&&
   [...p.text.matchAll(new RegExp(processClaim.source,'giu'))]
    .some(t=>key(t[1])===key(process)&&key(t[2])===f));
  if(linked.length!==1)continue;
  candidates.push({farm,town,region,quote:b.text.slice(0,380)+' | '+linked[0].text.slice(0,260)});
 }
 if(candidates.length!==1||destinations.get(key(candidates[0].farm))?.size!==1)return null;
 return {value:candidates[0].town+', '+origin,quote:candidates[0].quote};
}
