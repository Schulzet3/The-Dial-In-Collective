// Identity comparisons are bounded and literal. The public endpoint must
// still match the exact requested handle; this only reconciles its title with
// visible HTML commerce decoration and an explicitly published brand.
const ENTITIES={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',
 aacute:'á',agrave:'à',acirc:'â',atilde:'ã',auml:'ä',aring:'å',aelig:'æ',ccedil:'ç',
 eacute:'é',egrave:'è',ecirc:'ê',euml:'ë',iacute:'í',igrave:'ì',icirc:'î',iuml:'ï',ntilde:'ñ',
 oacute:'ó',ograve:'ò',ocirc:'ô',otilde:'õ',ouml:'ö',oslash:'ø',oelig:'œ',
 uacute:'ú',ugrave:'ù',ucirc:'û',uuml:'ü',yacute:'ý',yuml:'ÿ',szlig:'ß'};
export function coffeeIdentityText(value){
 if(typeof value!=='string'||value.length>1000)return '';
 return value.replace(/&(#x[0-9a-f]{1,8}|#[0-9]{1,9}|[a-z]{2,12});/gi,(original,entity)=>{
  const key=entity.toLowerCase();
  if(key[0]==='#'){
   const hex=key.startsWith('#x'),number=Number.parseInt(key.slice(hex?2:1),hex?16:10);
   return number>0&&number<=0x10ffff&&!(number>=0xd800&&number<=0xdfff)?String.fromCodePoint(number):original;
  }
  const decoded=ENTITIES[key];
  if(!decoded)return original;
  return entity[0]===entity[0].toUpperCase()&&/[a-z]/i.test(decoded)?decoded.toUpperCase():decoded;
 }).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
}
export const coffeeIdentityKey=value=>coffeeIdentityText(String(value??'')).normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const TRAILING_COMMERCE_PRICE=/\s*(?:[-–—|]\s*)?\$\s*\d{1,5}(?:[.,]\d{2})?(?:\s*USD)?\s*$/i;
// Only sanitize AFTER resolving the exact selected product; never discover a
// coffee or infer its name, origin or lot from commerce price or other pages.
export function selectedCoffeeNameWithoutPrice(value){
 const name=coffeeIdentityText(value);
 const stripped=name.replace(TRAILING_COMMERCE_PRICE,'').trim();
 return stripped.length>=3?stripped:name;
}

function plain(value){
 return coffeeIdentityText(value)
  .replace(TRAILING_COMMERCE_PRICE,'')
  .replace(/\s+coffee\s+beans\s*$/i,'').trim();
}
function variants(value,brands){
 const original=plain(value),found=new Set([coffeeIdentityKey(original)]);
 for(const raw of brands.slice(0,12)){
  const brand=coffeeIdentityText(raw);if(brand.length<2||brand.length>150)continue;
  const escaped=escape(brand);
  for(const candidate of [original.replace(new RegExp('^'+escaped+'\\s*[-–—|:]\\s+','i'),''),
   original.replace(new RegExp('\\s+[-–—|:]\\s*'+escaped+'$','i'),'')]){
   const key=coffeeIdentityKey(plain(candidate));if(key)found.add(key);
  }
 }
 found.delete('');return found;
}
export function equivalentCoffeeProductNames(first,second,{brands=[]}={}){
 const a=variants(first,Array.isArray(brands)?brands:[]),b=variants(second,Array.isArray(brands)?brands:[]);
 return a.size>0&&b.size>0&&[...a].some(key=>b.has(key));
}

function roasterStem(value){
 let text=coffeeIdentityText(value);
 for(let count=0;count<12;count++){
  const shorter=text.replace(/[\s&.,]+$/g,'').replace(/(?:coffees?|roasters?|roasting|roastery|company)$/i,'')
   .replace(/\b(?:co\.?|llc|inc\.?|ltd\.?|tea|and)$/i,'').replace(/[\s&.,]+$/g,'');
  if(shorter===text)break;text=shorter;
 }
 return coffeeIdentityKey(text);
}
// Compare names actually printed by the selected product and its site. This
// never infers a company from a hostname or replaces an unrelated vendor.
export function preferredCoffeeRoasterName(current,candidate,{preferCandidate=false,corroborated=false}={}){
 if(typeof current!=='string'||typeof candidate!=='string'||current.length>200||candidate.length>200)return current;
 const first=coffeeIdentityText(current),second=coffeeIdentityText(candidate);
 const a=coffeeIdentityKey(first),b=coffeeIdentityKey(second);
 if(!a||!b)return current;
 if(a===b)return preferCandidate?second:first;
 const stem=roasterStem(first);
 if(stem.length>=3&&stem===roasterStem(second))
  return preferCandidate||b.startsWith(a)?second:first;
 if(corroborated){
  // A same-site structured Organization may state the undecorated business
  // name separately from its SEO location, or spell out a vendor acronym.
  const decorated=first.split(/\s+[|–—]\s+/);
  if(decorated.length===2&&coffeeIdentityKey(decorated[0])===b)return second;
  const acronym=first.match(/^([A-Z]{3,8})(?:\s+(?:Coffee|Roasters?|Roastery|Company))*$/);
  const words=second.match(/[\p{L}]+/gu)||[];
  if(acronym&&words.length>=3&&words.length<=8&&words.map(word=>word[0].toUpperCase()).join('')===acronym[1])return second;
  if(first.split(/\s+/).length>=2&&a.length>=8&&b===a+'s')return second;
 }
 return first;
}
