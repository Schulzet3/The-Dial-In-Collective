import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {isRecurringCoffeeHarvestWindow} from '../../supabase/functions/_shared/coffee-release-label.mjs';
// Deterministic, evidence-only reading of the SELECTED product's visible text.
// Supplement existing labeled and structured parsers; never create Verified facts.
// No network calls, model invocation, hidden scripts or unrestricted site crawling.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {productCoffeeProse} from './coffee-product-prose.mjs';
import {extractCoffeeGeographyEntityRoles} from './coffee-geography-entity-roles.mjs';

const COUNTRY=String.raw`Panama|Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Papua New Guinea|DR Congo|United States|Jamaica|Vietnam|China|Taiwan|Laos|Myanmar|Venezuela|Philippines|Malawi|Zambia|Nepal|Australia|Cuba|Dominican Republic|Haiti|Puerto Rico|Timor-Leste|East Timor`;
const ENTITIES={'amp':'&','nbsp':' ','quot':'"','apos':"'",'eacute':'é','ndash':'–','mdash':'—'};
function text(raw,max=300){
 return String(raw||'').replace(/<\/?(?:span|strong|b|em|i|small|sup|sub|a|u|s|mark|abbr)\b[^<>]{0,2000}>/gi,'')
  .replace(/<[^<>]{0,2000}>/g,' ').replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi,(all,key)=>{
  const k=key.toLowerCase();
  if(Object.hasOwn(ENTITIES,k))return ENTITIES[k];
  if(k[0]!=='#')return all;
  const n=k[1]==='x'?Number.parseInt(k.slice(2),16):Number.parseInt(k.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):all;
 }).replace(/\s+/g,' ').trim().slice(0,max);
}
function scopedPage(html){
 // The shared scope also protects direct calls to this helper. Inspect all
 // bounded product text: an arbitrary raw-byte cutoff discards facts after
 // an icon gallery, an animated title or a long but legitimate coffee story.
 return removeElements(productMarkup(html),['svg','canvas','audio']);
}
const NAME_WORD=String.raw`\p{Lu}[\p{L}\p{M}'’-]{1,30}`;
const PARTICLE=String.raw`(?:de|del|la|las|los|da|das|do|dos|van|von|por|un|una|para|el)`;
const NICKNAME=String.raw`[“"][\p{L}\p{M}'’-]{1,30}[”"]\s+`;
const FULL_NAME=NAME_WORD+String.raw`(?:\s+(?:`+NICKNAME+String.raw`)?(?:`+PARTICLE+String.raw`\s+){0,2}`+NAME_WORD+String.raw`){1,5}`;
const PERSON='('+FULL_NAME+')';
const CREDITED='((?:'+FULL_NAME+String.raw`(?:\s+(?:and|&|y)\s+`+FULL_NAME+'){0,2}|'+NAME_WORD+String.raw`\s+(?:and|&|y)\s+`+FULL_NAME+'))';
const BAD_PERSON=/^(?:Corvus Coffee|Proud Mary|Little Wolf|Our Coffee|The Coffee|This Coffee|Natural Process|Carbonic Maceration|Finca Deborah)$/i;
const LOC_RE=new RegExp(String.raw`\b((?:Finca|Hacienda|Farm|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,4})\s*,\s*(`+COUNTRY+String.raw`)\b`,'iu');
const GENERAL_CONTEXT=/\b(?:generally|typically|usually|for example|for instance|such as|hypothetical|fictional|imaginary|suppose|imagine|learn about|in general|as a general rule|different types of|we also discuss|what is|how does|understanding|all about|guide to|glossary|elsewhere|other coffees?|another (?:coffee|lot|farm|process)|different (?:coffee|lot|farm|process)|last year(?:'s)?|previous (?:year|season|crop|harvest|lot|release)|prior (?:year|season|crop|harvest|lot|release))\b/i;
const NEGATED=/\b(?:not|never|without|neither|no|cannot|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|can't|rather than|unlike)\b/i;
function factualSentence(value){
 return value.length<=1800&&!GENERAL_CONTEXT.test(value)&&
  !NEGATED.test(value.replace(/\bnot only\b/gi,''));
}
function sentences(value){return value.split(/(?<=[.!?])\s+/u).map(x=>x.trim()).filter(Boolean);}
const producerSentences=value=>value.split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr)\.)(?<=[.!?])\s+/u).map(x=>x.trim()).filter(Boolean);
function collectiveCredit(raw){
 // A source credit ends before cultivation, location or purchasing prose.
 // Keep the literal group/name instead of adding its altitude or method.
 let value=raw.trim().replace(/^(?:the|an?)\s+/i,'')
  .split(/,\s+(?!\d)|\s+(?:at\s+(?:altitudes?|elevations?)|rooted|located|using|through|throughout|within|near|on the slopes|in the|that|which|who|where)\b/i)[0];
 const unnamed=value.match(/^((?:(?:approximately|around|over|nearly)\s+)?(?:[\d,]+\s+)?(?:(?:small[ -]?holder|small|local|individual|independent|family[- ]owned|family)\s+){1,3}(?:farmers?|growers?|producers?|farms?|farm holders))\b/i);
 if(unnamed)value=unnamed[1];
 if(value.length<3||value.length>155||/\b(?:care|love|passion|dedication|commitment|hand|handpicked|traditional|methods?|process|grown|produced|cultivated|harvested|sourced|collected|comes|is|are|was|were|has|have)\b/i.test(value)||
    /^(?:a specific |many areas? |any |different regions? |areas? of |regions? of )/i.test(value))return '';
 const group=/\b(?:small[ -]?holders?|farm[ -]?holders?|farmers|growers|producers|producer group|cooperativ[ae]|co-?op|association|asociaci[oó]n|washing station|family|families)\b/i.test(value)||
  /^(?:(?:small|local|individual|independent|family[- ]owned)\s+){1,3}farms?\b/i.test(value);
 const namedFarm=/\b(?:Finc[aá]|Fazenda|Hacienda|Farm|Estate)\s+\p{Lu}[\p{L}\p{M}'’-]+/u.test(value)||
  /^\p{Lu}[\p{L}\p{M}'’-]+(?:\s+\p{Lu}[\p{L}\p{M}'’-]+){0,5}\s+(?:[Ff]arm|[Ee]state)$/u.test(value);
 return group||namedFarm?value:'';
}
function foundGrower(paragraphs,name=''){
 const found=new Map(),collectives=new Map();
 for(const paragraph of paragraphs){
  // A current-coffee introduction followed by the same person's farming
  // sentence supplies a grower, without treating a city after "from" as one.
  if(/\b(?:She|He|They)\s+(?:farms?|grows?|cultivates?|produces?)\b/.test(paragraph)){
   for(const sentence of producerSentences(paragraph))if(factualSentence(sentence)){
    const match=sentence.match(new RegExp(String.raw`\b(?:our (?:first |new )?|this |the )coffee\s+from\s+`+PERSON+String.raw`(?=[,.!;]|$)`,'u'));
    if(match&&!BAD_PERSON.test(match[1]))found.set(match[1].normalize('NFKC').toLowerCase(),match[1]);
   }
  }
  for(const sentence of producerSentences(paragraph)){
  // A comparison can explicitly identify the current grower while naming
  // an earlier lot. Read only the current attribution before that comma;
  // the previous lot itself never becomes this coffee's producer.
  const continuity=sentence.match(new RegExp(String.raw`\bcoffee\s+from\s+`+PERSON+String.raw`\s*,\s*(?:the\s+)?same\s+producer\s+of\s+(?:our|the)\s+previous\s+[^.!?]{1,100}\blot[.!]?$`,'u'));
  if(continuity&&factualSentence(sentence.slice(0,continuity.index+continuity[0].indexOf(','))))
   found.set(continuity[1].normalize('NFKC').toLowerCase(),continuity[1]);
  // "Not our first collaboration, but ... this lot from Estate" contains
  // an affirmative current-lot clause. The negation applies to the earlier
  // relationship; it does not deny the separately stated present source.
  const currentLot=sentence.match(/\bbut\s+it\s+is\s+our\s+first\s+time\s+featuring\s+([^.!?]{1,150}\blot\s+from\s+([^.!?]{3,100}))[.!]?$/i);
  const currentFarm=currentLot&&!GENERAL_CONTEXT.test(sentence.slice(0,currentLot.index))&&factualSentence(currentLot[1])&&collectiveCredit(currentLot[2]);
  if(currentFarm)collectives.set(currentFarm.normalize('NFKC').toLowerCase(),currentFarm);
  const attributionContext=sentence.replace(/\bis not one (?:you|we)\b/gi,'is one you')
   .replace(/\bwithout caffeine\b/gi,'decaffeinated').replace(/\bwithout a featured coffee\b/gi,'awaiting coffee');
  if(!factualSentence(attributionContext)||!/\b(?:coffees?|producers?|farmers?|growers?|farms?|finca|hacienda|estate|grown|produced|produces?|cultivated|cultivates?|harvested|farmed|sourced|collected|brought|comes|has|duo)\b/i.test(sentence))continue;
  const patterns=[
   new RegExp(String.raw`\b(?:from\s+)?(?:[Pp]roducer|[Ff]armer|[Gg]rower)\s*,?\s+`+CREDITED+String.raw`(?=\s+(?:and|of|who|at|on|in)\b|[,!.;]|$)`,'gu'),
   new RegExp(String.raw`\b(?:[Gg]rown|[Pp]roduced|[Cc]ultivated|[Hh]arvested|[Ff]armed)\s+by\s+(?:(?:the\s+)?(?:(?:female|male|dedicated|renowned)\s+)?(?:coffee\s+)?(?:producer|farmer|grower|pioneer)\s+)?`+CREDITED+String.raw`(?=\s+(?:and|who|at|on|in|from|high|along|near)\b|[,!.;—–]|$)`,'gu'),
   new RegExp(String.raw`\b(?:[Ff]armer|[Pp]roducer|[Gg]rower|[Ff]arm owner|[Ee]state owner)\s*(?:is|:|–|-)\s*`+CREDITED+String.raw`(?=\s+(?:and|who|at|on|in)\b|[,!.;]|$)`,'gu'),
   new RegExp(PERSON+String.raw`\s+(?:is|was)\s+(?:the|an?)\s+(?:farmer|producer|grower)\b`,'gu'),
   new RegExp(PERSON+String.raw`\s+(?:is|was)\s+(?:the|an?)\s+(?:(?:first|second|third|fourth|fifth|[1-5](?:st|nd|rd|th))[ -]generation\s+)?(?:(?:coffee|entrepreneurial)\s+)?(?:farmer|producer|grower)\b`,'gu'),
   new RegExp(PERSON+String.raw`\s+is\s+an?\s+(?:(?:small|independent|local|indigenous|Mayan|experienced|dedicated|specialty|coffee)\s+){1,4}(?:farmer|producer|grower)\b`,'gu'),
   new RegExp(PERSON+String.raw`\s*,\s*an?\s+(?:coffee\s+)?(?:producer|farmer|grower)\b`,'gu'),
   new RegExp(PERSON+String.raw`\s*,\s*(?:Farm|Estate)\s+Owner\b`,'gu'),
   new RegExp(PERSON+String.raw`['’]s?\s+(?:\d+(?:\.\d+)?[ -](?:hectare|acre)\s+)?(?:coffee\s+)?(?:farm|estate|Finca|Hacienda|Fazenda)\b`,'gu'),
   new RegExp(PERSON+String.raw`\s+and\s+(?:his|her|their)\s+family\s+returned\s+with\s+[^.!?]{0,65}\b(?:specialty|coffee)\s+production\s+at\s+(?:Finca|Hacienda|Fazenda|Farm|Estate)\b`,'gu'),
   new RegExp('('+NAME_WORD+String.raw`\s+(?:Jr|Sr)\.)\s+(?:got charge of|took over)\s+(?:the|his|her|their)\s+farm\b`,'gu'),
   new RegExp(String.raw`\b(?:this|the|our)\s+coffee\s+comes\s+from\s+`+PERSON+String.raw`\s+and\s+(?:his|her|their)\s+(?:farm|estate)\b`,'giu'),
   new RegExp(String.raw`\b(?:owned|operated|run|managed|led|helmed)\s+(?:and\s+(?:owned|operated|run|managed)\s+)?by\s+`+CREDITED+String.raw`(?=\s+(?:and (?:his|her|their)|in|at|since)\b|[,!.;]|$)`,'gu'),
   new RegExp(PERSON+String.raw`\s+(?:runs|operates|manages|has been operating|has been farming)\s+(?:(?:the|a)\s+)?(?:Finca|Hacienda|Estate|Farm|S[ií]tio)\b`,'gu'),
   new RegExp(String.raw`\b(?:[Gg]rown|[Pp]roduced|[Hh]arvested)\s+(?:and\s+(?:grown|produced|harvested)\s+)?by\s+(`+NAME_WORD+String.raw`)(?=\s+(?:who|in|at|on)\b|[,!.;]|$)`,'gu'),
   new RegExp(PERSON+String.raw`\s+has\s+(?:taken|created|produced|developed)\b.{0,250}\b(?:coffees?|geishas?|geshas?|variet(?:y|ies)|process(?:ing)?)\b`,'gu')
  ];
  for(const re of patterns)for(const m of sentence.matchAll(re)){
   const candidate=m?.[1]?.replace(/\s+(?:Country|Origin|Region|Variety|Cultivar|Harvest|Elevation|Altitude|Process)(?:\s.*)?$/,'');
   if(candidate&&!BAD_PERSON.test(candidate))found.set(candidate.normalize('NFKC').toLowerCase(),candidate);
  }
  const couple=sentence.match(new RegExp(PERSON+String.raw`\s+and\s+(?:her husband|his wife|their partner)\s*,?\s*`+PERSON+
   String.raw`\s*,?\s*(?:(?:are|were)\s+(?:(?:first|second|third|fourth|fifth)[ -]generation\s+)?(?:coffee\s+)?(?:producers|farmers|growers)|(?:grow|produce|cultivate)\s+coffee)\b`,'u'));
  if(couple){const value=couple[1]+' and '+couple[2];found.set(value.normalize('NFKC').toLowerCase(),value);}
  const coffeeCouple=sentence.match(new RegExp(String.raw`\b(?:[Tt]his|[Oo]ur)\s+[^.!?]{0,75}\b[Cc]offee(?:\s+series)?\s+from\s+`+PERSON+String.raw`\s+and\s+(?:her husband|his wife|their partner),?\s*`+PERSON+String.raw`[.!]?$`,'u'));
  if(coffeeCouple){const value=coffeeCouple[1]+' and '+coffeeCouple[2];found.set(value.normalize('NFKC').toLowerCase(),value);}
  const producingPair=sentence.match(new RegExp(PERSON+String.raw`,?\s+along\s+with\s+(?:his wife|her husband|their partner)\s+(`+NAME_WORD+String.raw`)\s+(?:have|has)\s+committed\s+to\s+(?:growing|producing|cultivating)\s+(?:exceptional\s+)?coffees?\b`,'u'));
  if(producingPair){const value=producingPair[1]+' and '+producingPair[2];found.set(value.normalize('NFKC').toLowerCase(),value);}
  const family=sentence.match(new RegExp('('+FULL_NAME+String.raw`\s+(?:&|and)\s+family)['’]s\s+(?:coffee\s+)?farm\b`,'u'));
  if(family)found.set(family[1].normalize('NFKC').toLowerCase(),family[1]);
  // An explicitly introduced pair supplies the literal names, not a guessed
  // shared surname. The verb must connect them to this offered coffee.
  const duo=sentence.match(new RegExp(String.raw`\b(?:[Ff]ather and son|[Mm]other and daughter|[Hh]usband and wife)\s+duo,\s*`+CREDITED+String.raw`,\s*(?:bring|offer|produce|grow)\s+(?:us\s+)?(?:this|the)\b[^.!?]{0,100}\bcoffee\b`,'u'));
  if(duo)found.set(duo[1].normalize('NFKC').toLowerCase(),duo[1]);
  const jointOperator=sentence.match(new RegExp(PERSON+String.raw`\s+(?:runs|operates)\s+`+FULL_NAME+String.raw`\s+(?:Farm|Estate)\s+with\s+(?:his|her|their)\s+(?:mother|father|partner|wife|husband),?\s*`+PERSON+String.raw`(?=[.!;]|$)`,'u'));
  if(jointOperator){const value=jointOperator[1]+' and '+jointOperator[2];found.set(value.normalize('NFKC').toLowerCase(),value);}
  const namedList=sentence.match(/\b(?:dedicated\s+)?producers\s+([^.!?;—–]{3,220}?)(?=\s+(?:who|which|where|bring|grow|produce|cultivate)\b|[.!?;—–]|$)/u);
  if(namedList){
   const parts=namedList[1].split(/\s*,\s*|\s+(?:and|&)\s+/).map(value=>value.replace(/^(?:and|&)\s+/,'').trim()).filter(Boolean);
   const person=new RegExp('^(?:'+FULL_NAME+')$','u');
   if(parts.length>=2&&parts.length<=6&&parts.every(value=>person.test(value)&&!BAD_PERSON.test(value))){
    const value=namedList[1].trim();found.set(value.normalize('NFKC').toLowerCase(),value);
   }
  }
  for(const match of sentence.matchAll(/\b(?:grown(?:\s+and\s+(?:fully\s+)?processed)?|produced|cultivated|harvested|sourced|collected)\s+(?:(?:directly|exclusively)\s+)?(?:by|from|through|on|in)\s+(?:the\s+)?([^.!?;]{3,155}?)(?=\s+(?:who|which|that|where|at\s+(?:altitudes?|elevations?)|rooted|located|using|through|throughout|within|near|on|in the|and (?:is|was|has|have|the|a))\b|,\s+(?!\d)|[.!?;]|$)/gi)){
   const candidate=collectiveCredit(match[1]);
   if(candidate)collectives.set(candidate.normalize('NFKC').toLowerCase(),candidate);
  }
  const delayedFarm=sentence.match(/\b(?:coffee|beans?|lot)\b[^.!?]{0,70}\b(?:grown|cultivated|produced)\b[^.!?]{0,100}\bby\s+(?:the\s+)?(?:renowned\s+)?((?:Finc[aá]|Fazenda|Hacienda)\s+[\p{L}\p{M}’' -]{2,100})(?=[.!?;]|$)/u);
  const delayedCredit=delayedFarm&&collectiveCredit(delayedFarm[1]);
  if(delayedCredit)collectives.set(delayedCredit.normalize('NFKC').toLowerCase(),delayedCredit);
  const comes=sentence.match(/\b(?:comes(?: to us)?|is sourced|brought to us|(?:this|the|our)\s+(?:coffee|lot)\s+is|coffee we get)\s+from\s+(?:the\s+)?([^.!?;]{3,155}?)(?=\s+(?:who|which|that|where|is)\b|[.!?;]|$)/i)||
   sentence.match(/\b(?:this|our)\s+(?:(?:anaerobic|natural|washed|honey|processed|current|new|first|single-origin)\s+){0,5}lot\s+from\s+([^.!?;]{3,125}?)(?=\s+(?:who|which|that|where|is)\b|[.!?;]|$)/i);
  const namedSubject=name&&sentence.slice(0,comes?.index??0).trim().replace(/^(?:The|Our)\s+/i,'').normalize('NFKC').toLowerCase()===name.replace(/^(?:The|Our)\s+/i,'').normalize('NFKC').toLowerCase();
  const coffeeSubject=comes&&(!/^comes\b/i.test(comes[0])||namedSubject||/\b(?:coffee|beans?|lots?|microlots?)\b/i.test(sentence.slice(0,comes.index)));
  const candidate=coffeeSubject&&collectiveCredit(comes[1]);
  if(candidate)collectives.set(candidate.normalize('NFKC').toLowerCase(),candidate);
  const offering=sentence.match(/\b(?:this|our)\s+(?:(?:limited|current|seasonal|new)\s+){0,2}(?:coffee|lot|offering)\s+from\s+(?:a |the )?([^.!?;]{3,140}?)(?=\s+(?:is|was|has|will|who|which|that|where)\b|[.!?;]|$)/i);
  const offeringCredit=offering&&collectiveCredit(offering[1]);
  if(offeringCredit)collectives.set(offeringCredit.normalize('NFKC').toLowerCase(),offeringCredit);
  const namedGroup=sentence.match(new RegExp(String.raw`(?:^|[“"(])(`+NAME_WORD+String.raw`(?:\s+(?:`+PARTICLE+String.raw`\s+)?`+NAME_WORD+String.raw`){0,5})(?:[”")]|\s*\([^.!?]{2,100}\))?\s+is\s+(?:an?\s+)?(?:\d+[ -]member\s+)?(?:(?:smallholder\s+farmers?['’]?|female|women|coffee)\s+)*(?:group|association|cooperative)\s+(?:of\s+(?:(?:female|women|smallholder|organic-certified|coffee)\s+)*(?:coffee\s+)?(?:producers|growers|farmers)|working\s+across\b)`,'u'));
  if(namedGroup)collectives.set(namedGroup[1].normalize('NFKC').toLowerCase(),namedGroup[1]);
  const familyProduction=sentence.match(new RegExp('('+NAME_WORD+String.raw`(?:\s+`+NAME_WORD+String.raw`){0,3}\s+family)\s+(?:(?:grow|produce|cultivate)s?\s+coffees?\b|combines\s+[^.!?]{0,150}\bto\s+(?:grow|produce|cultivate)\s+coffees?\b)`,'u'));
  if(familyProduction)collectives.set(familyProduction[1].normalize('NFKC').toLowerCase(),familyProduction[1]);
  // Ongoing family history is a current source credit only when the same
  // sentence first locates the offered coffee's cultivation. A family
  // mentioned as inspiration, history, or "our family" is not a supplier.
  const familyCultivation=sentence.match(new RegExp(String.raw`^(?:(?:[Tt]his|[Oo]ur|[Tt]he)\s+(?:coffee|lot|offering)\s+(?:is|was)\s+)?[Gg]rown\s+(?:on|at|in)\s+([^.!?;]{2,180}?),\s+(?:[Tt]he\s+)?(`+NAME_WORD+String.raw`(?:\s+`+NAME_WORD+String.raw`){0,3}\s+family)\s+(?:has|have)\s+been\s+(?:growing|producing|cultivating)\s+coffees?\b`,'u'));
  if(familyCultivation&&/\b(?:farm|estate|Finca|Hacienda|Fazenda)\b/i.test(familyCultivation[1])&&
   !/^(?:our|my|your|their|his|her|this|that|the|some|one)\b/i.test(familyCultivation[2])&&
   !/\b(?:if|unless|could|would|might|may)\b/i.test(sentence))
   collectives.set(familyCultivation[2].normalize('NFKC').toLowerCase(),familyCultivation[2]);
  const group=sentence.match(/\b((?:(?:approximately|around|over|nearly)\s+)?(?:[\d,]+\s+)?(?:(?:small[ -]?holder|small|local|individual|family[- ]owned)\s+){1,3}(?:farmers?|growers?|producers?|farms?|farm holders))\s+(?:(?:who|that)\s+)?(?:cultivate|grow|produce|deliver|supply|harvest|tender)\b/i);
  if(group)collectives.set(group[1].normalize('NFKC').toLowerCase(),group[1]);
  const supplied=sentence.match(/\b(?:coffee|cherries)\s+from\s+(?:a |the )?(?:network|group|collection)\s+of\s+([^.!?;]{3,140})(?=[.!?;]|$)/i)||
   sentence.match(/\bcoffee\s+is\s+a\s+collection\s+of\s+(?:the efforts of\s+)?([^.!?;]{3,140})(?=[.!?;]|$)/i);
  const sourceGroup=supplied&&collectiveCredit(supplied[1]);
  if(sourceGroup)collectives.set(sourceGroup.normalize('NFKC').toLowerCase(),sourceGroup);
 }
 }
 // Multiple current-lot credits cannot be resolved by their HTML order.
 if(found.size)return found.size===1?[...found.values()][0]:'';
 return collectives.size===1?[...collectives.values()][0]:'';
}
const TECHNIQUE=/\b(?:carbonic maceration|anaerobic fermentation|co[\s-]?ferment(?:ation|ed)?|lactic fermentation|thermal shock|double fermentation|inoculated fermentation)\b/i;
const PRODUCTION=/\b(?:cherries|coffee|beans|ferment(?:ation|ed|ing)?|process(?:ed|ing)?|co2|carbon dioxide|tanks?|washing|washed)\b/i;
function decaffeinationDetail(paragraphs){
 const found=new Map();
 const methods=/\b((?:swiss[ -]+water|mountain[ -]+water)(?:\s+(?:process(?:ed|ing)?|method|decaf))?|sugar[ -]?cane(?:-derived\s+process|\s+(?:ethyl[ -]+acetate\s+)?decaffeination(?:\s+process)?)?|ethyl[ -]+acetate|sugar\s+process)\b/gi;
 for(const paragraph of paragraphs)for(const sentence of sentences(paragraph)){
  if(!factualSentence(sentence))continue;
  for(const match of sentence.matchAll(methods)){
   const before=sentence.slice(0,match.index),after=sentence.slice(match.index+match[0].length);
   const bound=/\b(?:processed|made|decaffeinated)\s+(?:using|with|by|through)\s+(?:the\s+)?$/i.test(before)||
    (/\b(?:this|our|the)\s+(?:(?:specialty|decaf)\s+)?(?:coffee|offering|beans?|lot)\b/i.test(sentence)&&
     /\b(?:is|are|was|were|then|using)\b.{0,100}\bdecaffeinat(?:ed|ion)\b/i.test(sentence))||
    (/^\s*$/.test(before)&&/^\s+leads to\s+(?:an?\s+)?(?:\w+[ -]+){0,5}decaf\s+coffee\b/i.test(after));
   if(!bound)continue;
   // Keep the published name, without inferring EA from a loosely named
   // "sugar process" or a green-coffee category from a decaf treatment.
   const value=match[1],key=value.normalize('NFKC').toLowerCase().replace(/\s+(?:process(?:ed|ing)?|method|decaf)$/i,'');
   if(!found.has(key))found.set(key,value);
  }
 }
 return found.size===1?'Decaffeination: '+[...found.values()][0]:'';
}
function processingDetail(headings,paragraphs){
 // Named processing headings are stronger evidence than incidental prose.
 const heading=headings.find(x=>x.length>5&&x.length<130&&TECHNIQUE.test(x)&&
  factualSentence(x)&&!/\b(?:learn|education|explained|overview)\b/i.test(x));
 if(heading)return heading;
 for(const paragraph of paragraphs)for(const sentence of sentences(paragraph)){
  if(factualSentence(sentence)&&TECHNIQUE.test(sentence)&&PRODUCTION.test(sentence))
   return sentence.trim().slice(0,190);
 }
 const named=new Map();
 for(const paragraph of paragraphs)for(const sentence of sentences(paragraph)){
  if(!factualSentence(sentence))continue;
  const method=sentence.match(/\b(?:[Tt]his|[Oo]ur|[Tt]he current)\s+(?:coffee|lot|beans?)\b[^.!?]{0,180}\bprocessed\s+using\s+(?:the\s+)?((?:traditional\s+)?\p{Lu}[\p{L}\p{M}'’-]{1,35}(?:\s+\p{Lu}[\p{L}\p{M}'’-]{1,35}){0,5}\s+method)\b/u);
  if(method)named.set(method[1].normalize('NFKC').toLowerCase(),method[1]);
 }
 if(named.size===1)return [...named.values()][0];
 return decaffeinationDetail(paragraphs);
}
function locationFromHeadings(headings){
 const found=new Map();
 for(const heading of headings){
  const m=heading.match(LOC_RE);
  if(m&&m[0].length===heading.length)found.set(m[0].toLowerCase(),{farm:m[1],country:m[2]});
 }
 return found.size===1?[...found.values()][0]:null;
}
function explicitFarmOwnership(page,nodes){
 const headings=nodes.filter(node=>/^h[2-6]$/.test(node.tag));
 const found=new Map();
 for(let i=0;i<headings.length;i++){
  const heading=headings[i];
  if(heading.contentEnd-heading.headEnd>1500)continue;
  const title=text(page.slice(heading.headEnd,heading.contentEnd),100).replace(/\s+[+−-](?:\s*[+−-])?\s*$/,'');
  if(!/^(?:sobre la finca|acerca de la finca|about (?:this|the) farm)$/i.test(title))continue;
  const end=Math.min(headings[i+1]?.start??page.length,heading.end+5000);
  const paragraph=text(page.slice(heading.end,end),1500);
  // Literal farm ownership in the selected farm story, including a family
  // attribution. Generic farming explanations and other sections do not count.
  const match=paragraph.match(new RegExp('^('+NAME_WORD+'(?:\\s+'+NAME_WORD+'){0,4})'+
   String.raw`\s+(?:es propiedad de|is owned by)\s+`+PERSON+
   String.raw`((?:\s+y su familia|\s+and (?:his|her|their) family)?)(?=\s*[,.;]|$)`,'u'));
  if(match&&factualSentence(sentences(paragraph)[0]||'')){
   const producer=match[2]+match[3];
   found.set(match[1]+'\0'+producer,{farm:match[1],producer});
  }
 }
 return found.size===1?[...found.values()][0]:null;
}
export function extractNarrativeCoffeeEvidence(html,{name='',fields={}}={}){
 if(typeof html!=='string'||html.length>2_000_000||!name)return {fields:{},details:{}};
 const page=scopedPage(html);
 if(!page)return {fields:{},details:{}};
 const {nodes}=coffeeHtmlElements(page),headings=[],paragraphs=[];
 for(const node of nodes){
  if(node.contentEnd-node.headEnd>16000)continue;
  if(/^h[2-6]$/.test(node.tag)){
   const heading=text(page.slice(node.headEnd,node.contentEnd),250);
   if(heading)headings.push(heading);
  }
 }
 const proseParents=[];
 for(const block of productCoffeeProse(page,text)){
  if(block.educational||/^h[1-6]$/.test(block.tag))continue;
  while(proseParents.length&&proseParents.at(-1).end<=block.start)proseParents.pop();
  // An inline span can begin halfway through a person's name. Its enclosing
  // paragraph already contains that literal claim, so do not read the suffix
  // as a second, independent producer. Separate paragraphs remain independent.
  const parent=proseParents.at(-1);
  if(block.tag==='span'&&parent&&parent.start<block.start&&parent.end>=block.end)continue;
  proseParents.push(block);
  if(!paragraphs.includes(block.text))paragraphs.push(block.text);
 }
 const output={},details={};
 const ownership=explicitFarmOwnership(page,nodes);
 if(ownership){
  details.farm=ownership.farm;details.named_producer=ownership.producer;
  if(!fields.producer)output.producer=ownership.producer;
 }
 const place=locationFromHeadings(headings);
 if(place){
  details.farm=place.farm;
  if(!fields.origin)output.origin=place.country;
  if(!fields.producer&&!output.producer)output.producer=place.farm;
 }
 // Farm and grower are not interchangeable; preserve distinct source facts.
 const namedGrower=foundGrower(paragraphs,name);
 if(namedGrower&&!details.named_producer)details.named_producer=namedGrower;
 if(namedGrower&&!fields.producer&&!output.producer)output.producer=namedGrower;
 if(!fields.producer&&!output.producer){
  const roles=extractCoffeeGeographyEntityRoles(page,{clean:text}).filter(role=>role.explicit_producer_context||/\b(?:coffee|grow|growing|producing|produces|cultivat)\w*\b/i.test(role.quote));
  const named=[...new Map(roles.map(role=>[role.name.normalize('NFKC').toLowerCase(),role.name])).values()];
  if(named.length===1){output.producer=named[0];details.named_producer=named[0];}
 }
 for(const p of paragraphs){
  const farm=p.match(/^(?:Farm|Estate|Finca)\s*[:：-]\s*((?:Finca|Hacienda|Farm|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}'’ -]{2,85})$/iu);
  if(farm&&!details.farm)details.farm=farm[1].slice(0,110);
  // An explicitly named grower's own farm is a separate fact, not an
  // interchangeable producer value. Keep the exact name and source casing.
  if(!details.farm&&namedGrower&&p.includes(namedGrower)&&p.length<=1000){
   const namedFarm=p.match(/\b(?:his|her|their)\s+(?:farm|estate)\s+([A-ZÀ-Ý][\p{L}\p{M}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}\p{M}'’.-]*){0,5})(?=\s+(?:is|was|has|where|in|and|produces|grows)\b|[,!.;]|$)/u);
   if(namedFarm)details.farm=namedFarm[1].slice(0,110);
  }
 }
 const technique=processingDetail(headings,paragraphs);
 const harvestWindows=new Map();
 for(const paragraph of paragraphs)for(const sentence of sentences(paragraph)){
  if(!factualSentence(sentence))continue;
  const harvest=sentence.match(/\b(?:this|the|our)\s+(?:coffee|lot|beans?|cherries)\s+(?:was|were|is|are|has been|have been)\s+harvested\s+(?:between|from|in)\s+([^,.!?;]{3,100})(?=[,.!?;]|$)/i);
  const window=harvest?.[1]?.trim();
  if(window&&isRecurringCoffeeHarvestWindow(window))harvestWindows.set(window.normalize('NFKC').toLowerCase(),window);
 }
 if(harvestWindows.size===1)details.harvest_season=[...harvestWindows.values()][0];
 if(technique){
  details.processing_detail=technique;
  // CO2-rich carbonic maceration is an oxygen-limited treatment. This
  // approximate fixed-category mapping is disclosed alongside source text.
  if(!fields.process&&/\b(?:carbonic maceration|anaerobic fermentation)\b/i.test(technique))
   output.process='Anaerobic';
 }
 if(technique&&paragraphs.some(p=>TECHNIQUE.test(p)&&!GENERAL_CONTEXT.test(p)&&
   sentences(p).some(s=>factualSentence(s)&&/\b(?:before .*?\bwashed\b|then\s+washed\b|washed clean and dried)\b/i.test(s))))
  details.processing_detail=(technique+'; washed finish').slice(0,190);
 if(!fields.variety&&/\b(?:gesha|geisha)\b/i.test(name)&&
    paragraphs.some(p=>sentences(p).some(s=>factualSentence(s)&&
     /\b(?:experimental\s+geishas?|geshas?\s+(?:cultivar|variet)|geishas?\s+(?:cultivar|variet)|queen of variet(?:y|ies))\b/i.test(s))))
  output.variety='Gesha';
 // Narrative altitude is factual only when it carries a physical unit
 // and an explicit coffee-growth context. Generic how-to altitudes excluded.
 if(!fields.elevation_m){
  const found=new Map();
  for(const paragraph of paragraphs)for(const sentence of sentences(paragraph)){
   if(/\b(?:(?:most|much)(?:\s+of)?|the majority of)\s+(?:the\s+)?coffee\b/i.test(sentence)||
     !factualSentence(sentence)||(!/\b(?:this|these|our|the)\s+(?:coffee|lot|crop|beans|cherries)\b/i.test(sentence)&&
     !(name.length>=5&&sentence.toLowerCase().includes(name.toLowerCase()))))continue;
   const re=/\b(?:grown|cultivated|planted)\s+(?:at(?:\s+(?:an?\s+)?(?:altitude|elevation)s?\s+of)?|between)\s+(\d[\d,]{0,7})(?:\s*(?:[-–—]|to|and)\s*(\d[\d,]{0,7}))?\s*(?:meters?|metres?|masl|msnm|m\.a\.s\.l\.|m)(?=\s|[,.;]|$)/gi;
   for(const m of sentence.matchAll(re)){
    const low=Number(m[1].replace(/,/g,'')),high=m[2]?Number(m[2].replace(/,/g,'')):low;
    // Reject impossible numbers and reversed ranges; do not silently repair
    // the merchant's assertion or convert an unrelated numeric statement.
    if(low<=0||high>6000||low>high)continue;
    const value=String(low)+(m[2]?'–'+high:'')+' masl';found.set(value,value);
   }
  }
  if(found.size===1)output.elevation_m=[...found.values()][0];
 }
 return {fields:output,details};
}
