import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {isRecurringCoffeeHarvestWindow} from '../../supabase/functions/_shared/coffee-release-label.mjs';
// Deterministic, evidence-only reading of the SELECTED product's visible text.
// Supplement existing labeled and structured parsers; never create Verified facts.
// No network calls, model invocation, hidden scripts or unrestricted site crawling.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {productCoffeeProse} from './coffee-product-prose.mjs';
import {extractCoffeeGeographyEntityRoles} from './coffee-geography-entity-roles.mjs';
import {literalCoffeeSourcePlaces} from './coffee-identity-evidence.mjs';

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
function productionOperatorCredit(raw){
 // A named operator's alias is part of its credit; its descriptive
 // parenthesis and following location are retained in the source sentence.
 const entity=raw.trim().match(/^(.{3,120}?\b(?:[Cc]ooperative(?:\s+[Ss]ociety)?|[Cc]o-op|[Aa]ssociation)(?:\s+\([A-Z][A-Z\d.&'’ -]{1,24}\))?)(?=\s+\((?:a|an)\s+[^)]{1,120}\)|\s+(?:in|at|near)\s+\p{Lu}|$)/u);
 return collectiveCredit(entity?entity[1]:raw);
}
function currentProducerSentence(value){
 return factualSentence(value)&&!/\b(?:formerly|previously|used to|until|prior to|(?:in|during|before)\s+(?:19|20)\d{2}|if|unless|when|whether|depending|provided|may|might|could|would|should|can)\b/i.test(value);
}
function explicitFarmList(paragraph){
 const lines=producerSentences(paragraph),found=[];
 for(let index=0;index<lines.length-1;index++){
  const introduction=lines[index],line=lines[index+1];
  if(!currentProducerSentence(introduction)||!currentProducerSentence(line))continue;
  const counted=introduction.match(/^(?:your|this|our|the current)\s+coffee\s+is\s+comprised\s+of\s+(two|three|four|five|six|[2-6])\s+(?:different\s+)?farms\b/i);
  const listed=line.match(/^(?:the\s+)?(?:small\s+)?variations?\s+in\s+flavou?r\s+from\s+(?:the\s+)?([^.!?;]{3,220})\s+farms\s+combine\b/i);
  if(!counted||!listed)continue;
  const names=listed[1].split(/\s*,\s*|\s+(?:and|&)\s+/).map(value=>value.replace(/^(?:and|&)\s+/,'').trim()).filter(Boolean);
  const count=({two:2,three:3,four:4,five:5,six:6})[counted[1].toLowerCase()]||Number(counted[1]);
  const literalName=new RegExp('^'+NAME_WORD+'(?:\\s+(?:'+PARTICLE+'\\s+){0,2}'+NAME_WORD+'){0,6}$','u');
  if(names.length!==count||names.some(name=>!literalName.test(name))||
    new Set(names.map(name=>name.normalize('NFKC').toLowerCase())).size!==count)continue;
  found.push({names,value:names.join('; ')});
 }
 return found;
}
function selectedProducerSubject(subject,name){
 const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\d]+/gu,' ').trim();
 const current=normalized(subject);
 if(/^(?:this|our|the current) (?:coffee|lot|offering)$/.test(current))return true;
 const named=current.replace(/^(?:our|the) /,'');
 const selected=normalized(name).replace(/^(?:our|the) /,'');
 return named.split(' ').length>=2&&(named===selected||selected===named+' estate'||selected===named+' farm');
}
function cooperativeAliasCredits(paragraphs){
 const result=new Map(),aliases=new Map();
 const intro=new RegExp(String.raw`\b(?:farmers|growers|producers)\s+have\s+joined\s+together\s+to\s+(?:create|form)\s+the\s+((?:`+NAME_WORD+String.raw`\s+){1,7}(?:Cooperative|Co-op)),\s+(?:better\s+)?known\s+as\s+([A-Z][A-Z\d]{2,30})(?=[.!?;]|\s*$)`,'u');
 // A formation story alone is not a current production credit. The same
 // explicitly defined alias must presently oversee the coffee's production.
 for(const [index,paragraph] of paragraphs.entries()){
  for(const line of producerSentences(paragraph)){
   if(!currentProducerSentence(line))continue;
   const match=line.match(intro);if(!match)continue;
   const names=aliases.get(match[2])||new Set();names.add(match[1]);aliases.set(match[2],names);
   const oversight=new RegExp('^'+match[2]+String.raw`\s+(?:carefully\s+)?(?:supervises|oversees)\s+all\s+phases\s+of\s+(?:the\s+)?coffee\s+production(?:\s+and\s+processing)?\b`,'u');
   let bounded='';
   for(const candidate of paragraphs.slice(index,index+4)){
    if(bounded.length+candidate.length>2400)break;
    bounded+=candidate+' ';
    if(producerSentences(candidate).some(sentence=>currentProducerSentence(sentence)&&oversight.test(sentence)))
     result.set(match[2],match[2]);
   }
  }
 }
 for(const [alias,names] of aliases)if(names.size!==1)result.delete(alias);
 return [...result.values()];
}
function currentProducerParagraphGroups(blocks){
 const groups=[],headings=[],parents=[];let group=[];
 const finish=()=>{if(group.length)groups.push(group);group=[];};
 for(const block of blocks){
  if(/^h[1-6]$/.test(block.tag)){
   finish();parents.length=0;
   const level=Number(block.tag[1]);
   while(headings.length&&headings.at(-1).level>=level)headings.pop();
   if(level===1)headings.length=0;
   else headings.push({level,current:currentProducerSentence(block.text)&&
    !/\b(?:history|historical|previous|prior|past|earlier|former|last|other|another|different)\b|^(?:about the region|regional (?:profile|characteristics))\b/i.test(block.text)});
   continue;
  }
  if(block.educational||headings.some(heading=>!heading.current)){finish();continue;}
  while(parents.length&&parents.at(-1).end<=block.start)parents.pop();
  const parent=parents.at(-1);
  if(block.tag==='span'&&parent&&parent.start<block.start&&parent.end>=block.end)continue;
  parents.push(block);
  if(!group.includes(block.text))group.push(block.text);
 }
 finish();return groups;
}
function producerCountriesAgree(statement,name,fields){
 const countries=value=>literalCoffeeSourcePlaces(value).filter(place=>new RegExp('^(?:'+COUNTRY+')$','i').test(place)).map(producerIdentity);
 const declared=countries(statement);
 // A cleared origin after a real conflict is not positive compatibility.
 // Independent producer statements without a country assertion still stand.
 if(fields.originConflict&&declared.length)return false;
 const selected=countries(fields.origin||'');if(!selected.length)selected.push(...countries(name));
 return !selected.length||declared.every(place=>selected.includes(place));
}
function producerIdentity(value){
 return String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
}
function selectedCooperativeAlias(alias,name){
 const selected=producerIdentity(name).replace(new RegExp('^(?:'+COUNTRY.toLowerCase()+')\\s+','u'),'');
 const literal=producerIdentity(alias);
 return literal.length>=3&&new RegExp('^'+literal+'\\s+(?:cooperative|co op|coop)(?:\\s+(?:washed|natural|honey|anaerobic|coffee)){0,2}$','u').test(selected);
}
function quotedCooperativeCredits(groups,name,fields){
 const definitions=new Map(),current=new Map();
 const fullName=NAME_WORD+String.raw`(?:\s+(?:\p{Ll}{1,3}\s+)?`+NAME_WORD+String.raw`){1,7}`;
 const intro=new RegExp('^('+fullName+String.raw`)\s*\(["“]([^"”]{3,60})["”]\)\s+means\s+["“][^"”]{1,100}["”]\.?(?=\s|$)`,'u');
 for(const paragraphs of groups)for(let index=0;index<paragraphs.length;index++){
  const paragraph=paragraphs[index],match=paragraph.match(intro);
  if(!match||!currentProducerSentence(match[0])||!selectedCooperativeAlias(match[2],name))continue;
  const key=producerIdentity(match[2]),names=definitions.get(key)||new Set();
  names.add(match[1]);definitions.set(key,names);
  const rest=paragraph.slice(match[0].length).trim()||paragraphs[index+1]||'';
  // The immediate named organization, its quoted alias and this current
  // coffee-producing role must agree. A translation or location alone is
  // not a producer credit, and another intervening subject breaks the link.
  const role=producerSentences(rest)[0]||'';
  if(currentProducerSentence(role)&&producerCountriesAgree(role,name,fields)&&/^This\s+Co-?op(?:erative)?\s+is\s+located\s+(?:in|near|at)\s+[^.!?;]{2,150},\s+where\s+they\s+have\s+been\s+(?:producing|growing|cultivating)\s+coffee\b/i.test(role))
   current.set(key,match[1]);
 }
 for(const [key,names] of definitions)if(names.size!==1)current.delete(key);
 return [...current.values()];
}
function selectedStewardshipFarmCredits(paragraphs,name,fields){
 const selected=producerIdentity(name),result=new Set();
 const farm=String.raw`(?:Hacienda|Finca|Fazenda|Farm|Estate)\s+`+NAME_WORD+String.raw`(?:\s+(?:`+PARTICLE+String.raw`\s+){0,2}`+NAME_WORD+String.raw`){0,5}`;
 const stewardship=new RegExp(String.raw`(?:^|,\s+)(`+farm+String.raw`)\s+(?:thrives|operates)\s+under\s+the\s+same\s+stewardship\s+as\s+(`+farm+String.raw`)[.!]?$`,'u');
 const cultivation=/^(?:Grown|Cultivated)\s+(?:between|at)\s+\d[\d,]*(?:\.\d+)?(?:\s*(?:and|to|[-–—])\s*\d[\d,]*(?:\.\d+)?)?\s*(?:meters?|metres?|masl|m)\s+and\s+(?:processed|milled)\s+at\s+the\s+farm['’]s\s+own\s+[^.!?;]{1,100}\bmill,\s+(?:this|our)\s+(?:[a-z][a-z-]*\s+){0,3}(?:coffee|lot|offering)\b/i;
 for(let index=0;index<paragraphs.length;index++){
  const lines=producerSentences(paragraphs[index]);
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){
   const line=lines[lineIndex],match=line.match(stewardship);
   if(!match||!currentProducerSentence(line)||producerIdentity(match[1])!==selected||producerIdentity(match[2])===selected)continue;
   const next=lines[lineIndex+1]||producerSentences(paragraphs[index+1]||'')[0]||'';
   // Only the exact selected farm is admitted. Shared stewardship does not
   // make its sister estate, steward or a third-party mill this producer.
   if(currentProducerSentence(next)&&producerCountriesAgree(line+' '+next,name,fields)&&cultivation.test(next))result.add(match[1]);
  }
 }
 return [...result];
}
function explicitAnonymousProducerCredits(paragraphs,name,fields){
 const result=new Set();
 for(const paragraph of paragraphs)for(const line of producerSentences(paragraph)){
  if(!currentProducerSentence(line)||!producerCountriesAgree(line,name,fields))continue;
  const current=String.raw`^(?:this|our|the current)\s+(?:[\p{L}][\p{L}-]{1,25}\s+){0,3}coffee\s+`;
  const collection=line.match(new RegExp(current+String.raw`comes\s+from\s+[^.!?;]{2,120},\s+a\s+collection\s+from\s+((?:(?:small[ -]?holder|local|independent|family[- ]owned)\s+){1,2}(?:producers|farmers|growers))(?=[.!?;]|$)`,'iu'));
  if(collection)result.add(collection[1]);
  const cooperative=line.match(new RegExp(current+String.raw`is\s+from\s+a\s+(Co-?op(?:erative)?)\s+we\s+have\s+worked\s+with\s+for\s+years(?:,\s+and\s+is\s+(?:in|near)\s+([^,.!?;]{2,130}))?[.!]?$`,'iu'));
  // Preserve the printed unnamed role. Do not invent a cooperative name,
  // geographic qualifier or explanatory parenthesis to match an oracle.
  if(cooperative&&(!cooperative[2]||!/\b(?:and|or|except|rather|instead|also|another|different|but)\b/i.test(cooperative[2])))result.add(cooperative[1]);
 }
 return [...result];
}
function foundGrower(paragraphs,name='',relationshipGroups=[paragraphs],fields={}){
 const found=new Map(),collectives=new Map(),lotCredits=new Map(),farmLists=new Map(),operatorRelations=new Map();
 // These newly linked single-source relationships do not establish a
 // complete supplier list for a selected blend or component narrative.
 if(!/\b(?:blends?|blended|components?)\b/i.test(name+' '+paragraphs.join(' '))){
  for(const credit of quotedCooperativeCredits(relationshipGroups,name,fields))
   collectives.set(credit.normalize('NFKC').toLowerCase(),credit);
  for(const group of relationshipGroups)for(const credit of [...selectedStewardshipFarmCredits(group,name,fields),...explicitAnonymousProducerCredits(group,name,fields)])
   collectives.set(credit.normalize('NFKC').toLowerCase(),credit);
 }
 for(const alias of cooperativeAliasCredits(paragraphs))collectives.set(alias.normalize('NFKC').toLowerCase(),alias);
 for(const paragraph of paragraphs){
  for(const list of explicitFarmList(paragraph))
   farmLists.set(list.names.map(value=>value.normalize('NFKC').toLowerCase()).join('|'),list);
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
   .replace(/\bwithout caffeine\b/gi,'decaffeinated').replace(/\bwithout a featured coffee\b/gi,'awaiting coffee')
   .replace(/\bwithout oxygen\b/gi,'oxygen-free');
  if(!factualSentence(attributionContext)||!/\b(?:coffees?|cherries|producers?|farmers?|growers?|farms?|finca|hacienda|estate|station|mill|grown|produced|produces?|cultivated|cultivates?|harvested|farmed|sourced|collected|brought|comes|has|duo)\b/i.test(sentence))continue;
  // A complete list explicitly credited to this lot outranks a later
  // biographical sentence naming just one of those same people. It never
  // absorbs a third, independently credited producer or a historical list.
  const creditedLot=sentence.match(/\b(two|three|four|five|six|[2-6])\s+(?:primary\s+)?(?:producers|farmers|growers)\s+(?:contributed|contribute|supplied|supply)\s+(?:(?:coffee|cherries)\s+)?(?:to|for)\s+(?:this|our|the current)\s+(?:lot|coffee|offering)\s*[,:\-]\s*([^.!?;]{3,220})[.!]?$/i);
  if(creditedLot&&!/\b(?:formerly|previously|used to)\b/i.test(sentence)){
   const names=creditedLot[2].split(/\s*,\s*|\s+(?:and|&)\s+/).map(value=>value.replace(/^(?:and|&)\s+/,'').trim()).filter(Boolean);
   const count=({two:2,three:3,four:4,five:5,six:6})[creditedLot[1].toLowerCase()]||Number(creditedLot[1]);
   const person=new RegExp('^(?:'+FULL_NAME+')$','u');
   if(names.length===count&&names.every(value=>person.test(value)&&!BAD_PERSON.test(value))){
    const key=names.map(value=>value.normalize('NFKC').toLowerCase()).join('|');
    if(!lotCredits.has(key))lotCredits.set(key,{value:creditedLot[2].trim(),names});
   }
  }
  const currentNewProducer=!/\b(?:formerly|previously|used to|until|(?:in|during|before)\s+(?:19|20)\d{2})\b/i.test(sentence);
  // Keep a qualified farmer group when this exact selected coffee is
  // explicitly sourced from its named factory. A shortened title may omit
  // only a trailing farm/estate role word, never a different named coffee.
  const factorySource=currentProducerSentence(sentence)&&sentence.match(/^(.{3,160}?)\s+(?:comes(?:\s+to\s+us)?|is\s+sourced)\s+from\s+(?:the\s+)?((?:(?:dedicated|smallholder|local|independent)\s+)?farmers\s+of\s+(?:the\s+)?(.{2,100}?\s+Factory))(?=[.!?;]|$)/i);
  if(factorySource&&selectedProducerSubject(factorySource[1],name)&&
    new RegExp('^'+NAME_WORD+'(?:\\s+(?:'+PARTICLE+'\\s+){0,2}'+NAME_WORD+'){0,5}\\s+Factory$','u').test(factorySource[3]))
   collectives.set(factorySource[2].normalize('NFKC').toLowerCase(),factorySource[2]);
  // A named actor handling this coffee's cherries in a tank is an explicit
  // production credit. Oxygen-free processing does not deny that actor.
  const tankOperator=attributionContext.match(new RegExp('\\b'+PERSON+'\\s+sealed\\s+[^.!?;]{0,80}\\bcherries\\s+in\\s+(?:a|the)\\s+(?:sealed\\s+)?tank\\b','u'));
  if(currentNewProducer&&tankOperator&&!BAD_PERSON.test(tankOperator[1]))
   found.set(tankOperator[1].normalize('NFKC').toLowerCase(),tankOperator[1]);
  // The same named subject and pronoun can explicitly state a current
  // coffee-producer role after a short biographical introduction.
  const workingProducer=sentence.match(new RegExp('^'+PERSON+'\\s+has\\s+been\\s+working\\b[^.!?;]{0,100}[–—-]\\s*(?:she|he)[’\\x27]s\\s+[^.!?;]{0,160},\\s+and\\s+(?:most\\s+recently\\s+|now\\s+|also\\s+)?an?\\s+(?:[a-z-]+\\s+){0,2}coffee\\s+producer\\b','u'));
  if(currentNewProducer&&workingProducer&&!BAD_PERSON.test(workingProducer[1]))
   found.set(workingProducer[1].normalize('NFKC').toLowerCase(),workingProducer[1]);
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
  // These describe a named production organization, not an unnamed group
  // inferred from a country. Keep the literal station/co-op attribution.
  if(currentProducerSentence(sentence)&&!/\b(?:other stations?|different stations?)\b/i.test(sentence)){
   const operator=sentence.match(/\b(?:washing stations?|wet mills?|dry mills?)\s+(?:are\s+)?(?:run|operated|managed)\s+by\s+(?:the\s+)?([^.!?;]{3,155}?)(?=,\s|\s+(?:since|which|that)\b|[.!?;]|$)/i);
   const operatorCredit=operator&&productionOperatorCredit(operator[1]);
   if(operatorCredit)collectives.set(operatorCredit.normalize('NFKC').toLowerCase(),operatorCredit);
   const relation=sentence.match(new RegExp('^('+NAME_WORD+'(?:\\s+(?:'+PARTICLE+'\\s+){0,2}'+NAME_WORD+'){0,5})\\s+is\\s+one\\s+of\\s+(?:two|three|four|five|six|seven|eight|nine|[2-9])\\s+(washing stations|wet mills|dry mills)\\s+(?:run|operated|managed)\\s+by\\s+(?:the\\s+)?([^.!?;]{3,155})(?=[.!?;]|$)','u'));
   const relationOperator=relation&&productionOperatorCredit(relation[3]);
   const titleWords=value=>' '+String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\d]+/gu,' ').trim()+' ';
   if(relationOperator&&titleWords(name).includes(titleWords(relation[1]))){
    const stationCredit=relation[1]+' '+relation[2].replace(/s$/,'');
    const value=stationCredit+'; '+relationOperator;
    operatorRelations.set(value.normalize('NFKC').toLowerCase(),{value,parts:[stationCredit,relationOperator]});
   }
   const station=sentence.match(new RegExp('^('+FULL_NAME+')(?:,\\s*(?:located|situated)\\s+in\\s+[^,.!?;]{2,100},)?\\s+is\\s+an?\\s+(washing station|wet mill|dry mill)\\b','u'));
   if(station){
    const value=station[1]+' '+station[2];
    collectives.set(value.normalize('NFKC').toLowerCase(),value);
   }
  }
  // Certification parentheses qualify the growers, not a different entity.
  // Keep the source sentence intact and read only this role's comparison view.
  const associationSentence=currentNewProducer?sentence.replace(/\s*\((?:and\s+)?[^()]{1,80}\bcertified\)\s*/gi,' '):sentence;
  const namedGroup=associationSentence.match(new RegExp(String.raw`(?:^|[“"(])(`+NAME_WORD+String.raw`(?:\s+(?:`+PARTICLE+String.raw`\s+)?`+NAME_WORD+String.raw`){0,5})(?:[”")]|\s*\([^.!?]{2,100}\))?\s+is\s+(?:an?\s+)?(?:\d+[ -]member\s+)?(?:(?:smallholder\s+farmers?['’]?|female|women|coffee)\s+)*(?:group|association|cooperative)\s+(?:of\s+(?:(?:female|women|smallholder|organic-certified|coffee)\s+)*(?:coffee\s+)?(?:producers|growers|farmers)|working\s+across\b)`,'u'));
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
  const workingFarms=sentence.match(/\b((?:(?:small|family[- ]owned|family|local|individual|independent)\s+){1,3}farms?)\s+work\s+[^.!?;]{1,90}?\band\s+(?:grow|produce|cultivate)\s+coffee\b/i);
  if(currentNewProducer&&workingFarms)collectives.set(workingFarms[1].normalize('NFKC').toLowerCase(),workingFarms[1]);
  const supplied=sentence.match(/\b(?:coffee|cherries)\s+from\s+(?:a |the )?(?:network|group|collection)\s+of\s+([^.!?;]{3,140})(?=[.!?;]|$)/i)||
   sentence.match(/\bcoffee\s+is\s+a\s+collection\s+of\s+(?:the efforts of\s+)?([^.!?;]{3,140})(?=[.!?;]|$)/i);
  const sourceGroup=supplied&&collectiveCredit(supplied[1]);
  if(sourceGroup)collectives.set(sourceGroup.normalize('NFKC').toLowerCase(),sourceGroup);
 }
 }
 // Repeated biographies may mention a member of one explicitly enumerated
 // current-lot list. Only exact list membership reconciles those subsets.
 if(lotCredits.size){
  if(lotCredits.size!==1)return '';
  const credit=[...lotCredits.values()][0],names=new Set(credit.names.map(value=>value.normalize('NFKC').toLowerCase()));
  const compatible=[...found.values()].every(value=>value.split(/\s*,\s*|\s+(?:and|&)\s+/).every(part=>names.has(part.trim().normalize('NFKC').toLowerCase())));
  return compatible?credit.value:'';
 }
 // Multiple current-lot credits cannot be resolved by their HTML order.
 if(found.size)return found.size===1?[...found.values()][0]:'';
 if(farmLists.size){
  if(farmLists.size!==1)return '';
  const list=[...farmLists.values()][0],members=new Set(list.names.map(value=>value.normalize('NFKC').toLowerCase()));
  if([...collectives.keys()].some(value=>!members.has(value)))return '';
  return list.value;
 }
 if(operatorRelations.size){
  if(operatorRelations.size!==1)return '';
  const relation=[...operatorRelations.values()][0],parts=new Set(relation.parts.map(value=>value.normalize('NFKC').toLowerCase()));
  if([...collectives.keys()].some(value=>!parts.has(value)))return '';
  return relation.value;
 }
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
// A selected coffee can be named after a farmer-founded producing association.
// Require the organization's literal acronym in BOTH the selected coffee name
// and a selected-product sentence identifying the founding coffee farmers.
// Historical generic cooperative descriptions and off-product aliases cannot
// confer producer identity on a different coffee.
export function selectedFoundedFarmerOrganization(paragraphs,name){
 if(!Array.isArray(paragraphs)||typeof name!=='string'||name.length>220)return '';
 const named=new Set((name.match(/\b[A-Z][A-Z0-9-]{2,14}\b/g)||[]));
 const found=new Set();
 for(const paragraph of paragraphs.slice(0,90)){
  if(typeof paragraph!=='string'||paragraph.length>1600)continue;
  for(const sentence of sentences(paragraph)){
   if(!factualSentence(sentence))continue;
   const match=sentence.match(/\b(?:\d{1,4}\s+)?(?:[\p{L}-]+\s+){0,4}coffee\s+farmers\s+joined\s+together\b[^.!?]{0,240}\bformed\s+([A-Z][A-Z0-9-]{2,14})(?=\s*\(|\s*[,.;]|\s+which\b|\s+to\b|$)/iu);
   if(match&&named.has(match[1]))found.add(match[1]);
  }
 }
 return found.size===1?[...found][0]:'';
}

export function extractNarrativeCoffeeEvidence(html,{name='',fields={},origin=fields.origin||'',originConflict=false}={}){
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
 const proseParents=[],proseBlocks=productCoffeeProse(page,text);
 for(const block of proseBlocks){
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
 const relationshipGroups=currentProducerParagraphGroups(proseBlocks);
 const producerContext={origin,originConflict};
 const namedGrower=foundGrower(paragraphs,name,relationshipGroups,producerContext);
 const foundedOrganization=selectedFoundedFarmerOrganization(paragraphs,name);
 if(foundedOrganization&&!fields.producer&&!output.producer){
  output.producer=foundedOrganization;details.named_producer=foundedOrganization;
 }

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
 // A named CURRENT lot with directly published depulping, fermentation and
 // subsequent washing is Washed green-coffee processing, not just a method name.
 const story=paragraphs.join(' ').slice(0,12000);
 const currentLot=/\bthis lot\b[^.!?]{0,170}\bprocessed using\b[^.!?]{0,130}\btraditional\b[^.!?]{0,90}\bmethod\b/i.test(story);
 const complete=/\beach day['’]s coffee is pulped\b[^.!?]{0,230}\bfermented together\b[^.!?]{0,100}\bthen washed together\b/i.test(story);
 if(!fields.process&&!output.process&&currentLot&&complete){
  output.process='Washed';
  details.processing_detail=(String(technique||'Traditional named selected-lot method')+'; depulped, fermented together, then washed').slice(0,190);
 }
 // A named facility matching the current coffee is evidence of the current
 // processing only when all three stages are explicitly documented.
 if(!fields.process&&!output.process){
  const facility=story.match(/\b([\p{Lu}][\p{L}\p{M}'’-]{3,40}) Coffee Factory\b/u);
  const named=facility&&name.toLocaleLowerCase().includes(facility[1].toLocaleLowerCase());
  const wet=/\bcherries are delivered\b[^.!?]{0,250}\bde.pulping and (?:the )?wet fermentation process\b/i.test(story);
  const dried=/\bonce the process is complete\b[^.!?]{0,190}\bthe coffee is laid to dry\b/i.test(story);
  if(named&&wet&&dried){
   output.process='Washed';
   if(!details.processing_detail)details.processing_detail='Named selected factory: depulping, wet fermentation and drying';
  }
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
 const literalAnonymousProducer=output.producer===namedGrower&&/^Co-?op(?:erative)?$/i.test(namedGrower)&&
  !/\b(?:blends?|blended|components?)\b/i.test(name+' '+paragraphs.join(' '))&&
  relationshipGroups.some(group=>explicitAnonymousProducerCredits(group,name,producerContext).includes(namedGrower))?namedGrower:'';
 return {fields:output,details,...(literalAnonymousProducer?{literal_anonymous_producer:literalAnonymousProducer}:{})};
}
