// Selected-product blend facts, from explicit percentage-labeled components.
// Keep real multi-origin / multi-producer values, never invent one origin or
// attribute an unlabeled lot/station name to a producer.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {explicitCoffeeVarietyList,literalCoffeeSourcePlaces} from './coffee-identity-evidence.mjs';
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';

const COUNTRIES=/\b(Papua New Guinea|Democratic Republic of the Congo|Dominican Republic|United States|Costa Rica|El Salvador|East Timor|Timor-Leste|Puerto Rico|DR Congo|Ethiopia|Colombia|Peru|Panama|Brazil|Guatemala|Kenya|Honduras|Mexico|Rwanda|Nicaragua|Uganda|Indonesia|Burundi|Ecuador|Bolivia|Yemen|India|Tanzania|Thailand|Vietnam|China|Taiwan|Laos|Myanmar|Venezuela|Philippines|Malawi|Zambia|Nepal|Australia|Cuba|Haiti|Jamaica|Cameroon)\b/gi;
const METHODS=/\b(Washed|Natural|Honey|Anaerobic)\b/gi;
const key=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const pretty=s=>s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
function unique(values){
 const seen=new Set(),out=[];
 for(const raw of values){
  const value=String(raw||'').trim(),k=key(value);
  if(value&&!seen.has(k)){seen.add(k);out.push(value);}
 }
 return out;
}
function clean(s){
 return String(s||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/&amp;/gi,'&')
  .replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
}
function producersInComponent(description){
 // A station/lot with a vague human-looking name is NOT necessarily
 // a producer. Only positively identified farms/producer captions count.
 const candidates=[];
 const named=description.match(/\b(?:Producer|Grower|Farmer|Farm|Co-?op|Cooperative)\s*:\s*([^;|]+?)(?=\s+[-–]\s+(?:Washed|Natural|Honey|Anaerobic)\b|$)/i);
 if(named)candidates.push(named[1].trim());
 // A clearly named farm is a sourced producer entity even without a key.
 for(const p of description.split(/\s+[-–|]\s+/)){
  if(/^(?:Finca|Hacienda|Estate|Farm)\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,5}$/iu.test(p))
   candidates.push(p);
 }
 return unique(candidates.map(x=>x.slice(0,120)).filter(x=>x.length>=3));
}

const COMPONENT_LABEL=/^(Country(?: of Origin)?|Region|Department|Province|Producer|Farmer|Farm|Mill|Co-?op|Cooperative|Cultivar(?:s)?|Variet(?:y|ies|al|als)|Process(?:ing)?(?: Method)?|Elevation|Altitude)\s*[:：]\s*(.{2,240})$/i;
const NEXT_LABEL=/\b(?:Country|Region|Department|Province|Producer|Farmer|Farm|Mill|Cooperative|Cultivar|Variety|Process|Elevation|Altitude)\s*:/i;
const ROW_TAGS=new Set(['p','li','div','span','em','strong','b','td','dd']);
function componentKind(label){
 if(/^country/i.test(label))return 'country';
 if(/^(?:region|department|province)$/i.test(label))return 'region';
 if(/^(?:producer|farmer|farm|mill|co-?op|cooperative)$/i.test(label))return 'producer';
 if(/^(?:cultivar|variet)/i.test(label))return 'variety';
 if(/^process/i.test(label))return 'process';
 return 'elevation';
}
function methodIn(value){
 const text=key(value);
 if(/\b(?:wet[ -]hulled|semi[ -]washed)\b/.test(text))return 'Other/Unknown';
 if(/\bpulped[ -]natural\b/.test(text))return 'Honey';
 const single=text.replace(/\b(?:anaerobic[ -]+natural|natural[ -]+anaerobic)\b/g,'anaerobic');
 const values=unique([...single.matchAll(METHODS)].map(match=>pretty(match[1])));
 return values.length>1?'Other/Unknown':values[0]||'';
}
function componentRows(page){
 const rows=[];
 // Schema Product descriptions often flatten BR-separated captions into
 // plain text, including "MexicoFarm:" without an intervening space.
 // Only a line beginning with a recognized caption enters this reader.
 if(!/<[A-Za-z][^>]*>/.test(page)){
  const label=/((?:Country(?: of Origin)?|Region|Department|Province|Producer|Farmer|Farm|Mill|Co-?op|Cooperative|Cultivar(?:s)?|Variet(?:y|ies|al|als)|Process(?:ing)?(?: Method)?|Elevation|Altitude))\s*[:：]\s*/gi;
  let cursor=0;
  for(const line of page.split(/\r?\n/)){
   if(line.length<=4500&&/^\s*(?:Country|Region|Department|Province|Producer|Farmer|Farm|Mill|Co-?op|Cooperative|Cultivar|Variet|Process|Elevation|Altitude)[^:：]{0,20}[:：]/i.test(line)){
    const matches=[...line.matchAll(label)];
    for(const [index,match] of matches.entries()){
     const end=matches[index+1]?.index??line.length,value=clean(line.slice(match.index+match[0].length,end));
     if(value.length>=2&&value.length<=240)rows.push({start:cursor+match.index,end:cursor+end,label:match[1],value,kind:componentKind(match[1])});
    }
   }
   cursor+=line.length+(page.slice(cursor+line.length,cursor+line.length+2)==='\r\n'?2:1);
   if(rows.length>=300)break;
  }
  return rows.slice(0,150);
 }
 scan:for(const node of coffeeHtmlElements(page).nodes){
  if(!ROW_TAGS.has(node.tag)||node.contentEnd-node.headEnd>5000)continue;
  const body=page.slice(node.headEnd,node.contentEnd);
  // Inspect one literal row, never flatten a containing product description.
  if(/<(?:p|div|li|table|ul|h[1-6])\b/i.test(body))continue;
  let cursor=node.headEnd;
  const breaks=[...body.matchAll(/<br\s*\/?>/gi)];
  for(const boundary of [...breaks.map(match=>({start:node.headEnd+match.index,end:node.headEnd+match.index+match[0].length})),{start:node.contentEnd,end:node.contentEnd}]){
   const raw=page.slice(cursor,boundary.start),text=clean(raw),match=COMPONENT_LABEL.exec(text);
   if(match&&!NEXT_LABEL.test(match[2]))rows.push({start:cursor,end:boundary.start,label:match[1],value:match[2].trim(),kind:componentKind(match[1])});
   cursor=boundary.end;
   if(rows.length>=300)break scan;
  }
 }
 // Inline wrappers produce duplicate row candidates. Retain only their
 // innermost complete text range, while keeping every repeated component.
 rows.sort((a,b)=>a.start-b.start||a.end-b.end);
 return rows.filter((row,index)=>!rows.some((other,j)=>j!==index&&other.start>=row.start&&other.end<=row.end&&
  (other.start>row.start||other.end<row.end)&&other.kind===row.kind&&key(other.value)===key(row.value)))
  .filter((row,index,all)=>!index||row.start!==all[index-1].start||row.end!==all[index-1].end).slice(0,150);
}
function summarizeComponents(components,ranges,format){
 const origins=unique(components.flatMap(component=>component.countries||[]));
 const producers=unique(components.flatMap(component=>component.producers||[]));
 const varieties=unique(components.flatMap(component=>component.varieties||[]));
 const methods=components.map(component=>unique((component.methods||[]).map(methodIn).filter(Boolean)));
 const processes=unique(methods.flat());
 const completeProcess=methods.every(values=>values.length===1);
 return {
  display:components.map(component=>component.description).join('; ').slice(0,1200),
  origins,producers,processes,varieties,
  origin:components.some(component=>component.regions?.length)?unique(components.map(component=>[...(component.regions||[]),...(component.countries||[])].join(', '))).join('; '):origins.join(', '),
  multi_country:origins.length>1,multi_producer:producers.length>1,multi_process:processes.length>1,
  complete_process:completeProcess&&processes.length===1,
  all_component_processes:completeProcess,
  complete_producers:components.every(component=>component.producers?.length),
  complete_varieties:components.every(component=>component.varieties?.length),
  components:components.length,component_ranges:ranges,component_format:format
 };
}

// Refine ONLY an explicitly named current component's farm region. A blend's
// independently labelled Country rows prove the component identity; a mill or
// producer's nearby address, other coffees, old lots or album releases do not.
// The source must state both "coffee from [growers] in COUNTRY" and "beans
// that come from several farms in the REGION region" in ONE current sentence.
function selectedComponentFarmRegion(blend,page){
 if(!blend||blend.component_format!=='labeled'||blend.components<2||
    !blend.multi_country||!blend.origin)return blend;
 const place=String.raw`([\p{Lu}][\p{L}\p{M}'’.-]{2,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{2,40}){0,3})`;
 const component=new RegExp(
  String.raw`\bcoffee\s+from\s+(?:the\s+)?[\p{Lu}][\p{L}\p{M}'’.-]{1,40}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{1,40}){0,3}\s+(?:family|farmers?|growers?|cooperative)\s+in\s+`+
  COUNTRIES.source+
  String.raw`\s*,\s*a\s+blend\s+of\s+[^.!?]{0,150}?\bbeans?\s+that\s+come\s+from\s+several\s+farms\s+in\s+the\s+`+
  place+String.raw`\s+region\b`,'iu');
 const matches=[];
 for(const block of productCoffeeProse(page,clean)){
  if(block.educational||/^h[1-6]$/.test(block.tag))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/).slice(0,45)){
   if(sentence.length>1200||NONCURRENT_COFFEE_PROSE.test(sentence)||
      /\b(?:previously|formerly|historically|hypothetically|hypothetical|last year|prior lot|used to|other coffee|another coffee|related coffee)\b/i.test(sentence))continue;
   const found=component.exec(sentence);
   // The same selected sentence can be emitted by nested inline wrappers.
   // De-duplicate byte-equivalent normalized claims, but keep genuinely
   // different claims separate so contradictory regions still fail closed.
   if(found&&!matches.some(value=>key(value.quote)===key(found[0])))
    matches.push({country:found[1],region:found[2],quote:found[0]});
  }
 }
 if(matches.length!==1)return blend;
 const {country,region}=matches[0];
 if(!country||!region||region.length>90||/\b(?:coffee|blend|roast|product|catalog)\b/i.test(region))return blend;
 const originals=blend.origin.split(/\s*;\s*/);
 const slots=originals.map((value,index)=>key(value)===key(country)?index:-1).filter(index=>index>=0);
 if(slots.length!==1||!blend.origins.some(value=>key(value)===key(country)))return blend;
 originals[slots[0]]=region+', '+country;
 return {...blend,origin:originals.join('; ')};
}

function labeledComponents(page,name){
 const rows=componentRows(page);
 for(let start=0;start<rows.length;start++){
  if(rows[start].kind!=='country')continue;
  const intro=clean(page.slice(Math.max(0,rows[start].start-12000),rows[start].start));
  if(!/\b(?:blend|components?|composition)\b/i.test(name+' '+intro)||/\b(?:not a blend|single origin only)\b/i.test(intro.slice(-300)))continue;
  const group=[];let previous=null;
  for(let index=start;index<rows.length;index++){
   const row=rows[index];
   if(previous&&clean(page.slice(previous.end,row.start)).length>100)break;
   if(previous&&/<h[1-6]\b/i.test(page.slice(previous.end,row.start)))break;
   group.push(row);previous=row;
   if(group.length>64)break;
  }
  const components=[];
  for(const row of group){
   if(row.kind==='country')components.push({rows:[],countries:[],regions:[],producers:[],varieties:[],methods:[]});
   const component=components.at(-1);if(!component)break;
   component.rows.push(row);
   if(row.kind==='country'){
    const countries=[...row.value.matchAll(COUNTRIES)];
    if(countries.length!==1||key(countries[0][0])!==key(row.value)){component.invalid=true;continue;}
    component.countries.push(row.value);
   }else if(row.kind==='region')component.regions.push(row.value);
   else if(row.kind==='producer')component.producers.push(row.value);
   else if(row.kind==='variety')component.varieties.push(row.value);
   else if(row.kind==='process')component.methods.push(row.value);
  }
  if(components.length<2||components.length>8||components.some(component=>component.invalid||
    new Set(component.rows.map(row=>row.kind)).size<3))continue;
  // Contradictory repeated labels inside one component are still ambiguous.
  if(components.some(component=>['country','variety','process'].some(kind=>
    unique(component.rows.filter(row=>row.kind===kind).map(row=>row.value)).length>1)))continue;
  for(const component of components)component.description=component.rows.map(row=>row.label+': '+row.value).join('; ');
  return summarizeComponents(components,group.map(row=>[row.start,row.end]),'labeled');
 }
 return null;
}
function enumeratedComponents(page){
 // A complete visible list can identify components without percentages:
 // "Guatemala ... (Washed Process), Colombia ... (Natural Process), and ...".
 // Each entry needs its own literal country and explicit process caption.
 for(const node of coffeeHtmlElements(page).nodes){
  if(!['p','h2','h3','h4','li','div','span'].includes(node.tag)||node.contentEnd-node.headEnd>4500)continue;
  const body=page.slice(node.headEnd,node.contentEnd);
  if(/<(?:p|div|li|h[1-6]|table|ul)\b/i.test(body))continue;
  const text=clean(body);if(text.length>900||text.length<30)continue;
  const parts=text.split(/\)\s*,?\s*(?:and\s+)?(?=[A-Z])/).map(value=>value.trim().replace(/\)?\s*$/,'')+')');
  if(parts.length<2||parts.length>8)continue;
  const components=[];
  for(const part of parts){
   const match=part.match(/^(.{3,160}?)\s*\(([^()]{3,80}\bProcess)\)$/i);
   if(!match||/\b(?:not|except|formerly|previous|example)\b/i.test(part)){components.length=0;break;}
   const countries=[...match[1].matchAll(COUNTRIES)];
   if(countries.length!==1||countries[0].index!==0||!methodIn(match[2])){components.length=0;break;}
   components.push({description:part,countries:[countries[0][1]],methods:[match[2]],producers:[],varieties:[]});
  }
  if(components.length>=2)return summarizeComponents(components,[[node.headEnd,node.contentEnd]],'enumerated');
 }
 return null;
}
function percentageProseComponents(page){
 for(const node of coffeeHtmlElements(page).nodes){
  if(!['p','li','div'].includes(node.tag)||node.contentEnd-node.headEnd>5000)continue;
  const raw=page.slice(node.headEnd,node.contentEnd);
  if(/<(?:p|div|li|table|ul|h[1-6])\b/i.test(raw))continue;
  const text=clean(raw);if(text.length>2400)continue;
  for(const sentence of text.split(/(?<=[.!?])\s+/).slice(0,12)){
   if(/\b(?:not|never|previous|formerly|example|other coffee|usually|typically)\b/i.test(sentence))continue;
   const composition=sentence.match(/\b(?:is made up of|is composed of|consists of|is a blend of)\s+(?:a\s+)?(.{15,1000}?)\.?$/i);
   if(!composition)continue;
   const parts=composition[1].split(/\s*(?:,\s*(?:and\s+)?|and\s+|\+\s+)(?=\d{1,3}\s*%)/i);
   if(parts.length<2||parts.length>8)continue;
   const components=[];
   for(const part of parts){
    const match=part.match(/^(\d{1,3})\s*%\s+(naturally|natural|washed|honey|anaerobic(?:[ -]+natural)?)\s+processed\s+(.{2,120}?)\s+(?:cherries|variet(?:y|ies|als))$/i);
    if(!match||Number(match[1])<=0||Number(match[1])>100||!explicitCoffeeVarietyList(match[3])){components.length=0;break;}
    components.push({percentage:Number(match[1]),description:part,countries:[],producers:[],varieties:[match[3]],methods:[match[2].replace(/^naturally$/i,'Natural')]});
   }
   const sum=components.reduce((total,component)=>total+component.percentage,0);
   if(components.length>=2&&sum>=99&&sum<=101)return summarizeComponents(components,[],'percentage_prose');
  }
 }
 return null;
}
function narrativeComposition(page,name){
 const blocks=productCoffeeProse(page,clean).filter(block=>!block.educational&&!/^h[1-6]$/.test(block.tag));
 const blendNamed=/\bblend\b/i.test(name),origins=[],methods=[],quotes=[];
 let wholeProcess=false,explicitMixture=false,wholeOrigins=false,incompleteOrigins=false;
 for(const block of blocks){
  const distinctExpressions=/\b(?:bringing|brings|bring)\s+together\s+(?:two|three|four|five|six|[2-6])\s+distinct\s+(?:expressions|process(?:es|ing methods))\b/i.test(block.text);
  const context=blendNamed||distinctExpressions||/\b(?:(?:this|our|the|a)\s+(?:(?:coffee|espresso)\s+)?(?:blend|mixture|fusion|combination)|(?:hand\s+)?blended|blending|components?)\b/i.test(block.text);
  for(const sentence of block.text.split(/(?<=[.!?])\s+/).slice(0,60)){
   if(sentence.length>1800||NONCURRENT_COFFEE_PROSE.test(sentence.replace(/\bnot only\b/gi,''))||
      /\b(?:history|historical|visited|roasting style|coffee culture|border with|border of|genetics?|originally collected|variety was collected|variet(?:y|ies) (?:is|are|being) grown|first planted|first introduced)\b/i.test(sentence))continue;
   // Exclude a named comparison coffee before the actual blending clause.
   // "match the profile of our Colombia decaf by blending ..." does not
   // make Colombia a component of the new coffee.
   const composition=/\bmatch\b.{0,110}\b(?:flavou?r profile|character|style)\b.{0,200}\bby blending\b/i.test(sentence)?
    sentence.slice(sentence.toLowerCase().indexOf('by blending')):sentence;
   const sourced=/\b(?:coffees?|beans?|origins?|components?)\s+(?:(?:is|are|was|were|sourced|grown|selected|chosen|drawn|coming|come|comes)\s+){0,4}(?:from|of|with)\b/i.test(composition)||
    /\b(?:blend|fusion|mixture|combination)\s+(?:(?:is|are|currently|made|up|composed|comprised)\s+){0,5}(?:from|of|with|contains?|includes?)\b/i.test(composition)||
    /\b(?:combine[sd]?|blends?|blended)\b.{0,150}\b(?:coffees?|beans?|favorites)\b/i.test(composition);
   // A named pair can mention a country for only one component. A later
   // "cup of coffee" does not prove the other component's growing origin.
   const namedPair=composition.match(/^(?:Our|The)\s+(.{2,250}?)\s+and\s+(?:our|the)\s+(.{2,250}?)\s+coffees\s+are\s+(?:hand\s+)?blended\s+together\b/i);
   const partialNamedPair=!!namedPair&&[namedPair[1],namedPair[2]].some(part=>!literalCoffeeSourcePlaces(part).length);
   incompleteOrigins||=partialNamedPair;
   const completeOrigin=!partialNamedPair&&(/\b(?:blend|fusion|mixture|combination)\s+(?:(?:is|are|currently|made|up|composed|comprised)\s+){0,5}(?:from|of|with|contains?|includes?)\b/i.test(composition)||
    /\b(?:combine[sd]?|blends?|blended)\b.{0,150}\b(?:coffees?|beans?|favorites)\b/i.test(composition));
   const currentBase=context&&/\b(?:this season['’]s|current|our|the)\s+(?:base|component)\b.{0,120}\bfrom\b/i.test(composition);
   const combined=context&&/\b(?:layered|combined|blended|blending)\b/i.test(composition);
   const logisticsLocation=/\b(?:ships?|shipped|shipping)\b.{0,90}\bfrom\b|\b(?:roasted|roasting|packaged|packed|manufactured)\s+(?:in|at)\b/i.test(composition)&&
    !/\b(?:grown|growing|cultivated|sourced|growing origins?)\b/i.test(composition);
   const places=!logisticsLocation&&(sourced||combined||currentBase)?literalCoffeeSourcePlaces(composition):[];
   // The source must actually describe the current composition. A country
   // merely mentioned in a farm's history is not another component.
   if(places.length&&(context||places.length>=2)&&(sourced||combined||currentBase)){
    origins.push(...places);quotes.push(sentence);
    wholeOrigins||=completeOrigin||(!partialNamedPair&&(sourced||combined)&&places.length>1&&!/\b(?:component|base)\b/i.test(composition));
   }
   const blendMethods=context&&(distinctExpressions||/\b(?:blend|blended|mixture|components?|individual tracks)\b/i.test(block.text));
   if(!blendMethods)continue;
   const treatment=/\b(anaerobic[ -]+(?:natural|washed|honey)|(?:natural|washed|honey)[ -]+anaerobic|pulped[ -]+natural|fully[ -]+washed|wet[ -]+process(?:ed|ing)?|dry[ -]+process(?:ed|ing)?|naturally|washed|natural|honey|anaerobic)\b/gi;
   const mixture=sentence.match(/\b(?:blend|mixture|mix)\s+(?:(?:is|are|currently|made|up|composed|comprised)\s+){0,5}of\s+([^.!?]{3,240}?)(?:\s+(?:process(?:ed|ing)?\s+)?(?:coffees?|beans?)|[.!?]|$)/i);
   if(mixture){
    const values=unique([...mixture[1].matchAll(treatment)].map(match=>methodIn(match[1].replace(/^naturally$/i,'Natural'))).filter(Boolean));
    if(values.length){methods.push(...values);wholeProcess=true;explicitMixture||=values.length>1;quotes.push(sentence);}
   }
   for(const match of sentence.matchAll(treatment)){
    const after=sentence.slice(match.index+match[0].length);
    if(!/^(?:wet|dry)[ -]+process(?:ed|ing)?$/i.test(match[1])&&
       !/^\s+(?:process(?:ed|ing)?|carbonic maceration|coffee|coffees|beans?|Ethiopia|Brazil|Colombia|Guatemala|Sumatra)\b/i.test(after))continue;
    const value=methodIn(match[1].replace(/^dry[ -]+process(?:ed|ing)?$/i,'Natural').replace(/^wet[ -]+process(?:ed|ing)?$/i,'Washed').replace(/^naturally$/i,'Natural'));
    if(value){methods.push(value);quotes.push(sentence);}
   }
  }
 }
 const places=unique(origins),processes=unique(methods),multiProcess=processes.length>1;
 if(!places.length&&!multiProcess&&!wholeProcess)return null;
 return {display:unique(quotes).join(' | ').slice(0,1200),origins:places,origin:places.join(', '),
  producers:[],varieties:[],processes,multi_country:places.length>1,multi_producer:false,
  multi_process:multiProcess,complete_process:wholeProcess&&processes.length===1,
  all_component_processes:wholeProcess||explicitMixture||multiProcess,
  incomplete_component_process:!wholeProcess&&places.length>1&&!multiProcess,
  complete_producers:false,complete_varieties:false,complete_origins:wholeOrigins,incomplete_component_origins:incompleteOrigins,component_format:'narrative'};
}
/**
 * A selected blend's current first component can have a named process while
 * its expressly different partner has no process. Never infer whole-blend
 * processing from only the first component, related products or old SEO.
 */
export function selectedPartialBlendProcess(html,{name='',process='',decode=clean}={}){
 if(typeof html!=='string'||!name||!['Natural','Washed','Honey','Anaerobic'].includes(process)||
    typeof decode!=='function'||html.length>2_000_000)return null;
 const blocks=productCoffeeProse(html,decode);
 const headings=[...new Set(blocks.filter(block=>block.tag==='h1'&&!block.educational).map(block=>block.text))];
 if(headings.length!==1||key(headings[0])!==key(name))return null;
 const allText=blocks.filter(block=>!block.educational).map(block=>block.text).join(' ');
 const method=new RegExp('\\b'+process+'\\b','i');
 const global=new RegExp('\\b(?:this|our|the)\\s+blend\\s+(?:(?:is|was)\\s+)?(?:fully\\s+)?'+process+'\\s+processed\\b','i');
 const both=new RegExp('\\b(?:both|all|each)\\s+(?:(?:of|the|our|its)\\s+)?(?:two\\s+)?(?:blend\\s+)?(?:components?|coffees?|lots?)\\s+(?:are|is|were)\\s+(?:fully\\s+)?'+process+'\\s+processed\\b','i');
 if(global.test(allText)||both.test(allText))return null;
 for(const block of blocks){
  if(block.educational||!['p','li','div'].includes(block.tag)||block.text.length>1500||
     NONCURRENT_COFFEE_PROSE.test(block.text))continue;
  const match=block.text.match(/\b(?:this|our|the)\s+blend\s+(?:features|includes)\s+([^.!?]{10,280}?),\s+and\s+pairs\s+it\s+with\s+((?:an?|the)\s+[^.!?]{8,160}?\bcoffee\s+from\s+[^.!?]{3,70})(?=[.!?]|$)/i);
  if(!match||!method.test(match[1])||
     /\b(?:processed|processing|process|natural|washed|honey|anaerobic)\b/i.test(match[2]))continue;
  return {method:process,component:match[1].trim().slice(0,230),
    unverified_partner:match[2].trim().slice(0,160)};
 }
 return null;
}

export function withoutCoffeeBlendComponentSpecs(html,blend){
 if(!blend?.component_ranges?.length)return html;
 const ranges=blend.component_ranges.filter(range=>Array.isArray(range)&&range.length===2&&range[0]>=0&&range[1]<=html.length&&range[1]>range[0]).sort((a,b)=>a[0]-b[0]);
 const pieces=[];let cursor=0;
 for(const [start,end] of ranges){if(end<=cursor)continue;if(start>cursor)pieces.push(html.slice(cursor,start));pieces.push(' ');cursor=end;}
 pieces.push(html.slice(cursor));return pieces.join('');
}
export function extractCoffeeBlendEvidence(html,{name='',scoped=false}={}){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const page=scoped?html:productMarkup(html);
 const labeled=selectedComponentFarmRegion(labeledComponents(page,name),page)||enumeratedComponents(page)||percentageProseComponents(page);
 if(labeled)return labeled;
 const marker=/<(?:p|h[2-6]|strong|b)\b[^<>]{0,350}>\s*(?:<strong\b[^<>]{0,2000}>)?\s*Components?\s*:\s*(?:<\/strong>\s*)?<\/(?:p|h[2-6]|strong|b)>/i.exec(page)||
  /<(?:p|strong|b)\b[^<>]{0,2000}>\s*Components?\s*:\s*(?:<br\s*\/?>)/i.exec(page)||
  /<(?:p|li)\b[^<>]{0,2000}>\s*Components?\s*:\s*(?=\d{1,3}\s*%\s+)/i.exec(page);
 if(!marker)return narrativeComposition(page,name);
 let tail=page.slice(marker.index+marker[0].length,marker.index+marker[0].length+2500);
 tail=tail.split(/<(?:h[2-6]|p|strong)\b[^<>]{0,2000}>\s*(?:tasting\s+notes?|espresso(?:\s+parameter)?|brew(?:ing)?\s+tips|about this coffee)\s*:/i)[0];
 const rows=tail.replace(/<\/(?:p|li|div)>|<br\s*\/?>/gi,'\n')
  .split(/\n|\s*[;]\s*(?=\d{1,3}\s*%)|\s+\+\s+(?=\d{1,3}\s*%)/)
  .map(clean).filter(Boolean).slice(0,20);
 const components=[];
 for(const row of rows){
  const m=/^(\d{1,3})\s*%\s+(.{3,180})$/.exec(row);
  if(!m||Number(m[1])<=0||Number(m[1])>100)continue;
  const candidate=m[2].replace(/^[–:|\s]+/,'').trim();
  if(/\b(?:buy now|add to cart|shipping|review|subscription|subscribe)\b/i.test(candidate))continue;
  components.push({percentage:Number(m[1]),description:candidate});
 }
 const sum=components.reduce((a,x)=>a+x.percentage,0);
 // Partial lists, unrelated numeric deals, and overly broad page sections
 // are not reliable evidence of a complete product blend.
 if(components.length<2||components.length>8||sum<99||sum>101)return null;
 const originValues=[],producerValues=[],methodValues=[],componentMethods=[],componentProducers=[];
 for(const component of components){
  // Anaerobic-natural is one treatment with a drying subtype, consistent
  // with the canonical process parser. Its two words are not two component
  // methods; a separate washed/honey/natural component still makes a mixture.
  const treatment=component.description.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/\b(?:anaerob(?:ic|ico|ica)[\s-]+natural|natural[\s-]+anaerob(?:ic|ico|ica))\b/gi,'Anaerobic');
  const foundMethods=[...treatment.matchAll(METHODS)].map(m=>pretty(m[1]));
  componentMethods.push(unique(foundMethods));
  for(const m of component.description.matchAll(COUNTRIES))originValues.push(pretty(m[1]));
  const producers=producersInComponent(component.description);
  componentProducers.push(producers);producerValues.push(...producers);
  methodValues.push(...foundMethods);
 }
 const origins=unique(originValues),producers=unique(producerValues),processes=unique(methodValues);
 return {
  display:components.map(c=>c.percentage+'% '+c.description).join('; ').slice(0,500),
  origins,producers,processes,
  multi_country:origins.length>1,
  multi_producer:producers.length>1,
  multi_process:processes.length>1,
  complete_process:processes.length===1&&componentMethods.every(values=>values.length===1),
  all_component_processes:componentMethods.every(values=>values.length===1),
  complete_producers:componentProducers.every(values=>values.length>0),
  components:components.length
 };
}


/**
 * A named community can be identified for exactly one geographic component
 * of a multi-country blend without being the producer of the whole blend.
 * Receives current selected product markup AFTER unrelated farmer widgets
 * are excluded. Never creates canonical field suggestions.
 */
export function extractSelectedBlendCommunityCredit(html,{name='',origin='',clean:decode}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof decode!=='function'||!name)return null;
 const countries=unique([...String(origin).matchAll(COUNTRIES)].map(match=>match[1]));
 if(countries.length<2||countries.length>8||countries.some(country=>!/^[A-Za-z -]{3,50}$/.test(country)))return null;
 const location=new RegExp('\\b([\\p{Lu}][\\p{L}\\p{M} -]{2,72}),\\s*('+countries.join('|')+')\\b','giu');
 const results=[];
 for(const block of productCoffeeProse(html,decode)){
  if(block.educational||!['p','li','div'].includes(block.tag)||block.text.length>2200)continue;
  const prose=block.text,lead=prose.slice(0,390);
  // The paragraph must directly identify this selected product as a blend.
  if(!key(lead).includes(key(name))||
   !/\bblend\b[^.!?]{0,140}\b(?:two|three|four|five|six|[2-6])\b[^.!?]{0,100}\b(?:coffee|communities|origins?|components?)\b/i.test(lead))continue;
  const credits=[...prose.matchAll(/\bproducing\s+communities\s*,\s*([A-Z][A-Z0-9-]{2,32})\b/g)];
  if(credits.length!==1)continue;
  const credit=credits[0],organization=credit[1];
  // A marketing acronym alone is not a producer-role attribution.
  if(!new RegExp('\\b'+organization+'\\s+is\\s+an?\\s+(?:association|cooperative|co-?op)\\b','i')
    .test(prose.slice(credit.index+credit[0].length)))continue;
  const places=[...prose.slice(0,credit.index).matchAll(location)];
  if(!places.length||new Set(places.map(match=>key(match[2]))).size!==1)continue;
  const chosen=places.at(-1),region=chosen[1].trim(),country=chosen[2];
  if(!region||countries.some(value=>key(value)===key(region)))continue;
  results.push({organization,country,region,
   other_countries:countries.filter(value=>key(value)!==key(country)),
   quote:prose.slice(0,1350)});
 }
 return results.length===1?results[0]:null;
}


/** Two explicitly sourced regional lots of ONE selected coffee are not one
 * altitude range. Keep each component with its region/roast/process context.
 * Intentionally do not infer a canonical elevation or identify producers.
 */
export function extractSelectedRegionalBlendElevation(html,{name=''}={}){
 if(typeof html!=='string'||html.length>2_000_000||!name)return null;
 const names=unique([...String(name).matchAll(COUNTRIES)].map(x=>x[1]));
 if(names.length!==1)return null;
 const blocks=productCoffeeProse(html,clean).filter(x=>!x.educational&&x.tag==='p');
 const text=blocks.map(x=>x.text).join(' ').slice(0,16000);
 const current=text.match(/\bour\s+current\s+([\p{L}\p{M}][\p{L}\p{M} ]{2,40})\s+offering\b/iu);
 if(!current||key(current[1])!==key(names[0]))return null;
 if(!/\b(?:two|2)\s+regional\s+lots\b[^.!?]{0,200}\bcombined\b[^.!?]{0,130}\b(?:single\s+origin\s+)?blend\b/i.test(text))return null;
 const first=text.match(/\bone\s+of\s+the\s+coffees\s+is\s+a\s+(?:fully\s+)?washed\s+selection\s+from\s+the\s+([\p{L}\p{M}][\p{L}\p{M}\s'’-]{2,65}?)\s+region\s+grown\s+at\s+(\d{3,4})\s*[-–—]\s*(\d{3,4})\s+(?:meters?\s+above\s+sea\s+level|m(?:eters?|asl))\b/iu);
 const second=text.match(/\bthe\s+other\s+is\s+a\s+(?:fully\s+)?washed\s+([\p{L}\p{M}][\p{L}\p{M}\s'’-]{2,65}?)\s+grown\s+at\s+(\d{3,4})\s*[-–—]\s*(\d{3,4})\s+(?:meters?|m(?:asl)?)\b/iu);
 if(!first||!second||first.index>second.index||second.index-first.index>650)return null;
 const regions=[first[1].trim(),second[1].trim()],lows=[+first[2],+second[2]],highs=[+first[3],+second[3]];
 if(key(regions[0])===key(regions[1])||regions.some(x=>x.length<3||x.length>65)||
    lows.some((v,i)=>v<100||v>highs[i]||highs[i]>6000))return null;
 const display=regions.map((region,i)=>region+': '+lows[i]+'–'+highs[i]+' m (Washed)').join('; ');
 return {country:names[0],components:regions.map((region,i)=>({region,elevation_m:lows[i]+'–'+highs[i]+' m',process:'Washed'})),display,
  review:'This selected coffee blends two regional lots with different elevation ranges. The roaster did not publish one whole-blend elevation; leave Elevation blank and review each regional component.'};
}
