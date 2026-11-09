// Exact current chosen product's single labeled qualitative "Roast: medium level".
// No vendor-specific hardcodes, historical source, related coffee, SEO or glossary.
const key=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const stale=/\b(?:previous(?:ly)?|old lot|last year|prior (?:crop|lot|harvest)|unlike|another coffee|other coffees?|different coffee|for example|historically|hypothetical|related product|customer review)\b/iu;
const other=/\b(?:related|recommended|other coffees|you may also like|reviews|education|roast glossary)\b/iu;
const roast=/\bRoast\s*:\s*([^,;.!?]{2,90})/giu;
const tier=/^(light|medium|dark)\s+level$/iu;
const facts=/\bCountry\s*:\s*([^,;.!?]{3,60}),\s*Region\s*:\s*([^,;.!?]{3,70}),\s*Farm\s*:/iu;
export function selectedCurrentTypedRoastLevel({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<8||name.length>180||
  typeof origin!=='string'||origin.length<6||origin.length>150||
  !Array.isArray(blocks)||blocks.length>2500)return null;
 const parts=origin.split(/\s*,\s*/u).filter(Boolean);
 if(parts.length!==2||parts.some(x=>x.length>70))return null;
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||key(h1[0].text)!==key(name)||!key(name).startsWith(key(parts[1])))
  return null;
 const current=blocks.filter(b=>b?.tag==='p'&&!b.educational&&typeof b.text==='string'&&
  b.text.length<=1400&&!other.test(b.section||'')&&!stale.test(b.text));
 const labels=current.flatMap(b=>[...b.text.matchAll(roast)].map(m=>({raw:m[1].trim(),block:b})));
 if(labels.length!==1||!tier.test(labels[0].raw))return null;
 const block=labels[0].block,matched=block.text.match(facts);
 if(!matched||key(matched[1])!==key(parts[1])||key(matched[2])!==key(parts[0])||
  !/\b(?:Grower|Producer)\s*:\s*[\p{L}\p{M}][^,;.!?]{2,120}/iu.test(block.text)||
  !/\bProcess\s*:\s*(?:washed|natural|honey|anaerobic)\b/iu.test(block.text))return null;
 const value=labels[0].raw.match(tier)[1].toLowerCase();
 return {value:value[0].toUpperCase()+value.slice(1),quote:block.text.slice(0,500)};
}
