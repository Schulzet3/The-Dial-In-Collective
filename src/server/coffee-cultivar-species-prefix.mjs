// A botanical species is not itself a named cultivar. Strip ONLY a literal,
// semicolon-delimited species prefix preceding a fully explicit supported
// cultivar enumeration. Keep the unmodified roaster caption in source facts.
const cultivar=/^(?:Bourbon|(?:Pink|Red|Yellow|Orange) Bourbon|Caturra|(?:Red|Yellow) Catua[ií]|Catua[ií]|Castillo|Catimor(?: 129)?|F6|Typica|Gesha|Geisha|Pache|Pacamara|Parainema|Maragogipe|Maragogype|Tabi|Sidra|Chiroso|Sarchimor|Pacas|Mundo Novo|Mondo Novo|SL ?(?:14|28|34)|Ruiru 11|Batian|Heirloom)$/iu;
export function withoutStandaloneCoffeeSpeciesPrefix(value){
 if(typeof value!=='string'||value.length>200)return value;
 const m=value.match(/^A\s*rabica\s*;\s*([^;]{5,140})$/iu);
 if(!m)return value;
 const parts=m[1].split(/\s*,\s*/u).map(s=>s.trim());
 if(parts.length<2||parts.length>8||!parts.every(v=>cultivar.test(v)))return value;
 return parts.join(', ');
}
