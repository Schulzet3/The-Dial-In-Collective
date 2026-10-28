// Compare explicitly stated cultivar lists without changing the roaster's
// display text or treating a cultivar's genetic parents as product evidence.
export function equivalentCoffeeVarieties(a,b){
 const key=value=>[...new Set(String(value||'').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\bgeisha\b/g,'gesha').replace(/\bsl\s+(\d{2})\b/g,'sl$1')
  .split(/\s*(?:,|;|\+|&|\/|\band\b)\s*/i)
  .map(part=>part.replace(/\s+(?:variet(?:y|ies|al|als)|cultivars?)$/i,'').replace(/[^a-z0-9]/g,'')).filter(Boolean))].sort().join('|');
 const first=key(a),second=key(b);
 return !!first&&first===second;
}

// Generic published categories can coexist with a literally named cultivar.
// This is a precision comparison between two source claims, not a lookup of
// cultivar ancestry or an inference from the coffee's producing country.
export function isGenericCoffeeVariety(value){
 return /^(?:(?:native|local|indigenous|ethiopian|regional|mixed)\s+){0,2}(?:heirlooms?|landraces?|mix|mixed|various|variety mix|blend|arabica)(?:\s+(?:variet(?:y|ies|al|als)|cultivars?))?$/i.test(String(value||'').trim());
}
export function compatibleGenericCoffeeVarieties(a,b){
 if(!a||!b)return null;
 const first=isGenericCoffeeVariety(a),second=isGenericCoffeeVariety(b);
 return first!==second?(first?b:a):null;
}
// Used only for an explicit current-crop composition statement, never to
// union two arbitrary metadata lists. The new list must include every prior
// named cultivar; a 100% claim cannot be expanded into a multi-variety mix.
export function explicitCoffeeVarietyRefinement(previous,current){
 if(compatibleGenericCoffeeVarieties(previous,current)===current)return true;
 const parts=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
  .replace(/^100\s*%\s*/,'').replace(/\bgeisha\b/g,'gesha').replace(/\bsl\s+(\d{2})\b/g,'sl$1')
  .split(/\s*(?:,|;|\+|&|\/|\band\b)\s*/i).map(part=>part.trim().replace(/\s+(?:variet(?:y|ies|al|als)|cultivars?)$/,'')).filter(Boolean);
 const before=parts(previous),after=parts(current);
 if(!before.length||!after.length||before.length>14||after.length>14||(/100\s*%/.test(previous)&&after.length!==before.length))return false;
 return before.every(value=>after.some(candidate=>candidate===value||candidate.replace(/^(?:red|yellow|pink|orange)\s+/,'')===value));
}

// Geographic precision can differ between a selected product's HTML and
// JSON. Compare complete delimited place names, never loose substrings:
// Huila, Colombia can enrich Colombia, but cannot replace Cauca, Colombia.
export function coffeeOriginParts(value){
 return [...new Set(String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/^(?:award[ -]winning\s+)?(?:100\s*%\s*)?/,'').replace(/^organically grown in\s+/,'')
  .replace(/\bbrasil\b/g,'brazil').replace(/\b(central|south|north|latin) americans?\b/g,'$1 america')
  .replace(/\b(?:eastern|east) african\b/g,'east africa').replace(/\bafrican\b/g,'africa')
  .replace(/\bguatemalan\b/g,'guatemala').replace(/\bcolombian\b/g,'colombia')
  .replace(/^(?:coffee|coffees|beans|blend)\s*(?:of\s+|:\s*)/,'')
  .replace(/\s+(?:coffee|coffees|beans|blend)$/,'')
  .replace(/[()]/g,',').split(/\s*(?:,|\/|;|&|\+|\||·|\band\b)\s*|\s+[-–—]\s+/i)
  .map(part=>part.replace(/[^a-z0-9]/g,'')).filter(Boolean))];
}
// A printed directional qualifier adds precision to a complete place name.
// Competing qualifiers still disagree (North Kona versus South Kona).
function placeContains(precise,broad){
 if(precise===broad)return true;
 // A printed protected-area name occasionally omits the final "l" from
 // "Natural Reserve" in a secondary Region caption. Require the SAME
 // complete long place stem and reserve designation; never fuzzy-match
 // other towns, countries or labels. Keep both literal source readings.
 if(precise.length>=20&&broad.length>=20&&
  precise.replace(/naturareserve$/,'naturalreserve')===broad.replace(/naturareserve$/,'naturalreserve'))return true;
 const withoutRole=value=>value.replace(/(?:woreda|municipality|province|district|department|region|zone)$/,'');
 const preciseName=withoutRole(precise),broadName=withoutRole(broad);
 if(preciseName.length>=3&&preciseName===broadName)return true;
 const match=/^(?:central|northern|southern|eastern|western|northeastern|northwestern|southeastern|southwestern|north|south|east|west)(.+)$/.exec(precise);
 return !!match&&match[1]===broad&&broad.length>=3;
}
// Broad regions printed by a product are compatible with an explicitly
// printed country inside that region. This only reconciles stated values;
// it never assigns an unstated country to a town, island, farm, or blend.
const BROAD_COUNTRIES={
 africa:'Ethiopia|Kenya|Rwanda|Burundi|Uganda|Tanzania|DR Congo|Democratic Republic of the Congo|Malawi|Zambia|Cameroon',
 eastafrica:'Ethiopia|Kenya|Rwanda|Burundi|Uganda|Tanzania',
 southamerica:'Colombia|Brazil|Peru|Ecuador|Bolivia|Venezuela',
 centralamerica:'Guatemala|Belize|Honduras|El Salvador|Nicaragua|Costa Rica|Panama',
 asia:'India|Indonesia|Thailand|Vietnam|China|Taiwan|Laos|Myanmar|Yemen|Philippines|Nepal|Timor-Leste|East Timor',
 oceania:'Papua New Guinea|Australia',
 northamerica:'United States|Mexico|Guatemala|Belize|Honduras|El Salvador|Nicaragua|Costa Rica|Panama|Cuba|Jamaica|Haiti|Dominican Republic|Puerto Rico'
};
BROAD_COUNTRIES.latinamerica=BROAD_COUNTRIES.southamerica+'|'+BROAD_COUNTRIES.centralamerica+'|Mexico|Cuba|Haiti|Dominican Republic|Puerto Rico';
const broadCountries=new Map(Object.entries(BROAD_COUNTRIES).map(([region,countries])=>[region,new Set(countries.split('|').flatMap(coffeeOriginParts))]));
const knownCountries=new Set([...broadCountries.values()].flatMap(value=>[...value]));
export const isCoffeeBroadOrigin=value=>{const parts=coffeeOriginParts(value);return parts.length>0&&parts.every(part=>broadCountries.has(part));};
function broadContains(broad,precise){
 const regions=coffeeOriginParts(broad),parts=coffeeOriginParts(precise);
 if(!regions.length||!regions.every(region=>broadCountries.has(region)))return false;
 const countries=parts.filter(part=>knownCountries.has(part));
 return countries.length>0&&countries.every(country=>regions.some(region=>broadCountries.get(region).has(country)));
}
export function compatibleCoffeeOrigins(first,second){
 const a=coffeeOriginParts(first),b=coffeeOriginParts(second);
 if(!a.length||!b.length)return null;
 if(a.every(part=>b.some(other=>placeContains(other,part))))return second;
 if(b.every(part=>a.some(other=>placeContains(other,part))))return first;
 if(broadContains(first,second))return second;
 if(broadContains(second,first))return first;
 return null;
}

/**
 * Presentation-only canonical ordering of a *printed* country-first locality:
 * "Burundi · Gatara, Kayanza" -> "Gatara, Kayanza, Burundi".
 * Never use a gazetteer to add a missing country, join a blend, or resolve
 * competing claims. Source facts retain the exact published text.
 */
export function orderExplicitCoffeeOriginTuple(value){
 if(typeof value!=='string'||value.length>220)return value;
 const match=/^([\p{L}][\p{L}\s'-]{1,60})\s*·\s*([^·]{3,130})$/u.exec(value.trim());
 if(!match)return value;
 const country=match[1].trim(),place=match[2].trim();
 const key=coffeeOriginParts(country);
 if(key.length!==1||!knownCountries.has(key[0]))return value;
 const parts=place.split(/\s*,\s*/u);
 if(parts.length<1||parts.length>3||parts.some(part=>
  part.length<3||part.length>65||!/^[\p{L}][\p{L}\p{M}\s'’().-]*$/u.test(part)||
  /\b(?:coffee|roast|blend|tasting|process|price|shipping|offer|subscription)\b/iu.test(part)||
  coffeeOriginParts(part).some(piece=>knownCountries.has(piece))))return value;
 return [...parts,country].join(', ');
}
