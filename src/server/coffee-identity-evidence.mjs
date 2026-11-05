import {selectedCountryFirstTitleRegion,selectedCountryProducerRegion} from './coffee-title-region-evidence.mjs';
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes,productMarkup} from './coffee-product-scope.mjs';
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
 if(includeCurrentLocality)for(const place of narrativeGeography(blocks.filter(block=>!block.educational),{currentLocalityOnly:true,name})){
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
function narrativeGeography(blocks,{currentLocalityOnly=false,name=''}={}){
 const candidates=[];

 // Only connect a named village delivery to an explicitly CURRENT lot's
 // named station on this same selected product. This is not a country lookup.
 const currentLotStations=[];
 const selectedCountries=countryNames(name);
 if(selectedCountries.length===1)for(const block of blocks){
  if(/^h[1-6]$/.test(block.tag)||block.educational||
   /\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||''))continue;
  for(const line of sentences(block.text)){
   const match=line.match(new RegExp(
    '\\b(?:our|this|the)\\s+(?:latest|current|selected)\\s+(?:[\\p{L}]+\\s+){0,4}(?:lot|coffee|beans?)\\s+from\\s+(?:the\\s+)?(?:renowned\\s+)?('+PLACE+')\\s+(?:washing\\s+station|wet\\s+mill)\\s+in\\s+('+PLACE+')\\s*,\\s*('+COUNTRIES+')\\b','iu'));
   if(match&&current(line)&&key(match[3])===key(selectedCountries[0])&&
    !/\b(?:previously|historically|formerly|no longer|other coffee|another coffee)\b/iu.test(line)){
    const identity=key(match[1])+'|'+key(match[2])+'|'+key(match[3]);
    if(!currentLotStations.some(item=>item.identity===identity))
     currentLotStations.push({identity,station:match[1],region:match[2],country:match[3]});
   }
  }
 }

 const add=(value,quote)=>{
  value=value.replace(/\s+/g,' ').replace(/[,; ]+$/,'').trim();
  if(value.length<3||value.length>220||/^(?:The|This|Our|A|An|It)\b|\b(?:Finca|Hacienda|Farm|Estate|Cooperative|Coop|Producer|Coffee|Process|Washed|Natural|Honey|Gesha|Geisha|Bourbon|Roast|Blend|Agriculture|Commerce|Certification)\b/u.test(value))return;
  if(!candidates.some(item=>key(item.value)===key(value)))candidates.push({value,quote});
 };
 for(const block of blocks){
  if(/^h[1-6]$/.test(block.tag))continue;
  for(let sentence of sentences(block.text)){

    // Bind named majority-village origins to the SAME current lot's station,
    // cited again in the delivery paragraph. Never borrow a landmark, menu,
    // other product, historic lot or unqualified farm generalization.
    if(currentLotStations.length===1&&
       !/\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||'')){
     const villages=sentence.match(new RegExp(
      '\\bmajority\\s+of\\s+(?:the|this)\\s+coffee\\s+(?:arrives|comes|is\\s+delivered)\\s+(?:[\\p{L}-]+\\s+){0,4}from\\s+(?:the\\s+)?nearby\\s+villages?\\s+of\\s+('+PLACE_WORD+')\\s+and\\s+('+PLACE_WORD+')(?=\\s*[,.;!?]|$)','iu'));
     // Scan complete sentences, not the whole p: preceding geography must
     // not be swallowed into a multiword station name across punctuation.
     const station=sentences(block.text).map(part=>part.match(new RegExp(
      '^(?:The|Our)\\s+('+PLACE+')\\s+(?:washing\\s+station|wet\\s+mill)\\s+is\\s+(?:committed|dedicated|responsible)\\b','iu'))).find(Boolean);
     const selected=currentLotStations[0];
     if(villages&&station&&current(sentence)&&key(station[1])===key(selected.station)&&
        countryNames(sentence).every(country=>key(country)===key(selected.country))&&
        !/\b(?:historical|previous|former|other|another|no longer|formerly|used to)\b/iu.test(sentence)){
      add(villages[1]+' and '+villages[2]+', '+selected.region+', '+selected.country,sentence);
      continue;
     }
    }
   // An exact selected H1's named growing region is not the producer.
   // This negation concerns the producer role, NOT current geography.
   const selectedAdministrativeRegion=sentence.match(new RegExp(
    '^('+PLACE+')\\s+is\\s+the\\s+region\\s+in\\s+('+PLACE+')\\s+state,?\\s+not\\s+the\\s+producer[.!?]?$','iu'));
   const selectedAdministrativeCountries=countryNames(name);
   if(selectedAdministrativeRegion&&selectedAdministrativeCountries.length===1&&
      selectedAdministrativeRegion[1].length>=5&&selectedAdministrativeRegion[1].length<=85&&
      selectedAdministrativeRegion[2].length>=4&&selectedAdministrativeRegion[2].length<=65&&
      key(name).includes(key(selectedAdministrativeRegion[1]))&&
      !COUNTRY_ONLY.test(selectedAdministrativeRegion[1])&&
      !COUNTRY_ONLY.test(selectedAdministrativeRegion[2])&&
      !completeVarietyPhrase(selectedAdministrativeRegion[1],{explicit:true})&&
      !completeVarietyPhrase(selectedAdministrativeRegion[2],{explicit:true})&&
      !/\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||'')&&
      current(sentence.replace(/,?\s+not\s+the\s+producer[.!?]?$/iu,''))){
    add(selectedAdministrativeRegion[1]+', '+selectedAdministrativeRegion[2]+', '+
        selectedAdministrativeCountries[0],sentence);
    continue;
   }
    const growingMunicipality=sentence.match(new RegExp(
     '^This\\s+group\\s+of\\s+(?:smallholders|growers|farmers)\\s+(?:lives|farms)\\s+in\\s+and\\s+around\\s+the\\s+(?:small\\s+)?municipality\\s+of\\s+('+PLACE+')\\s+in\\s+('+PLACE+')\\s*,\\s+where\\b[^.!?]{0,650}\\bfarms?\\b','iu'));
    const growerWhere=sentence.indexOf(', where');
    // Evaluate a direct current grower-locality statement independently
    // from its later educational comparison/typical farm-elevation clause.
    // Keep every other noncurrent-lot safeguard intact.
    const currentGrowerClause=Boolean(growingMunicipality&&growerWhere>0&&
     countryNames(name).length===1&&key(name).includes(key(growingMunicipality[1]))&&
     current(sentence.slice(0,growerWhere))&&
     !/\b(?:used to|previous|former|original|historical|no longer|now moved|abandoned)\b/i.test(sentence.slice(growerWhere))&&
     !/\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||''));

   // Some selected product descriptions use the exact coffee name + whole
   // regional blend claim without the literal word "coffee". Admit only
   // that bounded direct source pattern to the normal geographic review.
   const namedWholeBlend=Boolean(name&&key(sentence.slice(0,name.length))===key(name)&&
    /^\s+is\s+a\s+100\s*(?:percent|%)\s+[\p{Lu}][\p{L}\p{M}'’ .-]{2,100}\s+blend\b[^.!?]{0,200}\bthis\s+region\b/iu.test(sentence.slice(name.length)));
   if(sentence.length>1800||(!current(sentence)&&!currentGrowerClause)||(! /\b(?:coffee|coffees|beans?|cherries|grow(?:n|ing|s)?|cultivat|sourc|farm|finca|hacienda|estate|cooperative|station|mill|producer)\w*\b/i.test(sentence)&&!namedWholeBlend)||
      /\b(?:born|birth|visited|travel(?:ed|led|ing)?|moved from|border with|border of|roasted in|roasting in|ships? from|certified|certification|decaffeination plant|sent a container|in those days|previously|originally collected)\b/i.test(sentence)||
      /\bwater\b.{0,65}\b(?:sourced|comes?|drawn)\s+from\b/i.test(sentence)||
      /\b(?:variety|cultivar)\b.{0,65}\b(?:grown|collected|introduced|originated|discovered)\b/i.test(sentence))continue;
   // A founder's first station is biography, not the selected lot's origin.
   if(/\b(?:first(?: ever)?|former|previous|original|initial)\s+(?:(?:coffee|wet)\s+)?washing\s+station\b/iu.test(sentence)&&
      !/\b(?:this|our|the current)\s+(?:coffee|lot|offering)\s+(?:comes?\s+from|(?:is|are)\s+(?:grown|sourced|processed)\s+(?:in|at|from))\b/iu.test(sentence))continue;
   // A selected producer's PRESENT farms may name a UNESCO biosphere.
   // Only bind it to Origin when that producer appears in the exact H1
   // and the H1 prints one country. Never infer a country from the forest,
   // roaster address, a former farmer or an unrelated product.
   const selectedFarmsBiosphere=sentence.match(new RegExp(
    String.raw`^(${PLACE_WORD}[’']s)\s+farms?\s+are\s+in\s+the\s+buffer\s+and\s+core\s+zones\s+of\s+the\s+UNESCO\s+(${PLACE})\s+biosphere\b`,'iu'));
   const selectedFarmCountry=countryNames(name);
   if(selectedFarmsBiosphere&&selectedFarmCountry.length===1&&
      key(name).includes(key(selectedFarmsBiosphere[1]))&&
      selectedFarmsBiosphere[2].length>=5&&selectedFarmsBiosphere[2].length<=85&&
      !COUNTRY_ONLY.test(selectedFarmsBiosphere[2])&&
      !completeVarietyPhrase(selectedFarmsBiosphere[2],{explicit:true})&&
      countryNames(sentence).every(country=>key(country)===key(selectedFarmCountry[0]))&&
      !/\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||'')&&
      !/\b(?:previously|formerly|historical|abandoned|no longer|moved|other coffee|another coffee)\b/i.test(sentence)){
    add(selectedFarmsBiosphere[2]+', '+selectedFarmCountry[0],sentence);
    continue;
   }
   // Directly printed selected station: require station in H1 and same-sentence country.
   const selectedStation=sentence.match(new RegExp(
    '^('+PLACE+')\\s+(?:washing\\s+station|wet\\s+mill)\\s+is\\s+(?:located|situated)\\s+in\\s+(?:the\\s+)?('+PLACE+')\\s+(?:of|in)\\s+('+COUNTRIES+')[.!?]?$','iu'));
   if(selectedStation&&selectedStation[1].length>=4&&key(name).includes(key(selectedStation[1]))&&
      selectedStation[2].length>=4&&selectedStation[2].length<=65&&
      !COUNTRY_ONLY.test(selectedStation[2])&&
      !/^(?:region|district|zone|village|municipality|state|province|department|country)$/iu.test(selectedStation[2])&&
      !completeVarietyPhrase(selectedStation[2],{explicit:true})){
    add(selectedStation[2]+', '+selectedStation[3],sentence);
    continue;
   }
   // Bind printed village and district to this exact selected station/H1.
   // Never infer a location from a reused URL, an older lot or a gazetteer.
   const stationCountry=countryNames(name);
   if(stationCountry.length===1&&countryNames(sentence).every(value=>key(value)===key(stationCountry[0]))){
    const district=sentence.match(new RegExp(
     '^(?:This|Our)\\s+coffee\\s+comes\\s+from\\s+(?:the\\s+)?('+PLACE+')\\s+washing\\s+station,\\s+which\\s+is\\s+in\\s+the\\s+(?:kebele,\\s+or\\s+)?village,?\\s+of\\s+('+PLACE+'),\\s+(?:in\\s+the\\s+(?:[A-Za-z]{3,12},\\s+or\\s+)?district,?\\s+of\\s+|district\\s+)('+PLACE+'),\\s+(?:in\\s+the\\s+)?('+PLACE+')(?:\\s+region)?[.!?]?$','iu'));
    const village=sentence.match(new RegExp(
     '^From\\s+the\\s+('+PLACE+')\\s+Washing\\s+Station,\\s+which\\s+serves\\s+(?:the\\s+)?(?:nearly\\s+)?\\d{1,5}\\s+(?:small\\s+)?farmers\\s+in\\s+the\\s+village\\s+of\\s+('+PLACE+')\\s+in\\s+('+PLACE+'),\\s+comes\\s+this\\b','iu'));
    const station=(district?.[1]||village?.[1]||'').trim();
    const localities=(district?district.slice(2):village?.slice(2)||[])
     .map(value=>value.replace(/\s+region[.!?]*$/iu,'').replace(/[.!?]+$/u,'').trim());
    if(station.length>=4&&key(name).includes(key(station))&&localities.length>=2&&
       localities.every(value=>value.length>=3&&value.length<=65&&
        !completeVarietyPhrase(value,{explicit:true})&&
        !/\b(?:coffee|roast|blend|tasting|chocolate|caramel|cocoa|flavou?r|spice|pumpkin|vanilla|product)\b/iu.test(value))){
     add([...localities,stationCountry[0]].join(', '),sentence);
     continue;
    }
   }
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
   // The EXACT selected coffee's current description can state a named town
   // and district after its explicitly printed country: "Guatemala coffee
   // from Joyabaj, Quiché". No country/region lookup and no page SEO guessing.
   // Require the same country in the selected H1 so a rotated description or
   // related coffee cannot donate a more specific origin.
   const selectedCountries=countryNames(name);
   const directlySelected=!/\b(?:related|recommended|you may also like|other coffees?|other roasts?|catalog)\b/iu.test(block.section||'');
   if(directlySelected&&selectedCountries.length===1){

    // Grower-association locality is allowed only when the selected H1
    // names the same municipality and a single current sentence says farms
    // are there. No headquarters, past lots, SEO, or country lookup.
    if(currentGrowerClause&&growingMunicipality&&key(name).includes(key(growingMunicipality[1]))&&
       growingMunicipality[1].length>=4&&growingMunicipality[1].length<=70&&
       growingMunicipality[2].length>=4&&growingMunicipality[2].length<=70&&
       !COUNTRY_ONLY.test(growingMunicipality[1])&&!COUNTRY_ONLY.test(growingMunicipality[2])&&
       !completeVarietyPhrase(growingMunicipality[1],{explicit:true})&&
       !completeVarietyPhrase(growingMunicipality[2],{explicit:true})&&
       !/\b(?:coffee|roast|blend|tasting|chocolate|caramel|cocoa|flavou?r|spice|pumpkin|vanilla|product)\b/iu.test(growingMunicipality[1]+' '+growingMunicipality[2])&&
       countryNames(sentence).every(value=>key(value)===key(selectedCountries[0]))){
     add(growingMunicipality[1]+', '+growingMunicipality[2]+', '+selectedCountries[0],sentence);
     continue;
    }

    // Only a selected country-first product with the SAME printed country
    // twice can refine "Location: Country" using its current growing region.
    // No SEO, roaster-specific dictionary, gazetteer or historical inference.
    const exactGrowingRegion=sentence.match(new RegExp(
     '^('+COUNTRIES+')\\s+comes\\s+to\\s+us\\s+from\\s+(?:(?:central|northern|southern|eastern|western)\\s+)?\\1\\s*,\\s*the\\s+('+PLACE+')\\s+region\\s+and\\s+is\\s+(?:produced|grown|cultivated)\\s+(?:in|by)\\b','iu'));
    if(exactGrowingRegion&&key(exactGrowingRegion[1])===key(selectedCountries[0])&&
       key(name).startsWith(key(exactGrowingRegion[1]))&&
       exactGrowingRegion[2].length>=4&&exactGrowingRegion[2].length<=65&&
       !COUNTRY_ONLY.test(exactGrowingRegion[2])&&
       !completeVarietyPhrase(exactGrowingRegion[2],{explicit:true})&&
       !/\b(?:coffee|roast|blend|tasting|chocolate|caramel|cocoa|flavou?r|spice|pumpkin|vanilla|product)\b/iu.test(exactGrowingRegion[2])){
     add(exactGrowingRegion[2]+', '+exactGrowingRegion[1],sentence);
     continue;
    }

    // The selected coffee's OWN current sentence can name its growing
    // region before its exact H1: "Grown in the famed Cerrado region,
    // Brazil Oberon is ...". The country must be literally printed at
    // the start of that same selected H1, not inferred from a gazetteer,
    // slug, unrelated product or a free-floating site-wide region.
    const selectedNamePattern=Array.from(name).map(char=>
     '\\^$.*+?()[]{}|'.includes(char)?'\\'+char:char).join('');
    const selectedRegion=sentence.match(new RegExp(
     '^Grown\\s+in\\s+the\\s+(?:(?:famed|renowned)\\s+)?('+PLACE+')\\s+region\\s*,\\s*'+
      selectedNamePattern+'\\s+is\\b','iu'));
    if(selectedRegion&&new RegExp('^'+selectedCountries[0]+'\\s','iu').test(name)&&
       !/\b(?:coffees?|blends?|roasts?|products?|catalog|related|previous|other)\b/iu.test(selectedRegion[1])){
     add(selectedRegion[1]+', '+selectedCountries[0],sentence);
     continue;
    }
    // The exact selected coffee may directly name its whole-blend growing
    // region without a separate Region: spec. Require literal selected name,
    // country, quantitative blend and same-sentence region reference.
    const namedRegionBlend=sentence.match(new RegExp(
     '^'+selectedNamePattern+'\\s+is\\s+a\\s+100\\s*(?:percent|%)\\s+('+PLACE+')\\s+blend\\b[^.!?]{0,200}\\bthis\\s+region\\b','iu'));
    const literalSentenceCountries=countryNames(sentence);
    if(namedRegionBlend&&new RegExp('^'+selectedCountries[0]+'\\s','iu').test(name)&&
       literalSentenceCountries.length===1&&key(literalSentenceCountries[0])===key(selectedCountries[0])&&
       !completeVarietyPhrase(namedRegionBlend[1],{explicit:true})&&
       !/\b(?:flavou?r|tasting|notes?|roast|beans?|coffee|chocolate|caramel|cocoa|citrus|nutty|fruity|sweet|spice|vanilla|berry|pumpkin|catalog|product)\b/iu.test(namedRegionBlend[1])){
     add(namedRegionBlend[1]+', '+selectedCountries[0],sentence);
     continue;
    }
    const from=sentence.match(new RegExp(
     '^(?:(?:Single[ -]Origin|Organic|Fair[ -]Trade)\\s+){0,3}('+COUNTRIES+')\\s+coffee\\s+from\\s+('+PLACE+')(?:\\s*,\\s*('+PLACE+'))?(?=[.!?]|$)','iu'));
    if(from&&key(from[1])===key(selectedCountries[0])){
     const locality=[from[2],from[3]].filter(Boolean).map(part=>part.replace(/[.,;:!?]+$/u,'').trim()).join(', ');
     if(locality.length>=4)add(locality+', '+from[1],sentence);
     continue;
    }
    // Two appearances of the SAME literal regional name in an explicitly
    // selected current lot sentence can corroborate a locality. "Brazil
    // Mogiana ... Mogiana growing region in Brazil" is direct source text,
    // not a geographic inference from the product slug or adjacent coffee.
    const repeated=sentence.match(new RegExp(
     '^('+COUNTRIES+')\\s+('+PLACE+')\\s+is\\s+(?:produced|grown|sourced|cultivated)\\s+in\\s+the\\s+(?:renowned\\s+)?\\2\\s+growing\\s+region\\s+in\\s+\\1(?=[.!?]|$)','iu'));
    if(repeated&&key(repeated[1])===key(selectedCountries[0])&&
       key(name).includes(key(repeated[1]+' '+repeated[2]))){
     add(repeated[2]+', '+repeated[1],sentence);
     continue;
    }
   }
   // The selected-coffee product may describe its direct growing locality
   // before naming the producing country: "From the Tarrazu region of Costa
   // Rica, this coffee..." A broader mountain range in the same sentence
   // is only setting, not a second origin ("Andes Mountains in Colombia's
   // Huila region"). Require the exact current-coffee clause and the printed
   // country; never guess a region from the URL, country or roaster.
   const mountain=sentence.match(new RegExp(
    '^From\\s+the\\s+('+PLACE+')\\s+Mountains?\\s+in\\s+('+COUNTRIES+')[\\u2019\\x27]s\\s+('+PLACE+')\\s+region\\s*,\\s*this\\s+coffee\\b','iu'));
   const regional=sentence.match(new RegExp(
    '^From\\s+the\\s+('+PLACE+')\\s+region\\s+of\\s+('+COUNTRIES+')\\s*,\\s*this\\s+coffee\\b','iu'));
   // If only a named mountain range and country are published, retain
   // both as a broad literal growing area; never manufacture a smaller town.
   const mountainOnly=sentence.match(new RegExp(
    '^From\\s+the\\s+('+PLACE+')\\s+Mountains?\\s+in\\s+('+COUNTRIES+')\\s*,\\s*this\\s+coffee\\b','iu'));
   // "From the region of Costa Rica" prints a country, not a named region.
   const unnamed=sentence.match(new RegExp(
    '^From\\s+the\\s+region\\s+of\\s+('+COUNTRIES+')\\s*,\\s*this\\s+coffee\\b','iu'));
   if(mountain||regional||mountainOnly||unnamed){
    const country=(mountain?.[2]||regional?.[2]||mountainOnly?.[2]||unnamed?.[1]||'').trim();
    const locality=(mountain?.[3]||regional?.[1]||
     (mountainOnly?mountainOnly[1].trim()+' Mountains':'')).trim();
    // Do not silently turn a merchandised "Seasonal Blend region" into a
    // geographic region. The directly printed country remains available.
    const valid=locality.length>=3&&locality.length<=70&&!COUNTRY_ONLY.test(locality)&&
     !/\b(?:coffees?|offerings?|blends?|roasts?|products?|assortments?)\b/iu.test(locality);
    add((valid?locality+', ':'')+country,sentence);
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
// Bind one measured, current selected lot's growing region to the country
// explicitly printed in the adjacent selected-coffee sentence and its exact
// H1. The next specification can omit the country; neither SEO, geography
// lookup, unrelated coffee descriptions nor a historical lot may supply it.
export function selectedAdjacentGrowingRegion(blocks,{name='',origin=''}={}){
 if(!Array.isArray(blocks)||!name||name.length>220)return null;
 const countries=countryNames(name);
 if(countries.length!==1||(origin&&key(origin)!==key(countries[0])))return null;
 const titles=blocks.filter(block=>block.tag==='h1');
 if(titles.length!==1||key(titles[0].text)!==key(name))return null;
 const from=new RegExp('^(?:This|Our)\\s+(?:is|are)\\s+(?:.{4,100}?\\s+)?(?:offering|coffee|lot)\\s+from\\s+('+COUNTRIES+')\\s*[.!?]?$','iu');
 const specific=/^More\s+(?:specifically|precisely),\s+(?:an?\s+)?[\p{L}\p{M}\d\s,&'’()-]{5,155}?\b(?:varietals?|coffee|lot|beans?)\s+(?:grown|cultivated|sourced)\s+at\s+\d{3,4}(?:\s*[-–—]\s*\d{3,4})?\s*(?:meters?|masl|m)\s*(?:above\s+sea\s+level\s+)?from\s+the\s+((?:(?:lake|mount|valley)\s+)?[\p{Lu}][\p{L}\p{M}’'-]{2,55}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,55}){0,2})\s+region[.!?]?$/iu;
 const claims=new Map();
 for(const block of blocks){
  if(!['p','div','li'].includes(block.tag)||block.educational||block.text.length>1600||
     /\b(?:related|recommended|other coffees?|other roasts?|catalog|navigation|reviews?)\b/iu.test(block.section||''))continue;
  const lines=sentences(block.text);
  for(let i=1;i<lines.length;i++){
   const before=lines[i-1],after=lines[i],currentCountry=from.exec(before)?.[1];
   if(!currentCountry||key(currentCountry)!==key(countries[0])||
      !current(before)||!current(after)||
      /\b(?:previous|historical|formerly|no longer|other|another|hypothetical|used to)\b/iu.test(before+' '+after)||
      countryNames(after).some(value=>key(value)!==key(currentCountry)))continue;
   const region=specific.exec(after)?.[1]?.trim();
   if(!region||region.length>65||COUNTRY_ONLY.test(region)||
      completeVarietyPhrase(region,{explicit:true})||
      /\b(?:coffee|roast|blend|product|offering|catalog|chocolate|caramel|tasting|flavou?r|shipping|street|warehouse|farm|station)\b/iu.test(region))continue;
   const readable=region.replace(/^./u,c=>c.toUpperCase());
   const value=readable+', '+currentCountry;
   claims.set(key(value),{value,quote:before+' '+after});
  }
 }
 return claims.size===1?[...claims.values()][0]:null;
}

function currentCoffeeReleasePrefix(sentence){
 if(sentence.length>1800)return null;
 const match=sentence.match(/^((?:Here's|Here’s|Here is)\s+what\s+you\s+can\s+expect\s+from\s+this\s+coffee\s+in\s+(20\d{2}\s*[/–—-]\s*(?:20)?\d{2})\s*:)(.*)$/i);
 if(!match||!current(match[1])||!current(match[3].replace(/\bthan\s+last\s+year(?:['’]s)?\s+(?:harvest|crop)\b/gi,'than an earlier comparison')))return null;
 return {label:'Release',value:match[2],quote:sentence};
}
// This one literal relationship is also valid in a selected Product's own
// description. Do not expand all JSON prose into general identity guesses.
export function extractCoffeeCurrentReleasePrefixes(html,{clean}={}){
 const facts=[];
 for(const block of productCoffeeProse(html,clean)){
  if(block.educational||/^h[1-6]$/.test(block.tag))continue;
  for(const sentence of sentences(block.text)){
   const fact=currentCoffeeReleasePrefix(sentence);
   if(fact&&!facts.some(item=>key(item.value)===key(fact.value)))facts.push(fact);
   if(facts.length===12)return facts;
  }
 }
 return facts;
}
// Visible accessible product-image text can state a complete exact-coffee
// origin even when its nearby region caption is joined to producer details.
// Require the printed selected coffee name AND the literal "coffee bag from"
// statement; general images, filenames, and anonymous bag photos never count.
function selectedCoffeeBagAltOrigin(html,name){
 if(!name||name.length>160)return [];
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return [];
 const claims=[];
 for(const node of nodes){
  if(node.tag!=='img'||node.attributes.length>2400)continue;
  const alt=coffeeHtmlAttributes(node.attributes).alt;
  if(!alt||alt.length>360)continue;
  const match=/^(.{2,140}?)\s+coffee\s+bag\s+from\s+(.{6,150}?)\s+[-–—]\s+(?:(?:very|ultra)\s+)?(?:light|medium|dark)(?:[ -](?:light|medium|dark))?\s+roast\s+by\s+producer\s+.{2,100}$/iu.exec(alt);
  if(!match||key(match[1])!==key(name))continue;
  const location=match[2].trim(),parts=location.split(/\s*,\s*/u);
  if(parts.length!==3||!COUNTRY_ONLY.test(parts[2])||parts.slice(0,2).some(x=>
   x.length<3||x.length>65||!/^[\p{Lu}][\p{L}\p{M}'’ .-]*$/u.test(x)))continue;
  const value=parts.join(', ');
  if(!claims.some(x=>key(x.value)===key(value)))claims.push({value,quote:alt});
  if(claims.length>3)break;
 }
 return claims;
}
// Combine only two independently printed places about this exact selected
// coffee: its named product story "X, our ... from Region" and its current
// "This lot hails from Locality" statement. No gazetteer/country guess.
// Require the exact selected H1, its immediately adjacent visible location,
// and a separate current-producer farm claim; no URL, SEO or catalog fallback.
function selectedHeadingAdjacentFarmLocation(html,blocks,{name='',fields={},clean}={}){
 if(!name||typeof clean!=='function'||!fields.producer||!key(name).includes(key(fields.producer)))return null;
 const countries=countryNames(name);
 if(countries.length!==1)return null;
 const page=productMarkup(html),{nodes,truncated}=coffeeHtmlElements(page);
 if(truncated)return null;
 const headings=nodes.filter(node=>node.tag==='h1'&&node.contentEnd-node.headEnd<=500&&
  key(clean(page.slice(node.headEnd,node.contentEnd),220))===key(name));
 if(headings.length!==1)return null;
 const title=headings[0],i=nodes.findIndex(node=>node.parent===title.parent&&node.start>=title.end),next=nodes[i];
 if(!next||next.tag!=='div'||next.start-title.end>240||page.slice(title.end,next.start).trim()||
    !/(?:^|[\s_-])location(?:$|[\s_-])/i.test(coffeeHtmlAttributes(next.attributes).class||''))return null;
 const parts=nodes.filter(node=>node.parent===i&&node.tag==='span');
 if(parts.length!==2)return null;
 const values={};
 for(const part of parts){
  const classes=(coffeeHtmlAttributes(part.attributes).class||'').split(/\s+/u);
  const role=classes.includes('cityname')?'locality':classes.includes('coname')?'country':'';
  if(!role||values[role])return null;
  values[role]=clean(page.slice(part.headEnd,part.contentEnd),160);
 }
 if(!values.locality||!values.country||!COUNTRY_ONLY.test(values.country)||
    key(values.country)!==key(countries[0]))return null;
 const local=values.locality.split(/\s*,\s*/u);
 if(local.length!==2||local.some(place=>place.length<3||place.length>65||
    !/^\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*){0,5}$/u.test(place)||
    completeVarietyPhrase(place,{explicit:true})||COUNTRY_ONLY.test(place)||
    /\b(?:coffee|roast|process|washed|natural|honey|anaerobic|decaf|shipping|delivery|street|avenue|farm|estate|tasting|flavou?r)\b/i.test(place)))return null;
 const farmInCity=new RegExp('\\bfarm\\s+in\\s+'+local[0]+'(?=\\s|[,.;!?]|$)','iu');
 const proof=blocks.find(b=>!b.educational&&!/^h[1-6]$/.test(b.tag)&&b.text.length<=1600&&
   current(b.text)&&key(b.text).includes(key(fields.producer))&&farmInCity.test(b.text)&&
   !/\b(?:former|previous|historical|no longer|another farm|other coffee)\b/i.test(b.text));
 return proof?{value:local.join(', ')+', '+values.country,
  quote:name+' | '+values.locality+' '+values.country+' | '+proof.text.slice(0,800)}:null;
}

function pairedSelectedLotRegion(blocks,name,previousOrigin=''){
 const titles=blocks.filter(block=>block.tag==='h1').map(block=>key(block.text));
 if(!titles.length||titles.some(value=>value!==key(name)))return null;
 const regions=new Map(),towns=new Map();
 for(const block of blocks){
  if(!['p','li','div'].includes(block.tag)||block.text.length>900)continue;
  for(const sentence of sentences(block.text)){
   if(sentence.length>550||!current(sentence)||
      /\b(?:previous|prior|former|historical|last year|other coffee|other lot|another coffee|another lot)\b/i.test(sentence))continue;
   const named=sentence.match(/^([\p{Lu}][\p{L}\p{M}'’ -]{3,80}?),\s+our\s+[^.!?]{2,90}?\s+from\s+([\p{Lu}][\p{L}\p{M}’'-]{2,50}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,50}){0,2})(?=\s*[,.;:—–]|$)/u);
   if(named&&key(named[1]).length>=5&&key(name).includes(key(named[1]))&&
      !/^(?:coffee|blend|roast|organic|decaf)$/i.test(named[1])){
    const value=named[2].trim();
    if(!regions.has(key(value)))regions.set(key(value),{value,quote:sentence});
   }
   const lot=sentence.match(/\b(?:this|our)\s+(?:current\s+)?(?:lot|coffee|beans?)\s+hails?\s+from\s+([\p{Lu}][\p{L}\p{M}’'-]{2,50}(?:\s+[\p{Lu}][\p{L}\p{M}’'-]{2,50}){0,2})(?=\s*[,.;:—–]|$)/iu);
   if(lot){
    const value=lot[1].trim();
    if(!towns.has(key(value)))towns.set(key(value),{value,quote:sentence});
   }
  }
 }
 // Never resolve contradictory current lots or stronger existing evidence
 // by source order. Preserve literal place names without inferring a country.
 if(regions.size!==1||towns.size!==1)return null;
 const region=[...regions.values()][0],town=[...towns.values()][0];
 if(key(region.value)===key(town.value)||(previousOrigin&&key(previousOrigin)!==key(town.value)))return null;
 return {value:town.value+', '+region.value,quote:town.quote+' | '+region.quote};
}

// Link a named current producer's PRESENT farm to a preceding literal
// locality only through an adjacent "There ... what is now [farm]" sentence.
// Historical moves or farm names alone never establish current origin.
export function selectedCurrentFarmBridge(blocks,{name='',producer='',origin=''}={}){
 if(!Array.isArray(blocks)||!name||!producer||producer.length<5||
    !key(name).includes(key(producer)))return null;
 const countries=countryNames(name);
 if(countries.length!==1||(origin&&key(origin)!==key(countries[0])))return null;
 const first=producer.trim().split(/\s+/u)[0];
 if(!/^\p{Lu}[\p{L}\p{M}'’-]{2,44}$/u.test(first))return null;
 const pattern=/\bin\s+([\p{Lu}][\p{L}\p{M}’' -]{2,65}),\s*([\p{Lu}][\p{L}\p{M}’' -]{2,65})\.\s*There,\s*([\p{Lu}][\p{L}\p{M}’'-]{2,45})\s+and\s+(?:his|her|their)\s+family\s+invested\s+in\s+what\s+is\s+now\s+(?:Finca|Farm|Estate)\s+[\p{Lu}][\p{L}\p{M}’' -]{2,65},\s+(?:a|an)\s+(?:[\d.,]+[ -]hectare\s+)?farm\b/giu;
 const candidates=new Map();
 for(const block of blocks){
  if(!['p','li','div'].includes(block.tag)||block.educational||
    /\b(?:related|recommended|other coffees?|other roasts?|catalog|customer reviews)\b/i.test(block.section||'')||
    !block.text||block.text.length>5500)continue;
  for(const m of block.text.matchAll(pattern)){
   if(key(m[3])!==key(first))continue;
   const city=m[1].trim(),region=m[2].trim();
   if([city,region].some(v=>v.length>65||
      /\b(?:coffee|roast|process|natural|washed|honey|farm|finca|estate|shipping|street|avenue)\b/i.test(v)))continue;
   const value=city+', '+region+', '+countries[0];
   candidates.set(key(value),{value,quote:m[0]});
  }
 }
 return candidates.size===1?[...candidates.values()][0]:null;
}

// A currently selected BARREL-AGED coffee can explicitly identify its green
// beans in a pair of adjacent, current-product preparation sentences. The
// named subregion is a literal claim, never inferred from whiskey geography,
// generic country education, URL SEO or a different product's ingredient.
export function selectedBarrelGreenBeanRegion(blocks,{name='',origin=''}={}){
 if(!Array.isArray(blocks)||!/\bbarrel[ -]aged\b/iu.test(name)||!COUNTRY_ONLY.test(origin))return null;
 const titles=blocks.filter(block=>block.tag==='h1');
 if(titles.length!==1||key(titles[0].text)!==key(name))return null;
 const prior=/\bwe(?:[’']ve|\s+have)\s+taken\b.{0,125}\bbarrel\b.{0,100}\bused\s+it\s+to\s+age\s+our\s+green\s+coffee\b/iu;
 const after=/\bthis\s+infuses\b.{0,180}\bto\s+transform\s+an?\s+(\p{Lu}[\p{L}\p{M}'’-]{2,45})\s+(\p{Lu}[\p{L}\p{M}'’-]{2,60}(?:\s+(?:de|del|la|the|of)\s+\p{Lu}[\p{L}\p{M}'’-]{2,60}|\s+\p{Lu}[\p{L}\p{M}'’-]{2,60}){0,2})\s+into\b/iu;
 const candidates=new Map();let conflictingCountry=false;
 for(const block of blocks){
  if(!['p','li','div'].includes(block.tag)||block.educational||block.text.length>1800||
     /\b(?:related|recommended|other coffees?|other roasts?|catalog|reviews?)\b/iu.test(block.section||''))continue;
  const lines=sentences(block.text);
  for(let i=1;i<lines.length;i++){
   const before=lines[i-1],sentence=lines[i];
   if(!prior.test(before)||!current(before)||!current(sentence)||
      /\b(?:other|another|previous|historical|former|formerly|no longer|hypothetical|last year|used to)\b/iu.test(before+' '+sentence))continue;
   const m=after.exec(sentence);if(!m)continue;
   const country=DEMONYMS[m[1]],place=m[2];
   if(!country||place.length>65||COUNTRY_ONLY.test(place)||completeVarietyPhrase(place,{explicit:true})||
      /\b(?:coffee|roast|blend|process|washed|natural|honey|flavou?r|tasting|vanilla|caramel|chocolate|whisk(?:e)?y|barrel|warehouse|street|shipping)\b/iu.test(place))continue;
   if(key(country)!==key(origin)){conflictingCountry=true;continue;}
   const value=place+', '+country;
   candidates.set(key(value),{value,quote:before+' '+sentence});
  }
 }
 return !conflictingCountry&&candidates.size===1?[...candidates.values()][0]:null;
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
 for(const place of narrativeGeography(blocks,{name})){
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
 const namedBarrelBeans=selectedBarrelGreenBeanRegion(blocks,{name,origin:fields.origin});
 if(namedBarrelBeans)add('Origin',namedBarrelBeans.value,namedBarrelBeans.quote);
 const adjacentSelectedOrigin=selectedAdjacentGrowingRegion(blocks,{name,origin:fields.origin});
 if(adjacentSelectedOrigin)add('Origin',adjacentSelectedOrigin.value,adjacentSelectedOrigin.quote);
 const adjacentFarm=selectedHeadingAdjacentFarmLocation(html,blocks,{name,fields,clean});
 if(adjacentFarm)add('Origin',adjacentFarm.value,adjacentFarm.quote);
 // Join explicitly named current lot and region only for the selected coffee.
 const pairedLot=pairedSelectedLotRegion(blocks,name,fields.origin);
 if(pairedLot)add('Origin',pairedLot.value,pairedLot.quote);
 // Direct current selected producer/farm linkage outranks country-only
 // origin, but never overwrites incompatible or already specific origin.
 const selectedPresentFarm=selectedCurrentFarmBridge(blocks,{name,producer:fields.producer,origin:fields.origin});
 if(selectedPresentFarm)add('Origin',selectedPresentFarm.value,selectedPresentFarm.quote);
 const titleOrigin=extractCoffeeTitleOrigin(name);
 const titleMatches=titleOrigin?.label==='Country'?titleOrigin.value.split(', '):[];
 const titleCountries=titleMatches.length>1&&!/\bblend\b/i.test(name)?[]:titleMatches;
 const selectedTitleRegion=selectedCountryFirstTitleRegion({name,country:titleCountries.length===1?titleCountries[0]:'',origin:fields.origin,blocks});
 if(selectedTitleRegion)add('Origin',selectedTitleRegion.value,selectedTitleRegion.quote);
 const producerTitleRegion=selectedCountryProducerRegion({name,country:titleCountries.length===1?titleCountries[0]:'',origin:fields.origin,blocks});
 if(producerTitleRegion)add('Origin',producerTitleRegion.value,producerTitleRegion.quote);
 // Country words in the exact selected name are explicit geography; do not
 // derive a region, producer, harvest, or product identity from URL slugs.
 if(titleCountries.length&&titleCountries.length<=4&&!countryNames(fields.origin||'').length)add('Country',titleCountries.join(', '),name);
 if(!fields.origin&&titleOrigin?.label==='Origin')add('Origin',titleOrigin.value,name);
 const originCandidates=[...selectedCoffeeBagAltOrigin(html,name)],processes=[],currentProcesses=[],varietyCandidates=[],compositionCandidates=[];
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
  const compactCandidates=compactLines.length<=40?compactLines.map(line=>clean(line,6001)):[];
  // Recover one complete selected-product specification when geography and
  // processing/altitude are split by a single BR in the SAME paragraph.
  if(block.tag==='p'&&compactLines.length===2&&value.length<=160)compactCandidates.push(value);
  for(const compact of compactCandidates){
  if(compact.length<=160&&current(compact)){
   // A compact CURRENT selected lot credit can publish the producer and
   // a named locality followed by an explicit country without a comma before
   // the country: "Bressani Family, San Jerónimo Guatemala". Require the
   // same producer already verified in canonical fields AND the selected H1.
   // No roaster lookup, SEO/URL, generic comma sentence or country inference.
   if(!fields.origin&&fields.producer&&key(fields.producer).length>=7&&
      key(name).includes(key(fields.producer))&&compact.length<=125){
    const credited=compact.match(new RegExp(
     '^([\\p{Lu}][\\p{L}\\p{M} .&-]{4,95}),\\s+([\\p{Lu}][\\p{L}\\p{M} .-]{2,65})\\s+('+COUNTRIES+')$','iu'));
    if(credited&&key(credited[1])===key(fields.producer)&&
       !/\b(?:coffee|roast|process|washed|natural|honey|anaerobic|decaf|shipping|delivery|street|avenue|farm|estate)\b/i.test(credited[2])&&
       !completeVarietyPhrase(credited[2])&&!COUNTRY_ONLY.test(credited[2]))
     originCandidates.push({value:credited[2].trim()+', '+credited[3],quote:compact});
   }
   const countryFirst=compact.match(new RegExp('^('+COUNTRIES+')\\s+[-–—]\\s+([\\p{L}\\p{M} .,’’\'()-]{2,120})$','iu'));
   // A country-first product title or repeated breadcrumb can carry a coffee
   // VARIETY rather than a geographic region: "Nicaragua - Pumpkin Spice-
   // Pacamara" never means a village called "Pumpkin Spice- Pacamara".
   // Country remains explicit; only a separately published, unambiguous
   // selected regional label may support a cultivar-homonymous location.
   const countryFirstHasCultivar=Boolean(countryFirst?.[2].match(VARIETY_RE)?.length);
   if(countryFirst&&!countryFirstHasCultivar&&!( /^h[1-6]$/.test(block.tag)&&key(compact)===key(name))&&
      !/\b(?:coffee|roast|process|blend|washed|natural|honey|anaerobic|decaf|finca|hacienda|farm|estate)\b/i.test(countryFirst[2]))originCandidates.push({value:countryFirst[2]+', '+countryFirst[1],quote:compact});
   // A complete three-part current-product place tuple may precede the
   // processing/cultivar/altitude specs on one compact product line.
   // Require explicit country, process, cultivar and measured altitude;
   // never guess geographic roles from an unrelated label or a title slug.
   const specOrigin=compact.match(/^(.{5,180}?)\s+(?:Fully\s+)?(?:Washed|Natural|Honey|Anaerobic)\s+[\p{Lu}][\p{L}\p{M}\d'’ -]{1,75}\s*\/\/\s*\d{3,4}\s*(?:[-–—]\s*\d{3,4})?\s*(?:masl|m)$/iu);
   if(specOrigin){
    const components=specOrigin[1].split(/\s*,\s*/);
    if(components.length===3&&components.slice(0,2).every(part=>
       /^[\p{Lu}][\p{L}\p{M}'’ .-]{1,90}$/u.test(part))&&
       COUNTRY_ONLY.test(components[2])&&
       (!titleCountries.length||titleCountries.length===1&&key(titleCountries[0])===key(components[2])))
      originCandidates.push({value:components.join(', '),quote:compact});
   }
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
   // The current date prefix is independent of a later past-harvest comparison.
   // Keep both dates when another current claim genuinely disagrees.
   const datedPrefix=currentCoffeeReleasePrefix(sentence);
   if(datedPrefix)add(datedPrefix.label,datedPrefix.value,datedPrefix.quote);
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
    for(const pattern of patterns)for(const match of processSentence.matchAll(pattern)){
     // A sensory analogy to OTHER coffees is not a method assertion about
     // this selected lot. Keep direct Process labels and actual method prose.
     const lead=processSentence.slice(Math.max(0,match.index-130),match.index);
     const comparison=/\b(?:about|like|similar to|reminiscent of|compared to|typical of|reminds? (?:us )?of)\s+(?:(?:the|a|an|classic|other|traditional)\s+){0,3}$/i.test(lead);
     if(comparison)continue;
     processes.push({value:processValue(match[1]),quote:sentence});
    }
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
    // A producer's dated biography is not proof that this selected coffee
    // is being offered as that harvest. Require same-sentence lot identity;
    // exact printed Harvest/Release specifications remain handled separately.
    const selectedLotHarvest=/\b(?:this|our|the|current|selected)\s+(?:coffee|lot|beans?|cherries|batch|offering|release)\b/i.test(sentence) ||
     /^This is the 20\d{2}\s+(?:harvest|crop)\b/i.test(sentence);
    if(harvest&&selectedLotHarvest)add('Harvest',harvest[1],sentence);
    const datedOffering=sentence.match(/\b(?:our|this)\s+(?:(?:first|last|new|current|rotating|washed|natural|honey|anaerobic|single)\s+){0,5}(?:selection|offering|release|single origin)\b[^.!?]{0,65}\b(?:of|for)\s+(20\d{2})\b/i)||
     sentence.match(/\bbring\s+you\s+(?:the\s+)?(20\d{2})\s+lot\b/i)||
     (!/\b(?:could|would|might|may|hypothetical|imagine|suppose)\b/i.test(sentence)&&
      sentence.match(/\bexpect\s+from\s+this\s+coffee\s+in\s+(20\d{2}(?:\s*[-–—/]\s*(?:20)?\d{2})?)\b/i));
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
