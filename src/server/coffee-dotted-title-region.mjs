// Current selected printed "NAME. COUNTRY. REGION | NOTES" labels have
// an explicit locality, not one to infer from a country, slug or nearby coffee.
// Keep deliberately narrow punctuation/roles to avoid tasting/flavor/roast
// tokens masquerading as geography. No external gazetteer or fallback facts.
const norm=value=>String(value||'').normalize('NFKD')
 .replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const forbidden=/\b(?:blend|flavou?r|tasting|notes?|roast|process|washed|natural|honey|anaerobic|decaf|espresso|variet(?:y|ies)|cultivar|coffee|organic|lot|farm|finca|estate|station|mill|sale|medium|dark|light|limited|grade|single[ -]?origin)\b/iu;
const titlePattern=/^([^|.\n]{3,105})\.\s*([\p{Lu}][\p{L}\p{M} ]{2,45})\.\s*([\p{Lu}][\p{Lu}\p{M} -]{2,60})\s+\|\s+([^|\n]{4,110})\.?$/u;
export function selectedDottedTitleCountryRegion({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<20||name.length>220||
  typeof origin!=='string'||origin.length<3||origin.length>48||
  origin.includes(',')||!Array.isArray(blocks)||blocks.length>2500)return null;
 const match=titlePattern.exec(name.trim());
 if(!match)return null;
 const [,coffee,country,region,notes]=match;
 if(norm(country)!==norm(origin)||norm(country)===norm(region)||
  coffee.trim().length<3||!region.trim()||!notes.trim()||
  region.trim().split(/\s+/u).length>4||
  forbidden.test(region)||/\d/.test(region)||
  /[!?;:/()]/u.test(region)||/[!?;:/()]/u.test(country))return null;
 // Only the exact purchasable product's H1 can establish this geography.
 // Navigation/category H1 may coexist; but any competing coffee-type H1
 // with its own dotted product-country-region form fails closed.
 const h1s=blocks.filter(b=>b?.tag==='h1'&&!b.educational&&
  typeof b.text==='string'&&b.text.length<=300).map(b=>b.text.trim());
 const matches=h1s.filter(text=>norm(text)===norm(name));
 const competing=h1s.filter(text=>/\s+\|\s+/u.test(text)&&norm(text)!==norm(name));
 if(!matches.length||competing.length)return null;
 // No other selected current origin label may be overridden; caller checks
 // both country-only origin and already-set conflict state.
 const value=region.trim().replace(/\s+/gu,' ')+', '+country.trim();
 return {value,quote:matches[0]};
}
