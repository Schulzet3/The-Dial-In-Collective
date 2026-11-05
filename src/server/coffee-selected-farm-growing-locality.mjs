// Current exact selected farm growing locality. Broad geography cannot be
// refined from SEO, a processing facility, a related coffee or an old lot.
const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const founding=/\bin the\s+([\p{Lu}][\p{L}\p{M}’'-]{2,45}),\s*([\p{Lu}][\p{L}\p{M}’'-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,45}){0,2})\s+region of\s+([\p{Lu}][\p{L}\p{M}’'-]{2,45})\b[^.!?]{0,190}?\btoday is\s+(?:the\s+)?(?:Finca|Farm|Hacienda|Estate)\s+([\p{Lu}][\p{L}\p{M}’'-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,45}){0,2})/iu;
const growing=/\bthe coffee grown at the farm\b[^.!?]{0,150}?\bgrown from\s+the\s+(?:[\p{L}\p{M}]+\s+){0,4}lands of\s+([\p{Lu}][\p{L}\p{M}’'.-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'.-]{2,45}){0,2}),\s*([\p{Lu}][\p{L}\p{M}’'.-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}’'.-]{2,45}){0,2})(?=[.,;]|\s|$)/iu;
export function selectedCurrentFarmGrowingLocality({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>165||typeof origin!=='string'||origin.length>115||!Array.isArray(blocks)||blocks.length>2500)return null;
 const tuple=origin.match(/^([^,]{3,65}),\s*([^,]{3,45})$/u);
 const farm=name.split(/\s[–—-]\s/u).at(-1);
 if(!tuple||farm===name||farm.length<5||farm.length>80)return null;
 const h=blocks.filter(x=>x.tag==='h1');
 if(h.length!==1||norm(h[0].text)!==norm(name))return null;
 const selected=blocks.filter(x=>x.tag==='p'&&!x.educational&&typeof x.text==='string'&&x.text.length<=1200&&
  !/\b(?:related|recommended|other coffees|you may also like|reviews)\b/iu.test(x.section||'')&&
  !/\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|other coffee|another lot|not grown|not from|hypothetical|might be|could be)\b/iu.test(x.text));
 const values=new Map();
 for(const a of selected){const first=a.text.match(founding);
  if(!first||norm(first[2])!==norm(tuple[1])||norm(first[3])!==norm(tuple[2])||norm(first[4])!==norm(farm))continue;
  for(const b of selected){if(a.section!==b.section)continue;const second=b.text.match(growing);
   if(!second||norm(second[2])!==norm(tuple[1])||![norm(first[1]),'la'+norm(first[1]),'el'+norm(first[1])].includes(norm(second[1])))continue;
   const value=second[1]+', '+second[2]+', '+tuple[2];values.set(norm(value),{value,quote:first[0]+' | '+second[0]});
  }
 }
 return values.size===1?[...values.values()][0]:null;
}
