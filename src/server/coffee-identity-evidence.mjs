import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {compatibleCoffeeOrigins,isGenericCoffeeVariety} from './coffee-fact-compatibility.mjs';
import {withoutNaturalDecaffeinationModifier} from './coffee-processing-evidence.mjs';

// Literal source vocabulary, used only inside the already selected product.
// It supplies no guessed origin/variety based on a roaster or a genetic parent.
const COUNTRIES='Papua New Guinea|Democratic Republic of the Congo|Dominican Republic|United States|Costa Rica|El Salvador|East Timor|Timor-Leste|Puerto Rico|DR Congo|Ethiopia|Colombia|Kenya|Brazil|Brasil|Guatemala|Honduras|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Vietnam|China|Taiwan|Laos|Myanmar|Venezuela|Philippines|Malawi|Zambia|Nepal|Australia|Cuba|Haiti|Jamaica|Cameroon';
const COUNTRY_RE=new RegExp('\\b('+COUNTRIES+')\\b','gi');
const COUNTRY_ONLY=new RegExp('^(?:'+COUNTRIES+')$','i');
const DEMONYMS={Ethiopian:'Ethiopia',Colombian:'Colombia',Kenyan:'Kenya',Brazilian:'Brazil',Guatemalan:'Guatemala',
 'Costa Rican':'Costa Rica',Honduran:'Honduras',Salvadoran:'El Salvador',Nicaraguan:'Nicaragua',Panamanian:'Panama',
 Peruvian:'Peru',Rwandan:'Rwanda',Burundian:'Burundi',Mexican:'Mexico',Ecuadorian:'Ecuador',Bolivian:'Bolivia',
 Indonesian:'Indonesia',Ugandan:'Uganda',Tanzanian:'Tanzania',Yemeni:'Yemen',Indian:'India',Thai:'Thailand',
 Vietnamese:'Vietnam',Chinese:'China',Taiwanese:'Taiwan',Laotian:'Laos',Burmese:'Myanmar',Venezuelan:'Venezuela',
 Philippine:'Philippines',Zambian:'Zambia',Jamaican:'Jamaica',Cameroonian:'Cameroon'};
const DEMONYM_RE=new RegExp('\\b('+Object.keys(DEMONYMS).join('|')+')\\s+(?:coffee|beans?|lot|crop)\\b','gi');
const SOURCE_PLACE_ADJECTIVES={...DEMONYMS,African:'Africa','Central American':'Central America','South American':'South America',
 'North American':'North America','Latin American':'Latin America','Eastern African':'East Africa','East African':'East Africa'};
const SOURCE_PLACE_WORDS=[...Object.keys(SOURCE_PLACE_ADJECTIVES).sort((a,b)=>b.length-a.length),...COUNTRIES.split('|'),
 'Central America','South America','North America','Latin America','East Africa','Africa','Sumatra','Bali','Timor','Kona','Hawaii'];
const SOURCE_PLACE_RE=new RegExp('\\b('+SOURCE_PLACE_WORDS.join('|')+')\\b','gi');
const VARIETIES=String.raw`(?:red\s+and\s+yellow\s+Caturra|(?:Pink|Red|Yellow|Orange|Rosado)\s+Bourbon|Bourbon\s+(?:Aj[ií]|Rosado)|(?:Red|Yellow)\s+Catua[ií]|Bourbon|Caturra|Catua[ií]|Catimor(?:\s+129)?|Castillo|Typica|Mundo\s+Novo|Mondo\s+Novo|SL\s*[-]?\s*(?:14|28|34)|Ruiru\s*11|Batian|Gesha|Geisha|Chiroso|Pacamara|Maragogipe|Maragogype|Maragesha|Pache|Parainema|Tabi|Wush\s*Wush|Sidra|Arusha|Marsellesa|Sarchimor|Pacas|Villa\s+Sarchi|San\s+Isidro|Fragancia|Ethiopian\s+(?:Landraces?|Heirloom)|Heirloom|Local\s+(?:Landraces?|Cultivars?))`;
const VARIETY_RE=new RegExp('(?<![\\p{L}\\d])('+VARIETIES+')(?![\\p{L}\\d])','giu');
// Colombia is also a cultivar name, but only an explicit cultivar sentence
// may use it that way. It must never make a Colombian product title, country
// caption or a bare geographic heading into a variety claim.
const EXPLICIT_VARIETIES='(?:'+VARIETIES+'|Colombia)';
const EXPLICIT_VARIETY_RE=new RegExp('(?<![\\p{L}\\d])('+EXPLICIT_VARIETIES+')(?![\\p{L}\\d])','giu');
const PROCESS=String.raw`(?:anaerobic[ -]+(?:natural|washed|honey)|(?:natural|washed|honey)[ -]+anaerobic|pulped[ -]+natural|fully[ -]+washed|wet[ -]+hulled|semi[ -]+washed|wet[ -]+process(?:ed|ing)?|dry[ -]+process(?:ed|ing)?|dried\s+in\s+(?:the\s+)?cherry|unwashed|washed|natural|honey|anaerobic)`;
const key=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const unique=values=>[...new Map(values.map(value=>[key(value),value])).values()];
const sentences=value=>value.split(/(?<=[.!?])\s+/u).map(text=>text.trim()).filter(Boolean);
const current=value=>!NONCURRENT_COFFEE_PROSE.test(value.replace(/\bnot only\b/gi,'').replace(/\b(?:without|no)\s+oxygen\b/gi,'oxygen-free'))&&
 !/\b(?:generic|advice|glossary|varietal library|genetic|genetics|cross between|cross of|hybrid of|mutation of|descended from|originally (?:designed|developed|bred)|transplanted|(?:one|an?)\s+(?:(?:excellent|common|good|classic|well-known)\s+)?example\s+(?:is|of)|also grows|also produces|we offer(?!\s+(?:this|the current)\s+(?:coffee|lot)\b)|we roast|our selection|our entire|other varieties|types of coffee|coffee culture|colonial|historical|first planted|first introduced|born|birthplace|visited|traveled|travelled)\b/i.test(value);
function countryNames(value){
 return unique([...String(value).matchAll(COUNTRY_RE)].filter(match=>
  !/^\s+(?:nut|nuts|variet(?:y|al)|cultivar)\b/i.test(value.slice(match.index+match[0].length))&&
  // A farm can be named after another country. "Finca Costa Rica in
  // Huila, Colombia" publishes Colombia, not a two-country blend. Limit
  // this exclusion to the capitalized proper-name phrase before the word;
  // "a farm in Costa Rica" still supplies literal geography.
  !/\b(?:[Ff]inca|[Hh]acienda|[Ff]arm|[Ee]state)\s+(?:\p{Lu}[\p{L}\p{M}'’.-]*\s+){0,5}$/u.test(value.slice(Math.max(0,match.index-100),match.index)))
  .map(match=>match[1]));
}
export function literalCoffeeSourcePlaces(value){
 let text=String(value||'').replace(/\b(Central|South|North|Latin)\s*(?:and|&|\/)\s*(Central|South|North|Latin)\s+America(?:n)?s?\b/gi,'$1 America and $2 America');
 const places=[];
 for(const match of text.matchAll(SOURCE_PLACE_RE)){
  if(/^\s+(?:landraces?|heirlooms?|cultivars?|variet(?:y|ies|al|als)|nuts?)\b/i.test(text.slice(match.index+match[0].length)))continue;
  if(/\b(?:Finca|Hacienda|Farm|Estate)\s+(?:\p{Lu}[\p{L}\p{M}'’.-]*\s+){0,5}$/u.test(text.slice(Math.max(0,match.index-100),match.index)))continue;
  const adjective=Object.keys(SOURCE_PLACE_ADJECTIVES).find(word=>word.toLowerCase()===match[1].toLowerCase());
  places.push(adjective?SOURCE_PLACE_ADJECTIVES[adjective]:match[1]);
 }
 return unique(places);
}
function completeVarietyPhrase(value,{explicit=false}={}){
 const clean=String(value).trim().replace(/^(?:100\s*%|predominantly|primarily)\s*/i,'')
  .replace(/\s+(?:variet(?:y|ies|al|als)|cultivars?)\s*$/i,'');
 const pattern=explicit?EXPLICIT_VARIETY_RE:VARIETY_RE,matches=[...clean.matchAll(pattern)];
 if(!matches.length||matches.length>14)return '';
 let residue=clean.replace(pattern,'').replace(/\b(?:and|or)\b/gi,'').replace(/[\s,;&/+()–—-]/g,'');
 if(residue)return '';
 return String(value).trim();
}
export {completeVarietyPhrase as explicitCoffeeVarietyList};
function processValue(value){
 if(/\bpulped[ -]+natural\b/i.test(value))return 'Honey';
 if(/\b(?:wet[ -]+hulled|semi[ -]+washed)\b/i.test(value))return 'Other/Unknown';
 if(/\bwet[ -]+process(?:ed|ing)?\b/i.test(value))return 'Washed';
 if(/\b(?:dry[ -]+process(?:ed|ing)?|unwashed|dried\s+in\s+(?:the\s+)?cherry)\b/i.test(value))return 'Natural';
 if(/\banaerobic(?:ally)?\b/i.test(value))return 'Anaerobic';
 if(/\bwashed\b/i.test(value))return 'Washed';
 if(/\bhoney\b/i.test(value))return 'Honey';
 if(/\bnatural(?:ly)?\b/i.test(value))return 'Natural';
 return '';
}
export function extractCoffeeTitleOrigin(name){
 if(typeof name!=='string'||name.length>220||/^(?:Finca|Farm|Hacienda|Estate)\b/i.test(name))return null;
 const countries=countryNames(name);
 for(const [word,country] of Object.entries(DEMONYMS)){
  const match=new RegExp('\\b'+word+'\\b','i').exec(name);
  // A national cultivar label describes the plant, not where this lot grew.
  // Ethiopian Landrace can be grown elsewhere; a separately printed country
  // remains valid evidence, but this adjective alone cannot supply one.
  if(match&&!/^\s*(?:-[ ]?style\b|style\b|roast\b|(?:landraces?|heirlooms?|variet(?:y|ies|al|als)|cultivars?)\b)/i.test(name.slice(match.index+match[0].length))&&
     !countries.some(value=>key(value)===key(country)))countries.push(country);
 }
 if(countries.length&&countries.length<=4&&(countries.length===1||/\bblend\b/i.test(name)))
  return {label:'Country',value:countries.join(', ')};
 // These are literal geographic names, not a lookup of an unstated country.
 const places=unique([...name.matchAll(/\b(Sumatra|Bali|Timor|Kona|Hawaii)\b/gi)].map(match=>match[1]));
 return places.length===1?{label:'Origin',value:places[0]}:null;
}
export function coffeeDescriptionCountryMismatch(description,{name='',origin=''}={}){
 const expected=countryNames(origin);
 if(!expected.length){
  const title=extractCoffeeTitleOrigin(name);
  if(title?.label==='Country')expected.push(...countryNames(title.value));
 }
 if(!expected.length||typeof description!=='string'||description.length>16000)return false;
 const pattern=new RegExp('\\b(?:this|our(?:\\s+(?:first|new|latest|current))?)\\s+(?:coffee|offering|lot|release|selection|beans?)\\b[^.!?]{0,65}\\bfrom\\s+('+COUNTRIES+')\\b','gi');
 const declared=[...description.matchAll(pattern)].map(match=>match[1]);
 for(const match of description.matchAll(new RegExp('(?:^|[.;|])\\s*(?:Origin|Country(?: of Origin)?)\\s*:\\s*('+COUNTRIES+')\\b','gi')))
  declared.push(match[1]);
 return declared.some(country=>!expected.some(value=>key(value)===key(country)));
}

// A page can retain a correct URL/title while its SEO sentence names another
// coffee from the same country. Require an explicit named-coffee subject and
// distinct non-generic name tokens on both sides before rejecting that fallback.
export function coffeeDescriptionNamedCoffeeMismatch(description,{name='',origin=''}={}){
 if(typeof description!=='string'||description.length>16000||!name)return false;
 const expected=countryNames(origin);
 if(!expected.length){
  const title=extractCoffeeTitleOrigin(name);
  if(title?.label==='Country')expected.push(...countryNames(title.value));
 }
 if(!expected.length)return false;
 const nationalWords=[...COUNTRIES.split('|'),...Object.keys(DEMONYMS)].sort((a,b)=>b.length-a.length).join('|');
 const tokens=value=>new Set(String(value).replace(new RegExp('\\b(?:'+nationalWords+')\\b','gi'),' ')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\b(?:coffee|coffees|beans?|blend|lot|grade|washed|natural|honey|anaerobic|process(?:ed)?|roast|light|medium|dark|organic|single|origin|supernatural|regions?|zones?|districts?|communities|community|departments?|provinces?|states?|municipalities|municipality|towns?|villages?|valleys?|mountains?|highlands|hills|foothills|slopes?|peaks?)\b/g,' ')
  .match(/[a-z]{3,}/g)||[]);
 const selected=tokens(name);
 if(selected.size<2)return false;
 // A marketed coffee name may differ from its explicitly labeled locality.
 // The selected origin can corroborate that same locality in the SEO subject.
 for(const token of tokens(origin))selected.add(token);
 const named=new RegExp('^(('+nationalWords+')\\s+\\p{Lu}[\\p{L}\\p{M}\\d \'’–-]{2,150}?)\\s+(?:is|was)\\s+(?:sourced|grown|produced|cultivated)\\b','u');
 for(const sentence of sentences(description)){
  const match=named.exec(sentence);
  if(!match||!current(sentence))continue;
  const declaredCountry=DEMONYMS[match[2]]||match[2];
  if(!expected.some(value=>key(value)===key(declaredCountry)))return true;
  const declared=tokens(match[1]);
  const labeledLocality=/\b(?:regions?|zones?|districts?|communities|community|departments?|provinces?|states?|municipalities|municipality|towns?|villages?)\b/i.test(match[1]);
  if((declared.size>=2||(declared.size===1&&labeledLocality))&&![...declared].some(token=>selected.has(token)))return true;
 }
 return false;
}

// A short heading can explicitly put a named subregion, region and country
// together. This corroboration must arrive before narrower independent labels
// are compared; it never invents the location of an otherwise unknown place.
export function extractCoffeeGeographyTuples(html,{clean,name='',includeCurrentLocality=false}={}){
 const found=[];
 // A selected Product description may be plain text rather than visible
 // markup. Only this opt-in path admits its explicit current-place relation.
 if(includeCurrentLocality&&typeof html==='string'&&!/<[a-z][^>]*>/i.test(html))
  html='<p>'+html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>';
 const blocks=productCoffeeProse(html,clean);
 // A comma list in a selected title can contain flavors or people. Require
 // each non-country word to have a literal geographic role in current
 // selected prose before using the title's complete location tuple.
 const geographicSentences=blocks.filter(block=>!block.educational&&!/^h[1-6]$/.test(block.tag))
  .flatMap(block=>sentences(block.text)).filter(value=>value.length<=1800&&current(value));
 const geographicRole=value=>{
  const escaped=value.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
  const site=new RegExp('\\b(?:washing station|wet mill|dry mill|farm|estate)\\s+(?:(?:is\\s+)?(?:located|situated)\\s+)?in\\s+'+escaped+'(?=[,.;:!?–—]|\\s|$)','iu');
  const terrain=new RegExp('(?:^|[,:;]\\s*)'+escaped+'\\s+(?:sits|lies|is\\s+(?:located|situated))\\s+(?:in|between|on|along)\\b','u');
  return geographicSentences.some(sentence=>site.test(sentence)||
   (terrain.test(sentence)&&/\b(?:mountains?|saddle|valley|highlands|hills|slopes|range)\b/i.test(sentence)&&
    /\b(?:coffee|coffees|beans|farms?|grown|growing|planted|cultivat\w*)\b/i.test(sentence)));
 };
 const titleTuples=String(name).split(/\s+[–—-]\s+/).slice(1).filter(value=>{
  const parts=value.split(',').map(part=>part.trim());
  return parts.length>=3&&parts.length<=6&&COUNTRY_ONLY.test(parts.at(-1))&&
   parts.slice(0,-1).every(part=>/^\p{Lu}[\p{L}\p{M} .’'()-]{1,60}$/u.test(part)&&
    !completeVarietyPhrase(part,{explicit:true})&&geographicRole(part))&&
   !/\b(?:coffee|roast|process(?:ed|ing)?|washed|natural|honey|anaerobic|variety|farm|finca|estate|station|street|avenue|road|suite|awards?|competition|cup of excellence|grade)\b/i.test(value);
 });
 if(titleTuples.length===1&&name.length<=220)found.push(titleTuples[0].trim());
 for(const block of blocks){
  if(block.educational||!/^h[1-6]$/.test(block.tag)||block.text.length>220||!current(block.text)||key(block.text)===key(name))continue;
  let value=block.text;
  const split=value.match(/^(.{3,100}?)\s+[–—-]\s+(.{4,150})$/);
  if(split){
   if(!/\b(?:Cooperative|Co-?op|Farm|Finca|Hacienda|Estate|Station|Growers)\b/i.test(split[1]))continue;
   value=split[2];
  }
  const parts=value.split(',').map(part=>part.trim());
  if(parts.length<3||parts.length>6||!COUNTRY_ONLY.test(parts.at(-1))||
     parts.slice(0,-1).some(part=>!/^\p{Lu}[\p{L}\p{M} .’'()-]{1,60}$/u.test(part))||
     /\b(?:coffee|roast|process(?:ed|ing)?|washed|natural|honey|anaerobic|variety|shipping|street|avenue|road|suite)\b/i.test(value))continue;
  if(!found.some(item=>key(item)===key(value)))found.push(value);
  if(found.length>=12)break;
 }
 if(includeCurrentLocality)for(const place of narrativeGeography(blocks.filter(block=>!block.educational),{currentLocalityOnly:true})){
  // Early tuple reconciliation needs a country in this same source claim.
  // Keep partial geography as source evidence, without forcing a conflict
  // when the page's separate Region and Country labels arrive later.
  if(place.label!=='Origin')continue;
  if(found.length>=12)break;
  if(!found.some(value=>key(value)===key(place.value)))found.push(place.value);
 }
 return found;
}
const PLACE_WORD=String.raw`\p{Lu}[\p{L}\p{M}’'.-]*`;
const PLACE=PLACE_WORD+String.raw`(?:\s+(?:(?:de|del|la|las|los|da|das|do|dos|of|the|and|y)\s+)?`+PLACE_WORD+String.raw`){0,7}`;
const PLACE_KIND=String.raw`(?:[Rr]egion|[Zz]one|[Dd]istrict|[Dd]epartment|[Pp]rovince|[Ss]tate|[Mm]unicipality|[Tt]own|[Vv]illage|[Cc]ommunity|[Vv]alley|[Mm]ountains?|[Hh]ighlands|[Hh]ills|[Ff]oothills|[Ss]lopes|[Pp]eaks)`;
function completeSourcePlaceList(value){
 const text=value.replace(/\b(Central|South|North|Latin)\s*(?:and|&|\/)\s*(Central|South|North|Latin)\s+America(?:n)?s?\b/gi,'$1 America and $2 America');
 const residue=text.replace(SOURCE_PLACE_RE,'').replace(/\band\b/gi,'').replace(/[\s,;&/+–—-]/g,'');
 const places=literalCoffeeSourcePlaces(text);
 return !residue&&places.length&&places.length<=8?places:[];
}
function directOriginClaims(sentence){
 // These negative idioms describe cup quality or the intended drinker, not
 // the source. Remove only the complete idiom for the current-claim check;
 // ordinary denials, historical lots and recommendations still fail it.
 const scope=sentence.replace(/\bnot for the faint[- ]?hearted(?: coffee drinker)?\b/gi,'')
  .replace(/\b(?:doesn['’]t|does not) compromise on (?:flavo[u]?r|quality)\b/gi,'');
 if(sentence.length>1400||!current(scope)||/\b(?:hypothetical|might|could|used to|previously|formerly)\b/i.test(scope))return [];
 const claims=[];
 // A roast adjective is allowed inside an explicit single-origin source
 // phrase. It does not make a roasting address into the growing country.
 const from=new RegExp('\\bsingle[ -]origin\\s+(?:(?:light|medium|dark|mountain|water|decaf|decaffeinated|washed|natural|honey|anaerobic|roast|coffee|beans?)\\s+){0,8}(?:is\\s+)?from\\s+(?:the\\s+(?:highlands|mountains|heart)\\s+of\\s+)?('+COUNTRIES+')\\b','gi');
 for(const match of sentence.matchAll(from))claims.push({value:match[1],quote:sentence,country:true});
 const area=sentence.match(new RegExp('\\bsingle[ -]origin\\s+((?:Sumatra|Bali|Timor|Kona|Hawaii)(?:\\s+'+PLACE_WORD+'){0,3})\\s+(?:'+PROCESS+')(?:\\s+process(?:ed|ing)?)?\\s+coffee\\b','u'));
 if(area)claims.push({value:area[1],quote:sentence});
 const hails=sentence.match(new RegExp('\\b(?:[Tt]his|[Oo]ur)\\s+(?:coffee|lot|beans?)\\s+hails?\\s+from\\s+('+PLACE+'(?:,\\s*'+PLACE+'){0,3})(?=\\s|[,.!;–—]|$)','u'));
 if(hails&&!/\b(?:Finca|Hacienda|Farm|Estate|Cooperative|Station|Mill)\b/u.test(hails[1]))
  claims.push({value:hails[1].replace(/[.!]+$/,''),quote:sentence});
 const compact=sentence.match(/^Blend(?: components?)?\s*[:：]\s*(.{2,180})[.!]?$/i)||
  sentence.match(/^(.{2,180}?)\s+blend[.!]?$/i);
 const components=sentence.match(/\bblend\s+of\s+(?:(?:light|medium|dark|roasted|washed|natural)\s+){0,5}(.{2,180}?)\s+(?:coffees|beans)\b/i);
 for(const list of [compact?.[1],components?.[1]]){
  if(!list)continue;
  const places=completeSourcePlaceList(list.replace(/[.!]+$/,''));
  if(places.length)claims.push({value:places.join(', '),quote:sentence,multiple:true});
 }
 return claims;
}
function narrativeGeography(blocks,{currentLocalityOnly=false}={}){
 const candidates=[];
 const add=(value,quote)=>{
  value=value.replace(/\s+/g,' ').replace(/[,; ]+$/,'').trim();
  if(value.length<3||value.length>220||/^(?:The|This|Our|A|An|It)\b|\b(?:Finca|Hacienda|Farm|Estate|Cooperative|Coop|Producer|Coffee|Process|Washed|Natural|Honey|Gesha|Geisha|Bourbon|Roast|Blend|Agriculture|Commerce|Certification)\b/u.test(value))return;
  if(!candidates.some(item=>key(item.value)===key(value)))candidates.push({value,quote});
 };
 for(const block of blocks){
  if(/^h[1-6]$/.test(block.tag))continue;
  for(let sentence of sentences(block.text)){
   if(sentence.length>1800||!current(sentence)||! /\b(?:coffee|coffees|beans?|cherries|grow(?:n|ing|s)?|cultivat|sourc|farm|finca|hacienda|estate|cooperative|station|mill|producer)\w*\b/i.test(sentence)||
      /\b(?:born|birth|visited|travel(?:ed|led|ing)?|moved from|border with|border of|roasted in|roasting in|ships? from|certified|certification|decaffeination plant|sent a container|in those days|previously|originally collected)\b/i.test(sentence)||
      /\bwater\b.{0,65}\b(?:sourced|comes?|drawn)\s+from\b/i.test(sentence)||
      /\b(?:variety|cultivar)\b.{0,65}\b(?:grown|collected|introduced|originated|discovered)\b/i.test(sentence))continue;
   // The selected coffee's direct source locality outranks a nearby
   // landmark in the same sentence. SEY describes Ruarai as coming from
   // Nyeri *on the slopes of Mount Kenya*: the mountain is context, not a
   // second named origin. Require the literal current-coffee clause and
   // the explicit landmark relation; never infer an unprinted country.
   const currentLocality=sentence.match(/\b(?:this|our|the)\s+(?:coffee|lot|offering)\s+comes?\s+from\s+([\p{Lu}][\p{L}\p{M}'’.-]{1,65}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{1,60}){0,3})\s+on\s+the\s+(?:(?:north|south|east|west)(?:ern)?\s+)?slopes?\s+of\s+(?:Mount|Mt\.?|Mountain)\s+[\p{Lu}][\p{L}\p{M}'’.-]{1,65}\b/iu);
   if(currentLocality){
    const literalCountries=countryNames(sentence);
    if(literalCountries.length===1)
     add(currentLocality[1]+', '+literalCountries[0],sentence);
    else add(currentLocality[1],sentence);
    continue;
   }
   if(currentLocalityOnly)continue;
   // A neighboring social project is context, not a claim that this lot
   // grew there. Keep a direct current-lot source clause if one is printed.
   const nearby=/\b(?:nearby|neighbou?ring)\b/i.exec(sentence);
   if(nearby&&/\b(?:social\s+(?:reintegration|programs?|projects?)|community\s+projects?|former\s+combatants)\b/i.test(sentence)){
    const direct=sentence.slice(0,nearby.index).replace(/[,;:–—\s]+$/,'');
    if(!/\b(?:this|our|the current)\s+(?:coffee|lot|offering|beans?)\s+(?:comes?\s+from|(?:is|are)\s+(?:grown|sourced|produced)\s+(?:in|from))\b/i.test(direct))continue;
    sentence=direct;
   }
   const pieces=[];
   const remember=value=>{
    value=value.replace(/\s+(?:region|zone|district|department|province|state|municipality)\b.*$/i,'').replace(/[.!?]+$/,'').trim();
    const possessive=value.match(new RegExp('^('+COUNTRIES+')[’\']s(?:\\s+(.+))?$','u'));
    if(possessive){if(possessive[2])remember(possessive[2]);remember(possessive[1]);return;}
    if(/^(?:Central|Northern|Southern|Eastern|Western|North|South|East|West)$/i.test(value))return;
    // Country possessives can introduce awards or coffee grades as well
    // as places. Neither a competition name nor a screen grade is a region.
    if(/\b(?:cup of excellence|awards?|competitions?|championships?)\b/i.test(value)||
       (/^(?:AA|AB|PB|EP|SHB|SHG)$/i.test(value)&&/\b(?:grade|graded|screen|size|classification)\b/i.test(sentence)))return;
    if(value&&!pieces.some(part=>key(part)===key(value)))pieces.push(value);
   };
   const tupleParts=value=>{
    const parts=value.split(/,\s*/).map(part=>part.replace(/[.!?]+$/,''));
    const countryAt=parts.findIndex(part=>COUNTRY_ONLY.test(part.replace(/[’']s$/u,'')));
    // A country closes a place tuple. A following farm/person apposition
    // cannot become another place; retain genuine multi-country lists.
    return countryAt>=0&&!parts.slice(countryAt+1).some(part=>COUNTRY_ONLY.test(part.replace(/[’']s$/u,'')))?
     parts.slice(0,countryAt+1):parts;
   };
   // An explicit current-coffee clause can place the country before its
   // locality: "the western part of Honduras, Pacavita". Keep both names.
   const countryFirst=sentence.match(new RegExp('\\b(?:[Tt]hese|[Oo]ur|[Tt]he|[Tt]his)\\s+(?:beans|coffee|lot)\\s+comes?\\s+from\\s+the\\s+(?:northern|southern|eastern|western|central|northwestern|northeastern|southwestern|southeastern)\\s+part\\s+of\\s+('+COUNTRIES+'),\\s*('+PLACE+')(?=\\s*,\\s*(?:which|where)|[.!;]|$)','u'));
   if(countryFirst){remember(countryFirst[2]);remember(countryFirst[1]);}
   // Each pattern contains an actual geographic relationship. A bare farm
   // name, a product title, or a nearby country is not enough to invent a
   // town. Preserve every place word from the selected sentence verbatim.
   for(const match of sentence.matchAll(new RegExp('(?:[Ii]n|[Ff]rom|[Nn]ear|[Oo]f)\\s+(?:the\\s+)?('+PLACE+'(?:,\\s*'+PLACE+'){1,5})','gu'))){
    const parts=tupleParts(match[1]);
    if(COUNTRY_ONLY.test(parts.at(-1).replace(/[’']s$/u,'')))for(const part of parts)remember(part);
   }
   for(const match of sentence.matchAll(new RegExp('(?:[Ll]ocated|[Gg]rown|[Ss]ituated|[Pp]roduced)\\s+in\\s+(?:(?:northern|southern|eastern|western|central)\\s+)?('+PLACE+')\\s+in\\s+(?:the\\s+)?('+PLACE+')\\s+'+PLACE_KIND+'\\s+of\\s+('+COUNTRIES+')\\b','gu'))){
    remember(match[1]);remember(match[2]);remember(match[3]);
   }
   for(const match of sentence.matchAll(new RegExp('('+PLACE+')\\s+'+PLACE_KIND+'\\s+(?:of|in)\\s+(?:(?:northern|southern|eastern|western|central|northwestern|northeastern|southwestern|southeastern)\\s+)?('+COUNTRIES+')\\b','gu'))){
    remember(match[1]);remember(match[2]);
   }
   for(const match of sentence.matchAll(new RegExp('('+COUNTRIES+')[’\']s\\s+(?:(?:northern|southern|eastern|western|central)\\s+)?('+PLACE+')','gu'))){
    remember(match[2]);remember(match[1]);
   }
   for(const match of sentence.matchAll(new RegExp('(?:[Rr]egion|[Zz]one|[Dd]istrict|[Dd]epartment|[Pp]rovince|[Ss]tate|[Mm]unicipality|[Tt]own|[Vv]illage|[Cc]ommunity|[Vv]alley|[Mm]ountains?|[Hh]ighlands|[Hh]ills|[Ff]oothills|[Ss]lopes|[Pp]eaks)\\s+of\\s+('+PLACE+'(?:,\\s*'+PLACE+'){0,4})','gu')))
    for(const part of tupleParts(match[1]))remember(part);
   for(const match of sentence.matchAll(new RegExp('\\b(?:[Ii]n|[Ff]rom|[Ww]ithin|[Aa]round|[Nn]ear|to)\\s+(?:the\\s+)?('+PLACE+')\\s+'+PLACE_KIND+'\\b','gu')))
    if(!new RegExp('^(?:'+COUNTRIES+')[’\']s\\b','u').test(match[1]))remember(match[1]);
   // An explicit country in the same geographic sentence can complete its
   // named region. Ignore country words inside a differently named farm.
   const countries=unique([...countryNames(sentence),...[...sentence.matchAll(DEMONYM_RE)].map(match=>
    Object.entries(DEMONYMS).find(([word])=>word.toLowerCase()===match[1].toLowerCase())?.[1]).filter(Boolean)]);
   if(pieces.length&&countries.length===1&&!pieces.some(part=>key(part)===key(countries[0])))remember(countries[0]);
   if(pieces.length)for(const area of literalCoffeeSourcePlaces(sentence).filter(place=>/^(?:Sumatra|Bali|Timor|Kona|Hawaii)$/i.test(place)))remember(area);
   if(pieces.length)add(unique(pieces).join(', '),sentence);
  }
 }
 // Different localities in separate story sentences may describe different
 // farms. Only compatible refinements can supply one canonical location.
 if(!candidates.length)return [];
 let value=candidates[0].value;
 for(const candidate of candidates.slice(1)){
  const compatible=compatibleCoffeeOrigins(value,candidate.value);if(!compatible)return [];
  value=compatible;
 }
 return [{label:countryNames(value).length?'Origin':'Region',value,quote:candidates.map(item=>item.quote).join(' | ').slice(0,2200)}];
}
export function extractCoffeeIdentityEvidence(html,{name='',fields={},clean}={}){
 const facts=[],blocks=productCoffeeProse(html,clean).filter(block=>!block.educational);
 if(!name||!blocks.length)return {facts};
 const add=(label,value,quote)=>{if(value&&value.length<=220&&!facts.some(f=>f.label===label&&key(f.value)===key(value)))facts.push({label,value,quote});};
 if(!fields.release_label){
  // A numbered name is a release only when this selected page independently
  // identifies the prefix as a release series. Farm numbers, cultivar codes,
  // pack sizes and an undated marketing tier alone cannot supply a release.
  const numbered=name.match(/^(.{2,65}?)\s+(No\.?\s*\d{1,4}|Number\s+\d{1,4})\s*:\s*\S/i);
  if(numbered){
   const series=numbered[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const declaration=new RegExp('\\b(?:become|are|our)\\s+'+series+'\\s+releases?\\b','i');
   const quote=blocks.flatMap(block=>sentences(block.text)).find(sentence=>current(sentence)&&declaration.test(sentence));
   if(quote)add('Release',numbered[1]+' '+numbered[2],name+' | '+quote);
  }
 }
 for(const place of narrativeGeography(blocks)){
  // A prose fragment may name a neighboring town, a broader district or
  // just a mountain. It can refine an explicit caption only when its
  // complete named places are compatible. Different explicit countries
  // remain conflicts; do not treat a fragment as a competing full address.
  const existing=fields.origin,compatible=existing&&compatibleCoffeeOrigins(existing,place.value);
  const priorCountries=countryNames(existing||''),nextCountries=countryNames(place.value);
  const incompatibleCountry=priorCountries.length&&nextCountries.some(country=>!priorCountries.some(prior=>key(prior)===key(country)));
  if(compatible)add('Origin',compatible,place.quote);
  else if(!existing||incompatibleCountry||COUNTRY_ONLY.test(existing))add(place.label,place.value,place.quote);
 }
 const titleOrigin=extractCoffeeTitleOrigin(name);
 const titleMatches=titleOrigin?.label==='Country'?titleOrigin.value.split(', '):[];
 const titleCountries=titleMatches.length>1&&!/\bblend\b/i.test(name)?[]:titleMatches;
 // Country words in the exact selected name are explicit geography; do not
 // derive a region, producer, harvest, or product identity from URL slugs.
 if(titleCountries.length&&titleCountries.length<=4&&!countryNames(fields.origin||'').length)add('Country',titleCountries.join(', '),name);
 if(!fields.origin&&titleOrigin?.label==='Origin')add('Origin',titleOrigin.value,name);
 const originCandidates=[],processes=[],currentProcesses=[],varietyCandidates=[],compositionCandidates=[];
 const readVariety=!fields.variety||isGenericCoffeeVariety(fields.variety);
 const compactProcess=new RegExp('^('+PROCESS+')(?:\\s+process(?:ed|ing)?)?[.!]?$','i');
 const processAndVariety=new RegExp('^('+PROCESS+')\\s+(.{2,100})$','i');
 if(!fields.process&&!/\b(?:decaf|decaffeinated|barrel|whiskey|whisky)\b/i.test(name)){
  const titleProcess=name.match(new RegExp('\\b('+PROCESS+')\\s+process(?:ed|ing)?\\b','i'))||
   (titleCountries.length?name.match(new RegExp('^('+PROCESS+')\\s+(?:'+COUNTRIES+')\\b','i'))||
    name.match(new RegExp('\\b('+PROCESS+')(?:\\s+(?:AX|AA|AB|[1-5]))?\\s*$','i')):null);
  const varietyProcess=titleCountries.length?name.match(new RegExp('\\b'+VARIETIES+'\\s+('+PROCESS+')\\b','i'))||
   name.match(new RegExp('\\b('+PROCESS+')\\s*,\\s*(?:Vienna|Espresso|American|Light|Medium|Dark)\\b','i')):null;
  if(varietyProcess)processes.push({value:processValue(varietyProcess[1]),quote:name});
  if(titleProcess)processes.push({value:processValue(titleProcess[1]),quote:name});
 }
 for(const block of blocks){
  if(block.tag==='h1')continue;
  const value=block.text;
  // A compact heading can place a producer and geography on separate BR
  // lines. Do not flatten "NEGUESSE DEBELA<br>GEDEB, ETHIOPIA" into one
  // fabricated place name and then conflict with the visible origin.
  const compactLines=block.html.split(/<br\b[^<>]{0,2000}>/gi);
  for(const compact of compactLines.length<=40?compactLines.map(line=>clean(line,6001)):[]){
  if(compact.length<=160&&current(compact)){
   const countryFirst=compact.match(new RegExp('^('+COUNTRIES+')\\s+[-–—]\\s+([\\p{L}\\p{M} .,’’\'()-]{2,120})$','iu'));
   if(countryFirst&&!( /^h[1-6]$/.test(block.tag)&&key(compact)===key(name))&&
      !/\b(?:coffee|roast|process|blend|washed|natural|honey|anaerobic|decaf|finca|hacienda|farm|estate)\b/i.test(countryFirst[2]))originCandidates.push({value:countryFirst[2]+', '+countryFirst[1],quote:compact});
   const exact=compactProcess.exec(compact);
   if(exact)processes.push({value:processValue(exact[1]),quote:compact});
   // A grade shorthand is useful only when the exact current product name
   // independently repeats that process immediately before its roast label.
   const grade=compact.match(/^[-•]?\s*(?:(?:lovely|fresh|delicious)\s+)?(natural|washed)\s+grade\s+[1-5]\s+[\p{L}\p{M}'’ -]{2,80}[.!]?$/iu);
   if(grade&&titleCountries.length&&new RegExp('\\b'+grade[1]+'\\s+(?:light|medium|dark)(?:[ -]+(?:medium|dark))?\\s+roast\\b','i').test(name))
    currentProcesses.push({value:processValue(grade[1]),quote:name+' | '+compact});
   const combined=processAndVariety.exec(compact);
   if(combined&&completeVarietyPhrase(combined[2])){
    processes.push({value:processValue(combined[1]),quote:compact});
    varietyCandidates.push({value:combined[2],quote:compact});
   }
   const variety=completeVarietyPhrase(compact);
   if(variety&&!/\b(?:variet(?:y|ies)|cultivars?)\b/i.test(block.section||''))varietyCandidates.push({value:variety,quote:compact});
   // A discrete geographic line must end in an explicit country. Avoid
   // supplier/roaster addresses, marketing sentences, and product cards.
   if(/^[\p{Lu}][\p{L}\p{M} .’'&/()-]{1,120},\s*[\p{L} ]+$/u.test(compact)&&
      COUNTRY_ONLY.test(compact.split(',').at(-1).trim())&&!/^(?:origin|country|region|location|geography|department|province|state|district|municipality|subregion|city|village)\s*(?:[:|=]|[-–/]{1,3})/i.test(compact)&&! /^(?:Finca|Hacienda|Farm|Estate)\b/i.test(compact)&&
      !/\b(?:coffee|roasters?|street|avenue|road|suite|shipping|delivery)\b/i.test(compact)){
    const countries=countryNames(compact);
    if(!titleCountries.length||countries.every(c=>titleCountries.some(t=>key(t)===key(c))))originCandidates.push({value:compact,quote:compact});
   }
  }
  }
  for(const sentence of sentences(value)){
   for(const claim of directOriginClaims(sentence)){
    if(claim.country)add('Country',claim.value,claim.quote);
    else originCandidates.push(claim);
   }
   let processSentence=sentence;
   if(!fields.process&&sentence.length<=1400){
    // This expressly retires one lot and announces the other. Isolate only
    // the affirmative current clause; ordinary negations remain untouched.
    const replacement=sentence.match(/^\s*(?:while|although)\s+(?:the|our)\s+(?:washed|natural|honey|anaerobic)\s+lot\s+(?:is\s+(?:RIP|sold\s+out|gone)|has\s+sold\s+out)\s*[,;]\s*((?:the|our|this)\s+(washed|natural|honey|anaerobic)\s+lot\s+(?:has\s+)?(?:just\s+(?:landed|arrived)|is\s+now\s+available)\b[^.!?]*)[.!?]?$/i);
    if(replacement&&current(replacement[1])){
     processSentence=replacement[1];
     currentProcesses.push({value:processValue(replacement[2]),quote:sentence});
    }
    // Washing whole cherries does not make a natural coffee washed. Require
    // depulping, then washing, then drying in this one affirmative sequence.
    // "is no exception:" is an affirmative introduction, scoped only here.
    const affirmative=sentence.replace(/\bis no exception\s*:/i,'is described:');
    if(current(affirmative)&&/\b(?:ripe\s+)?(?:coffee\s+)?(?:cherries|beans)\s+(?:are|were)\s+(?:de-?pulped|pulped)\b[^.!?]{0,260}\bwashed\b[^.!?]{0,160}\bdried\b/i.test(sentence))
     currentProcesses.push({value:'Washed',quote:sentence});
   }
   if(sentence.length>1400||!current(sentence))continue;
   if(!fields.process){
    processSentence=withoutNaturalDecaffeinationModifier(processSentence);
    // Read explicit current-product process phrases, not a bare adjective
    // such as "natural sweetness", "honey notes" or decaf marketing.
    const patterns=[
     new RegExp('\\b('+PROCESS+')[ -]+(?:processed|process|processing|coffees?|beans?|lot|selection)\\b','gi'),
     new RegExp('\\b('+PROCESS+')[ -]+(?:processed\\s+)?'+VARIETIES+'\\b','gi'),
     new RegExp('\\b('+PROCESS+')\\s+(?:'+Object.keys(DEMONYMS).join('|')+'|'+COUNTRIES+')(?:\\s+(?:coffee|beans?|offering))?\\b','gi'),
     new RegExp('\\b(?:processed|processing)\\s+(?:by|with|using)\\s+(?:the\\s+)?('+PROCESS+')\\s+method\\b','gi'),
     new RegExp('\\b(?:processing method|process)\\b.{0,80}\\b(?:known as|called)\\s*[“"\']?('+PROCESS+')\\b','gi'),
     /\b(naturally)\s+processed\b/gi,
     new RegExp('\\b(?:this|these|the|our)\\s+(?:coffees?|lots?|beans?)\\s+(?:are|is|was|were|has been|have been)\\s+('+PROCESS+')\\b','gi'),
     new RegExp('\\b(?:current lot|origin|country)\\s*:\\s*(?:[^.!?]{0,65}\\s+)?('+PROCESS+')(?=\\s|[,.)]|$)','gi'),
     /\b(?:fermented|fermentation)\s+(anaerobically)\b/gi
    ];
    for(const pattern of patterns)for(const match of processSentence.matchAll(pattern))
     processes.push({value:processValue(match[1]),quote:sentence});
    // A direct current-method assertion outranks historical farm methods.
    // Several different current assertions still remain a contradiction.
    if(!/\b(?:in|during|until|before|after)\s+(?:19|20)\d{2}\b/i.test(processSentence)){
     const direct=processSentence.match(new RegExp('\\b(?:this|these|our|the current)\\s+(?:coffee|lot|beans?|cherries)\\s+(?:are|is|was|were|has been|have been)\\s+('+PROCESS+')\\b','i'))||
      (/\b(?:coffee|beans?|cherries)\b/i.test(processSentence)&&processSentence.match(new RegExp('\\b(?:for|using)\\s+(?:this|the current)\\s+('+PROCESS+')\\s+process\\b','i')));
     if(direct)currentProcesses.push({value:processValue(direct[1]),quote:sentence});
    }
    if(/\b(?:coffee|beans?|cherries)\b/i.test(processSentence)&&/\bwashed\s+and\s+(?:then\s+)?dried\b/i.test(processSentence))
     processes.push({value:'Washed',quote:sentence});
    if(/\bferment(?:ed|ation|ing)\b/i.test(processSentence)&&/\b(?:without|no)\s+oxygen\b/i.test(processSentence)&&
       /\b(?:cherries|coffee|beans?|tanks?|sealed)\b/i.test(processSentence))processes.push({value:'Anaerobic',quote:sentence});
   }
   const farmVarietyRange=/\b(?:farm|estate|producer)\b.{0,65}\b(?:grows?|produces?|cultivates?)\s+(?:an?\s+)?(?:assortment|range|selection|variety)\s+of\b/i.test(sentence)||
    /\b(?:also|in addition(?:al)? to)\b.{0,180}\b(?:grows?|produces?|cultivates?)\b/i.test(sentence);
   if(readVariety&&!farmVarietyRange){
    for(const match of sentence.matchAll(/\bvariet(?:y|ies|al|als)\s*\(([^)]{2,180})\)/gi))
     if(completeVarietyPhrase(match[1]))varietyCandidates.push({value:match[1],quote:sentence});
    for(const match of sentence.matchAll(new RegExp('('+EXPLICIT_VARIETIES+'(?:\\s*(?:,\\s*(?:and\\s+)?|&|and|/)\\s*'+EXPLICIT_VARIETIES+')*)\\s+(?:variet(?:y|ies|al|als)|cultivars?|cherries)\\b','giu'))){
     // "Colombia varietal \"Chiroso\"" uses the country as a qualifier
     // before the explicitly quoted cultivar. It is not a second cultivar.
     if(COUNTRY_ONLY.test(match[1])&&/^\s*[“"']/.test(sentence.slice(match.index+match[0].length)))continue;
     varietyCandidates.push({value:match[1],quote:sentence});
    }
    for(const match of sentence.matchAll(new RegExp('\\b(?:variet(?:y|al)|cultivar)\\s+[“"\']('+VARIETIES+')[”"\']','giu')))
     varietyCandidates.push({value:match[1],quote:sentence});
    for(const match of sentence.matchAll(new RegExp('\\b'+PROCESS+'[ -]+processed\\s+('+VARIETIES+')(?![\\p{L}\\d])','giu')))
     varietyCandidates.push({value:match[1],quote:sentence});
    const purity=sentence.match(new RegExp('\\b(?:this|the|our)\\s+(?:lot|coffee)\\s+(?:is|uses|contains)\\s+(?:100\\s*%\\s*)?('+EXPLICIT_VARIETIES+'(?:\\s*(?:,\\s*(?:and\\s+)?|&|and|/)\\s*'+EXPLICIT_VARIETIES+')*)(?=\\s|[,.!]|$)','iu'));
    const purityTail=purity?sentence.slice(purity.index+purity[0].length):'';
    const explanatoryApposition=/^\s*,\s*(?:one\s+of\b|which\s+(?:is|has|grows|produces)\b)/i.test(purityTail);
    if(purity&&(!/^\s*(?:,|&|and\b|or\b)/i.test(purityTail)||explanatoryApposition)&&
       (!COUNTRY_ONLY.test(purity[1])||/^\s+(?:variet(?:y|ies|al|als)|cultivars?)\b/i.test(purityTail)))
     varietyCandidates.push({value:purity[1],quote:sentence});
    const named=sentence.match(new RegExp('\\b(?:this|our)\\s+(?:is\\s+)?(?:a\\s+)?(?:fairly\\s+)?(?:rare\\s+)?variety\\s+(?:called|named)\\s+('+VARIETIES+')(?=\\s|[,.!]|$)','iu'));
    if(named)varietyCandidates.push({value:named[1],quote:sentence});
    const percentage=sentence.match(new RegExp('\\b(100\\s*%\\s*'+VARIETIES+')\\s*\\(\\s*an?\\s+(?:heirloom|native|indigenous)\\s+variety\\b','iu'));
    if(percentage)varietyCandidates.push({value:percentage[1],quote:sentence});
   }
   if(!farmVarietyRange){
    const composition=sentence.match(/\b(?:this|our)\s+(?:crop|lot|coffee)\b[^.!?]{0,80}\b(?:features|comprises|consists of)\s+([^.!?]{2,180})[.!]?$/i);
    if(composition&&completeVarietyPhrase(composition[1],{explicit:true}))compositionCandidates.push({value:composition[1].trim(),quote:sentence});
    const dominant=sentence.match(/^(.{2,100}?)\s+dominate\s+the\s+variety\s+mix,\s+with\s+(?:minor\s+)?inputs\s+from\s+(.{2,100}?)[.!]?$/i);
    if(dominant&&completeVarietyPhrase(dominant[1],{explicit:true})&&completeVarietyPhrase(dominant[2],{explicit:true}))
     compositionCandidates.push({value:dominant[1]+', '+dominant[2],quote:sentence});
   }
   if(!fields.origin){
    const broad=sentence.match(/\b((?:Central|South|North|Latin)(?:\s*(?:and|&|\/)\s*(?:Central|South|North|Latin))?)\s*[- ]America(?:n)?s?(?:\s+(?:and|&)\s+(?:African|Indonesian))?\s+(?:coffee|coffees|beans?|Arabica|blend)\b/i)||
     sentence.match(/\b(?:beans?|coffee|coffees|blend)\b[^.!?]{0,90}\b(?:from|of)\s+((?:Central|South|North|Latin)(?:\s*(?:and|&|\/)\s*(?:Central|South|North|Latin))?)\s+Americas?\b/i);
    if(broad){
     const regions=unique(broad[1].split(/\s*(?:and|&|\/)\s*/i).map(word=>word[0].toUpperCase()+word.slice(1).toLowerCase()+' America'));
     originCandidates.push({value:regions.join(', '),quote:sentence,broad:true});
    }
    const list=sentence.match(/\b(?:blend|coffee|beans?)\b.{0,80}\b(?:multiple origins?|origins?|from|contains?|includes?|of)\b\s*[:–—-]?\s*(.{5,220})/i);
    if(list){
     const countries=countryNames(list[1]);
     if(countries.length>1&&countries.length<=8&&/\bblend\b/i.test(sentence))originCandidates.push({value:countries.join(', '),quote:sentence,multiple:true});
    }
   }
   // Attribute geography only when the sentence talks about sourcing or
   // growing this coffee. Historical visits and importer addresses are not.
   if(/\b(?:coffee|lot|beans?|cherries|grown|growing|cultivated|sourced|produced|farm|estate|cooperative|station)\b/i.test(sentence)&&
      !(/\b(?:roasted|roasting|packaged|packed|manufactured|ships?|shipping)\b/i.test(sentence)&&! /\b(?:grown|growing|cultivated|sourced|farm|estate|cooperative|station)\b/i.test(sentence))){
    const countries=countryNames(sentence);
    if(countries.length===1&&!titleCountries.length&&
       /\b(?:from|in|grown|sourced|origin|produced|cultivated)\b/i.test(sentence))originCandidates.push({value:countries[0],quote:sentence,country:true});
    if(!titleCountries.length)for(const match of sentence.matchAll(DEMONYM_RE)){
     const country=Object.entries(DEMONYMS).find(([word])=>word.toLowerCase()===match[1].toLowerCase())?.[1];
     if(country)originCandidates.push({value:country,quote:sentence,country:true});
    }
   }
   if(!fields.release_label){
    // A farm's future expansion target does not date the selected coffee.
    // Keep an explicitly offered future harvest; exclude only a production
    // plan whose year belongs to growing or increasing that future crop.
    const productionPlan=/\b(?:plan(?:s|ned|ning)?|aim(?:s|ing)?|work(?:s|ing)?|hop(?:e|es|ing)|intend(?:s|ing)?|target(?:s|ing)?)\b.{0,100}\b(?:double|triple|increase|expand|begin|start|plant|grow|produce)\b.{0,180}\b(?:harvest|crop)\b/i.test(sentence);
    const harvest=!productionPlan&&(sentence.match(/\b((?:20\d{2})(?:\s*[-–—/]\s*(?:20)?\d{2})?)\s+(?:harvest|crop)\b/i)||
     sentence.match(/\b(?:harvest|crop)(?:\s+(?:year|season))?\s*(?:of|for|:|was|is)?\s*((?:20\d{2})(?:\s*[-–—/]\s*(?:20)?\d{2})?)\b/i));
    if(harvest)add('Harvest',harvest[1],sentence);
    const datedOffering=sentence.match(/\b(?:our|this)\s+(?:(?:first|last|new|current|rotating|washed|natural|honey|anaerobic|single)\s+){0,5}(?:selection|offering|release|single origin)\b[^.!?]{0,65}\b(?:of|for)\s+(20\d{2})\b/i)||
     sentence.match(/\bbring\s+you\s+(?:the\s+)?(20\d{2})\s+lot\b/i)||
     sentence.match(/\bexpect\s+from\s+this\s+coffee\s+in\s+(20\d{2}(?:\s*[-–—/]\s*(?:20)?\d{2})?)\b/i);
    if(datedOffering)add('Release',datedOffering[1],sentence);
    const seasonalProgram=sentence.match(/\b(?:cornerstone|part)\s+of\s+our\s+(20\d{2})\s+(spring|summer|autumn|fall|winter)\s+coffee\s+program\b/i);
    if(seasonalProgram)add('Release',seasonalProgram[2][0].toUpperCase()+seasonalProgram[2].slice(1).toLowerCase()+' '+seasonalProgram[1],sentence);
    const lot=sentence.match(/\bLot\s*#\s*([A-Z0-9][A-Z0-9/-]{0,25})\b/i);
    if(lot)add('Lot','Lot #'+lot[1],sentence);
   }
  }
 }
 // Only a unique fallback claim may fill a missing value. Different source
 // methods in a described blend remain Other/Unknown; unrelated sentences
 // cannot silently choose the first cultivar or country encountered.
 const selectedProcesses=currentProcesses.length?currentProcesses:processes;
 const p=unique(selectedProcesses.map(x=>x.value).filter(Boolean));
 if(!fields.process&&p.length===1)add('Process',p[0],selectedProcesses.find(x=>x.value===p[0]).quote);
 else if(!fields.process&&p.length>1&&/\bblend\b/i.test(name+' '+blocks.map(b=>b.text).join(' ')))add('Process','Other/Unknown',selectedProcesses.map(x=>x.quote).join(' | ').slice(0,1800));
 else if(!fields.process&&p.length>1&&currentProcesses.length){
  // These are contradictory direct claims about the current lot, not a
  // farm's range of historical methods. Pass both to the conflict tracker
  // so a later nearby-text fallback cannot silently choose the first one.
  for(const method of p)add('Process',method,selectedProcesses.find(item=>item.value===method).quote);
 }
 const namedCandidates=varietyCandidates.filter(item=>!isGenericCoffeeVariety(item.value));
 const selectedVarieties=namedCandidates.length?namedCandidates:varietyCandidates;
 const varieties=unique(selectedVarieties.map(x=>x.value));
 const compositions=unique(compositionCandidates.map(x=>x.value));
 if(compositions.length===1)
  facts.push({label:'Variety',value:compositions[0],quote:compositionCandidates[0].quote,explicit_current_composition:true});
 else if(readVariety&&varieties.length===1)add('Variety',varieties[0],selectedVarieties[0].quote);
 if(!fields.variety&&!varieties.length&&!/\b(?:barrel|whiskey|whisky|vanilla|street|flavou?red)\b/i.test(name)){
  const titleVarieties=unique([...name.matchAll(VARIETY_RE)].map(match=>match[1]).filter(value=>key(value)!=='sanisidro'));
  const leadingLot=fields.process&&new RegExp('^'+VARIETIES+'(?:\\s+[-–—|:]\\s+|\\s+The\\s+)','iu').test(name);
  if(titleVarieties.length===1&&(titleCountries.length||/\b(?:process|washed|natural|honey|microlot|micro-lot|cultivar|varietal|variety)\b/i.test(name)||completeVarietyPhrase(name)||leadingLot))
   add('Variety',titleVarieties[0],name);
 }
 const full=originCandidates.filter(item=>!item.country&&!item.broad&&!item.multiple),countries=originCandidates.filter(item=>item.country);
 const broad=unique(originCandidates.filter(item=>item.broad||item.multiple).map(item=>item.value));
 if(!fields.origin&&broad.length===1)add('Origin',broad[0],originCandidates.find(item=>item.value===broad[0]).quote);
 const places=unique(full.map(item=>item.value));
 if(places.length===1)add('Origin',places[0],full[0].quote);
 else if(!titleCountries.length){
  const uniqueCountries=unique(countries.map(item=>item.value));
  if(!fields.origin&&uniqueCountries.length===1)add('Country',uniqueCountries[0],countries[0].quote);
  else if(fields.origin&&!countryNames(fields.origin).length&&uniqueCountries.length===1){
   const escaped=fields.origin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const country=uniqueCountries[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const joined=new RegExp('\\b'+escaped+'\\s*,\\s*(?:(?:one of|a region (?:of|in)|located in|in)\\s+)?'+country+"(?=\\b|['’])",'iu');
   const corroboration=countries.find(item=>joined.test(item.quote));
   if(corroboration)add('Country',uniqueCountries[0],corroboration.quote);
  }
 }
 return {facts};
}
