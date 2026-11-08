// Exact selected named farm on a volcano, exact current credited producer,
// and independently printed region in the H1 are required. Never convert
// a farm's name into a conjectured municipality.
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const farmOnVolcano=/^(?:Finca|Farm|Estate|Hacienda)\s+([\p{Lu}][\p{L}\p{M}’'-]{1,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{1,45}){0,3})\s+(?:sits|is situated|is located)\s+on\s+(?:a|the)\s+volcano\s+in\s+([\p{Lu}][\p{L}\p{M}’'-]{1,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{1,45}){0,2})(?=[.,;]|$)/iu;
const rejected=/\b(?:previously|formerly|historically|former lot|previous harvest|another coffee|other coffee|other farm|related products?|not from|no longer|hypothetical|for example|usually|generally|may be|could be)\b/iu;
const outside=/\b(?:related|recommend(?:ed|ations)?|other coffees?|you may also like|customer reviews?|education|brew(?:ing)? guide)\b/iu;

export function selectedCurrentFarmVolcanoRegion({name='',origin='',producer='',process='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<7||name.length>180||
  typeof origin!=='string'||origin.length<4||origin.length>65||origin.includes(',')||
  !/^[\p{L}\p{M} '-]+$/u.test(origin)||
  typeof producer!=='string'||producer.length<6||producer.length>120||
  !['Washed','Natural','Honey'].includes(process)||
  !Array.isArray(blocks)||blocks.length>2500||/\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const headings=blocks.filter(b=>b?.tag==='h1');
 if(headings.length!==1||norm(headings[0].text)!==norm(name))return null;
 const titleWords=name.split(/[^\p{L}\p{M}]+/u).map(norm).filter(Boolean);
 if(!titleWords.includes(norm(origin)))return null;
 const given=producer.trim().split(/\s+/u)[0];
 if(!given||given.length<3||!/^[\p{L}\p{M}’-]+$/u.test(given))return null;
 const candidates=[],observed=new Map();
 for(const b of blocks){
  if(b?.tag!=='p'||b.educational||typeof b.text!=='string'||b.text.length>1500||
   rejected.test(b.text)||outside.test(b.section||''))continue;
  const loc=b.text.match(farmOnVolcano);
  if(!loc)continue;
  const [,farm,region]=loc;
  if(farm.length>120||region.length>80||norm(farm)===norm(region))continue;
  const sites=observed.get(norm(farm))||new Set();
  sites.add(norm(region));observed.set(norm(farm),sites);
  if(!titleWords.includes(norm(region)))continue;
  const role=new RegExp('\\b'+given+'\\b.{0,135}\\bcoffee producer\\b.{0,135}\\bfamily farm\\b','iu');
  if(!role.test(b.text))continue;
  candidates.push({farm,region,quote:b.text.slice(0,550)});
 }
 if(candidates.length!==1||observed.get(norm(candidates[0].farm))?.size!==1)return null;
 return {value:candidates[0].region+', '+origin,quote:candidates[0].quote};
}
