// Additional product-specific roaster ESPRESSO recommendation parser.
// Preserve published dose/output/time RANGES and explicit units; never
// reinterpret filter brew time or invent a temperature scale.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
function flatten(html){
 return String(html||'').replace(/<br\s*\/?>|<\/(?:p|h[2-6]|li|div|tr)>/gi,' ').replace(/<[^<>]{0,2000}>/g,' ')
  .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
const number=s=>Number(s);
const CONFLICT=Symbol('conflicting espresso guide');
const OTHER_METHOD=/\b(?:filter|v[ -]?60|hario|aeropress|french press|chemex|pour.?over|drip|cold brew)\b/i;
const SECTION_STOP=/\b(?:product details|coffee details|customer reviews|ingredients|processing|fermentation|tasting notes|components)\b/i;
const ESPRESSO_TITLE=/^(?:[\p{L}\p{M}\d .()-]{1,60}\s+)?Espresso(?:\s+(?:Parameter\s+)?Recommendations?|\s+(?:Parameters|Recipe|Guide|Settings))?\s*:?$/iu;
const INLINE_TITLE=/^(?:Espresso\s+(?:Parameter\s+)?Recommendations?|(?:Recommended\s+)?Espresso\s+(?:Parameters|Recipe|Guide|Settings))\s*:/i;
const METHOD_LABEL=/^(?:Espresso|Filter|V[ -]?60|Hario V[ -]?60|AeroPress|French Press|Chemex|Pour[ -]?Over|Drip(?: Coffee)?|Cold Brew)(?:\s+(?:Parameter\s+)?Recommendations?|\s+(?:Brew(?:ing)?\s+)?(?:Parameters|Recipes?|Guides?|Settings))?\s*(?::|$)/i;
function espressoSections(page,nodes,scannedEnd){
 const headings=nodes.filter(node=>/^h[1-6]$/.test(node.tag)&&closed(page,node)&&node.contentEnd-node.headEnd<=600)
  .map(node=>({...node,title:flatten(page.slice(node.headEnd,node.contentEnd)),level:Number(node.tag[1])}));
 // Some published brew guides use a standalone paragraph or bold label as
 // the method heading. Such a label is a boundary, never a prose mention.
 const methodLabels=nodes.filter(node=>['p','strong','b'].includes(node.tag)&&closed(page,node)&&node.contentEnd-node.headEnd<=600)
  .map(node=>({...node,title:flatten(page.slice(node.headEnd,node.contentEnd))}))
  .filter(node=>METHOD_LABEL.test(node.title));
 const boundaries=[...headings,...methodLabels].sort((a,b)=>a.start-b.start);
 const candidates=[];
 for(const node of nodes){
  if(!['h2','h3','h4','h5','h6','p','strong','b'].includes(node.tag)||!closed(page,node)||node.contentEnd-node.headEnd>8000)continue;
  const text=flatten(page.slice(node.headEnd,node.contentEnd)),heading=/^h/.test(node.tag);
  const inline=!heading?text.match(INLINE_TITLE):null;
  const title=inline?inline[0]:text;
  if(title.length>100||!ESPRESSO_TITLE.test(title)||OTHER_METHOD.test(title))continue;
  const standalone=!heading&&!inline&&/^Espresso\s*:?$/i.test(title);
  if(!heading&&!inline&&!standalone&&!/\b(?:Recommendations?|Parameters|Recipe|Guide|Settings)\s*:?$/i.test(title))continue;
  // A nested emphasis tag repeats its enclosing title; it is not a second
  // independent recipe, and a prose mention cannot open a recipe section.
  if(candidates.some(candidate=>node.start>=candidate.start&&node.end<=candidate.markerEnd))continue;
  if(candidates.length>=32)return null;
  let end=Math.min(scannedEnd,node.end+8000);
  for(let parent=node.parent;parent!==null;parent=nodes[parent].parent){
   if(['section','article'].includes(nodes[parent].tag)){end=Math.min(end,nodes[parent].contentEnd);break;}
  }
  for(const next of boundaries){
   if(next.start<node.end)continue;
   if(next.start>=end)break;
   if(!heading||!next.level||next.level<=Number(node.tag[1])||OTHER_METHOD.test(next.title)||SECTION_STOP.test(next.title)){
    end=next.start;break;
   }
  }
  const inside=inline?text.slice(inline[0].length):'';
  const fragment=page.slice(node.end,end);
  candidates.push({start:node.start,markerEnd:node.end,title:title.replace(/:\s*$/,''),
   text:(inside+' '+flatten(fragment)).trim(),standalone,
   lines:[inside,...fragment.replace(/<br\b[^<>]{0,2000}>|<\/(?:p|li|div|tr)\s*>/gi,'\n').split('\n')].map(flatten).filter(Boolean).slice(0,120)});
 }
 return candidates;
}
function measureValue(value,unit,{time=false}={}){
 const numeric='(\\d{1,3}(?:\\.\\d{1,2})?)',units='(?:'+unit+')';
 const ranged=new RegExp('^'+numeric+'\\s*(?:'+units+'\\b)?\\s*(?:[-–—]|to)\\s*'+numeric+'\\s*'+units+'\\b','i').exec(value);
 if(ranged)return [number(ranged[1]),number(ranged[2])];
 if(time){
  const clockRange=/^(\d):([0-5]\d)\s*(?:[-–—]|to)\s*(\d):([0-5]\d)(?:\s*(?:s|sec(?:onds?)?))?\b/i.exec(value);
  if(clockRange)return [number(clockRange[1])*60+number(clockRange[2]),number(clockRange[3])*60+number(clockRange[4])];
  const clock=/^(\d):([0-5]\d)(?:\s*(?:s|sec(?:onds?)?))?\b/i.exec(value);
  if(clock){
   if(/^\s*(?:[-–—]|to)\s*\d/i.test(value.slice(clock[0].length)))return null;
   const seconds=number(clock[1])*60+number(clock[2]);return [seconds,seconds];
  }
 }
 const single=new RegExp('^'+numeric+'\\s*'+units+'\\b','i').exec(value);
 if(!single||/^\s*(?:[-–—]|to)\s*\d/i.test(value.slice(single[0].length)))return null;
 return [number(single[1]),number(single[1])];
}
function sectionReference(section){
 // Named field boundaries prevent a stage duration or the next measurement
 // from being read as the missing total shot time. Shared-unit ranges such
 // as 25–30 seconds and explicit 0:26 durations retain their full meaning.
 const numeric='\\d{1,3}(?:\\.\\d{1,2})?',mass='(?:grams?|g)\\b';
 const measuredMass='(?:'+numeric+'\\s*(?:'+mass+')?\\s*(?:[-–—]|to)\\s*'+numeric+'\\s*'+mass+'|'+numeric+'\\s*'+mass+')';
 // Literal values can precede their labels: "18 g coffee in / 38 g
 // espresso out". Reorder only these explicit, unit-bearing measurements.
 let text=section.text;
 // A suffix such as "18g dose" is accepted as a complete list item. Do
 // not reinterpret the adjacent labels in ordinary "Dose: 18g Yield: 40g".
 const suffix=new RegExp('^('+measuredMass+')\\s+(dose|yield|output)\\s*\\.?$','i');
 for(const line of section.lines||[]){
  const match=line.match(suffix);
  const forward=/\b(?:dose|coffee\s+in|espresso\s+out|yield|output)\s*[:：]?\s*\d/i.test(line);
  const normalized=match?match[2]+': '+match[1]:forward?line:line.replace(
   new RegExp('\\b('+measuredMass+')\\s+(coffee\\s+in|espresso\\s+out)\\b(?!\\s*[:：])','gi'),
   (_whole,value,label)=>label+': '+value);
  if(normalized!==line)text=text.replace(line,normalized);
 }
 const matcher=/\b(total\s+(?:brew\s+|shot\s+)?time|water\s+temp(?:erature)?|coffee\s+in|espresso\s+out|brew\s+time|shot\s+time|dose|coffee|output|yield|time|temperature|temp|ratio|grind|tds|pressure)(?:\s*[:：]\s*|\s+(?=\d))/gi;
 const matches=[...text.matchAll(matcher)].slice(0,160),measurements=new Map();
 for(let index=0;index<matches.length;index++){
  const match=matches[index],label=match[1].toLowerCase().replace(/\s+/g,' ');
  const kind=/^(?:dose|coffee(?: in)?)$/.test(label)?'dose':/^(?:yield|output|espresso out)$/.test(label)?'output':
   /time$/.test(label)?'time':/^(?:water temp(?:erature)?|temperature|temp)$/.test(label)?'temperature':label==='ratio'?'ratio':null;
  if(!kind)continue;
  const value=text.slice(match.index+match[0].length,matches[index+1]?.index??text.length).trim();
  const values=measurements.get(kind)||[];values.push(value);measurements.set(kind,values);
 }
 // A standalone total duration in a short espresso recipe list is usable
 // only when no pressure stages, waiting periods or other methods appear.
 if(section.standalone&&!measurements.has('time')&&!/\b(?:pre[ -]?infusions?|pressures?|bars?|blooms?|stages?|rests?|wait(?:s|ing)?|hold(?:s|ing)?)\b/i.test(text)&&!OTHER_METHOD.test(text)){
  const durations=(section.lines||[]).filter(line=>/^\d{1,2}(?:\.\d{1,2})?\s*(?:(?:s|secs?|seconds?)\s*)?(?:(?:[-–—]|to)\s*\d{1,2}(?:\.\d{1,2})?\s*)?(?:s|secs?|seconds?)\s*\.?$/i.test(line));
  if(durations.length)measurements.set('time',durations);
 }
 const read=(kind,unit)=>{
  let found=null;
  for(const value of measurements.get(kind)||[]){
   const pair=measureValue(value,unit,{time:kind==='time'});
   if(!pair)return CONFLICT;
   if(found&&(found[0]!==pair[0]||found[1]!==pair[1]))return CONFLICT;
   found=pair;
  }
  return found;
 };
 const dose=read('dose','g|grams?'),output=read('output','g|grams?'),time=read('time','s|secs?|seconds?');
 if([dose,output,time].includes(CONFLICT))return CONFLICT;
 if(!dose||!output)return null;
 const [d1,d2]=dose,[y1,y2]=output;
 if(d1<5||d2>40||d2<d1||y1<5||y2>150||y2<y1||
    (time&&(time[0]<5||time[1]>90||time[1]<time[0])))return null;
 const result={dose_g:d1};
 if(d1!==d2)result.dose_g_max=d2;
 if(y1===y2)result.yield_g=y1;else{result.yield_g_min=y1;result.yield_g_max=y2;}
 if(time){result.time_s_min=time[0];result.time_s_max=time[1];}
 const legacyCoffeeLabels=!section.standalone&&/^espresso$/i.test(section.title)&&/\bcoffee\s+in\b/i.test(section.text)&&/\bespresso\s+out\b/i.test(section.text);
 if(!legacyCoffeeLabels)result.method=/\sEspresso$/i.test(section.title)&&!/^Recommended\s+Espresso$/i.test(section.title)?section.title:'Espresso';
 const tolerance=(measurements.get('dose')||[])[0]?.match(/(?:g|grams?)\b\s*(?:\+\/-|±)\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
 if(tolerance&&number(tolerance[1])<=2)result.dose_tolerance_g=number(tolerance[1]);
 for(const value of measurements.get('temperature')||[]){
  const raw=value.replace(/[.,;]+\s*$/,'').slice(0,100);
  const exact=raw.match(/^(\d{2,3}(?:\.\d+)?)\s*°?\s*([FC])$/i);
  const kind=exact?'temperature':'temperature_reference',text=exact?exact[1]+'°'+exact[2].toUpperCase():raw;
  if(!text||OTHER_METHOD.test(text))continue;
  if(result[kind]&&result[kind]!==text)return CONFLICT;
  result[kind]=text;
 }
 return result;
}
function pairedRatio(page,nodes){
 let result=null,seen=0;
 for(const node of nodes){
  if(!['p','div','span'].includes(node.tag)||node.contentEnd-node.headEnd>180||!closed(page,node))continue;
  if(!/^Espresso\s*\|\s*Filter$/i.test(flatten(page.slice(node.headEnd,node.contentEnd))))continue;
  if(++seen>32)return null;
  const end=Math.min(node.end+450,node.parent===null?page.length:nodes[node.parent].contentEnd);
  const next=flatten(page.slice(node.end,end));
  const match=next.match(/^Ratio\s*1\s*:\s*(\d(?:\.\d{1,2})?)\s*\|\s*1\s*:\s*\d/i);
  if(!match)continue;
  const ratio=number(match[1]);if(ratio<1||ratio>5)continue;
  if(result&&result.ratio!==ratio)return null;
  result={ratio,method:'Espresso'};
 }
 return result;
}
function attribute(node,name,max=160){
 // Consume whole quoted attributes so a title containing data-guide text
 // cannot forge a method selector. HTML permits names such as 123 and
 // @click; skipping those would expose their quoted contents as attributes.
 // Malformed, duplicate or over-budget identity evidence fails closed.
 const raw=node.attributes,attributes=new Map();
 let at=0,count=0;
 while(at<raw.length){
  while(at<raw.length&&/\s/.test(raw[at]))at++;
  if(at===raw.length||/^\/\s*$/.test(raw.slice(at)))break;
  if(count++>=128)return '';
  const key=/^[^\s"'<>/=\x60]+/.exec(raw.slice(at));
  if(!key)return '';
  const field=key[0].toLowerCase();at+=key[0].length;
  while(at<raw.length&&/\s/.test(raw[at]))at++;
  let value='';
  if(raw[at]==='='){
   at++;while(at<raw.length&&/\s/.test(raw[at]))at++;
   const quote=raw[at];
   if(quote==='"'||quote==="'"){
    const end=raw.indexOf(quote,at+1);if(end<0)return '';
    value=raw.slice(at+1,end);at=end+1;
   }else{
    const found=/^[^\s"'<>\x60=]+/.exec(raw.slice(at));
    if(!found)return '';
    value=found[0];at+=value.length;
   }
  }
  attributes.set(field,attributes.has(field)?null:value);
 }
 const value=attributes.get(name.toLowerCase());
 return typeof value==='string'&&value.length<=max?value:'';
}
const guideId=node=>{
 const value=attribute(node,'data-guide');
 return /^[a-z0-9][a-z0-9_:-]{0,119}$/i.test(value)?value:'';
};
const hasClass=(node,name)=>attribute(node,'class',600).split(/\s+/).includes(name);
const closed=(page,node)=>new RegExp('^<\\/'+node.tag+'\\s*>$','i').test(page.slice(node.contentEnd,node.end));
function methodCardEspressoReference(page){
 const {nodes,scannedEnd}=coffeeHtmlElements(page),groups=new Map();
 for(const node of nodes){
  if(node.tag!=='button'||!attribute(node,'data-brew-method')||!closed(page,node)||node.contentEnd-node.headEnd>600)continue;
  const parent=node.parent===null?null:nodes[node.parent].parent;
  if(parent===null||parent===undefined)continue;
  const group=groups.get(parent)||[];group.push(node);groups.set(parent,group);
  if(groups.size>32)return null;
 }
 let bound=false,result=null;
 for(const [parent,controls] of groups){
  const root=nodes[parent];
  if(root.end>scannedEnd||!closed(page,root)||root.contentEnd-root.headEnd>32_000||controls.length>16)continue;
  const selector=new Map();
  for(const node of controls){
   const id=attribute(node,'data-brew-method');
   if(!/^[a-z][a-z0-9_]{0,40}$/.test(id))continue;
   const title=flatten(page.slice(node.headEnd,node.contentEnd));
   selector.set(id,(selector.get(id)||0)|(/^Espresso$/i.test(title)?1:2));
  }
  if(!selector.has('espresso'))continue;
  bound=true;
  if(selector.get('espresso')!==1)return null;
  if([...selector].some(([id,kind])=>id!=='espresso'&&(kind&1)))return null;
  const cards=nodes.filter(node=>node.parent===parent&&hasClass(node,'item-box-container')&&hasClass(node,'espresso'));
  if(!cards.length||cards.length>16)return null;
  const lines=[];
  for(const card of cards){
   if(!closed(page,card)||card.contentEnd-card.headEnd>8000||[...selector.keys()].some(id=>id!=='espresso'&&hasClass(card,id)))return null;
   const children=nodes.filter(node=>node.start>=card.headEnd&&node.end<=card.contentEnd);
   const headings=children.filter(node=>/^h[2-6]$/.test(node.tag)),values=children.filter(node=>hasClass(node,'description'));
   if(headings.length!==1||values.length!==1||!closed(page,headings[0])||!closed(page,values[0]))return null;
   const label=flatten(page.slice(headings[0].headEnd,headings[0].contentEnd));
   let value=flatten(page.slice(values[0].headEnd,values[0].contentEnd));
   if(value.length>1200||OTHER_METHOD.test(value))return null;
   if(/^Brew$/i.test(label)){
    value=value.replace(/^Pull\s+(?:a\s+)?shot\s+for\s+/i,'');
    if(!/^\d{1,2}(?:\.\d{1,2})?\s*(?:(?:s|secs?|seconds?)\s*)?(?:(?:[-–—]|to)\s*\d{1,2}(?:\.\d{1,2})?\s*)?(?:s|secs?|seconds?)\s*\.?$/i.test(value))return null;
    lines.push('Time: '+value);
   }else if(/^(?:Dose|Yield|Output|Time|Temperature|Water Temperature)$/i.test(label))lines.push(label+': '+value);
  }
  const candidate=sectionReference({title:'Espresso',text:lines.join(' ')});
  if(!candidate||candidate===CONFLICT)return null;
  if(result&&JSON.stringify(result)!==JSON.stringify(candidate))return null;
  result=candidate;
 }
 return bound?result:undefined;
}
function guideMeasure(lines,label,unit){
 const prefix=new RegExp('^(?:'+label+')\\s*:\\s*','i');
 const value=new RegExp('^(\\d{1,3}(?:\\.\\d{1,2})?)\\s*(?:'+unit+')(?:\\s*(?:[-–—]|to)\\s*(\\d{1,3}(?:\\.\\d{1,2})?)\\s*(?:'+unit+'))?$','i');
 let found=null;
 for(const line of lines){
  if(!prefix.test(line))continue;
  const match=line.replace(prefix,'').match(value);
  if(!match)return null;
  const pair=[number(match[1]),number(match[2]||match[1])];
  if(found&&(found[0]!==pair[0]||found[1]!==pair[1]))return CONFLICT;
  found=pair;
 }
 return found;
}
function guideReference(fragment){
 // Preserve explicit field boundaries. Pressure-stage durations and adjacent
 // filter recipes are not an independently published total espresso time.
 const lines=fragment.replace(/<br\b[^<>]{0,2000}>|<\/(?:p|li|div|tr|h[1-6])\s*>/gi,'\n')
  .split('\n').map(flatten).filter(Boolean).slice(0,120);
 const dose=guideMeasure(lines,'dose|coffee(?:\\s+in)?','g|grams?');
 const output=guideMeasure(lines,'output|yield|espresso\\s+out','g|grams?');
 const time=guideMeasure(lines,'total\\s+(?:brew\\s+|shot\\s+)?time|brew\\s+time|shot\\s+time|time','s|sec(?:onds?)?');
 if([dose,output,time].includes(CONFLICT))return CONFLICT;
 if(!dose||!output)return null;
 const [d1,d2]=dose,[y1,y2]=output;
 if(d1<5||d2>40||d2<d1||y1<5||y2>150||y2<y1)return null;
 const result={dose_g:d1,method:'Espresso'};
 if(d1!==d2)result.dose_g_max=d2;
 if(y1===y2)result.yield_g=y1;
 else{result.yield_g_min=y1;result.yield_g_max=y2;}
 if(time&&time[0]>=5&&time[1]<=90&&time[1]>=time[0]){
  result.time_s_min=time[0];result.time_s_max=time[1];
 }
 for(const line of lines){
  const temp=line.match(/^(?:water\s+temp(?:erature)?|temperature|temp)\s*:\s*(\d{2,3}(?:\.\d+)?)\s*°?\s*([FC])$/i);
  if(!temp)continue;
  const value=temp[1]+'°'+temp[2].toUpperCase();
  if(result.temperature&&result.temperature!==value)return CONFLICT;
  result.temperature=value;
 }
 return result;
}
function tabbedEspressoReference(page){
 const {nodes,scannedEnd}=coffeeHtmlElements(page),tabs=new Map(),bodies=new Map();
 let controls=0;
 for(const node of nodes){
  const id=guideId(node);if(!id)continue;
  if(node.tag==='button'){
   if(++controls>64)return null;
   if(!closed(page,node)||node.contentEnd-node.headEnd>600)continue;
   const title=flatten(page.slice(node.headEnd,node.contentEnd));
   const espresso=/^Espresso(?:\s*[-–—|:]\s*[\p{L}\p{M} .()-]{1,40})?$/iu.test(title)&&
    !/\b(?:filter|v60|aeropress|drip|pour.?over|french press)\b/i.test(title);
   // One ID cannot mean both Espresso and Filter, even in duplicate controls.
   tabs.set(id,(tabs.get(id)||0)|(espresso?1:2));
  }else if(['div','section','article'].includes(node.tag)&&hasClass(node,'guide-body')){
   if(!bodies.has(id)&&bodies.size>=64)return null;
   const matches=bodies.get(id)||[];matches.push(node);bodies.set(id,matches);
  }
 }
 let bound=false,result=null;
 for(const [id,kind] of tabs){
  const matches=bodies.get(id);if(!matches)continue;
  bound=true;
  if(kind!==1)continue;
  if(matches.length!==1)return null;
  const body=matches[0];
  if(body.end>scannedEnd||!closed(page,body)||body.contentEnd-body.headEnd>16_000)continue;
  const text=nodes.filter(node=>{
   if(node.start<body.headEnd||node.end>body.contentEnd||!hasClass(node,'guide-text'))return false;
   for(let parent=node.parent;parent!==null;parent=nodes[parent].parent){
    if(hasClass(nodes[parent],'guide-body'))return nodes[parent]===body;
   }
   return false;
  });
  if(text.length!==1||!closed(page,text[0])||text[0].contentEnd-text[0].headEnd>8000)continue;
  if(nodes.some(node=>node.start>=text[0].headEnd&&node.end<=text[0].contentEnd&&hasClass(node,'guide-body')))continue;
  const candidate=guideReference(page.slice(text[0].headEnd,text[0].contentEnd));
  if(candidate===CONFLICT)return null;
  if(!candidate)continue;
  if(result&&[candidate.dose_g,candidate.dose_g_max??candidate.dose_g,
   candidate.yield_g??candidate.yield_g_min,candidate.yield_g??candidate.yield_g_max].some((value,index)=>
    value!==[result.dose_g,result.dose_g_max??result.dose_g,
     result.yield_g??result.yield_g_min,result.yield_g??result.yield_g_max][index]))return null;
  for(const [key,value] of Object.entries(candidate)){
   if(result?.[key]!==undefined&&result[key]!==value)return null;
  }
  result={...result,...candidate};
 }
 // A recognized method selector is stronger than flattened page proximity.
 // Missing/ambiguous espresso guides cannot borrow a Filter tab's numbers.
 return bound?result:undefined;
}
export function extractProductEspressoReference(html){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const page=productMarkup(html);
 const tabbed=tabbedEspressoReference(page);
 if(tabbed!==undefined)return tabbed;
 const cards=methodCardEspressoReference(page);
 if(cards!==undefined)return cards;
 const {nodes,scannedEnd}=coffeeHtmlElements(page),sections=espressoSections(page,nodes,scannedEnd);
 if(!sections)return null;
 let result=null;
 for(const section of sections){
  const candidate=sectionReference(section);
  if(candidate===CONFLICT)return null;
  if(!candidate)continue;
  for(const [key,value] of Object.entries(candidate)){
   if(key==='method')continue;
   if(result?.[key]!==undefined&&result[key]!==value)return null;
  }
  // A range in one independent recipe and a single value in another are
  // different recommendations, even when the lower endpoints happen to match.
  if(result&&[candidate.dose_g_max??candidate.dose_g,candidate.yield_g??candidate.yield_g_min,candidate.yield_g??candidate.yield_g_max]
   .some((value,index)=>value!==[result.dose_g_max??result.dose_g,result.yield_g??result.yield_g_min,result.yield_g??result.yield_g_max][index]))return null;
  result={...result,...candidate};
 }
 return result||pairedRatio(page,nodes);
}
