// Additional product-specific roaster ESPRESSO recommendation parser.
// Preserve published dose/output/time RANGES and explicit units; never
// reinterpret filter brew time or invent a temperature scale.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
function flatten(html){
 return String(html||'').replace(/<br\s*\/?>|<\/(?:p|h[2-6]|li|div|tr)>/gi,' ').replace(/<[^<>]{0,2000}>/g,' ')
  .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function boundedSection(page){
 if(!page||page.length>2_000_000)return '';
 // Only a named ESPRESSO recommendation section can supply all three
 // numeric fields; don't borrow V60, AeroPress or generic brewing guidance.
 const header=/(?:Espresso\s+(?:Parameter\s+)?Recommendations?|(?:Recommended\s+)?Espresso\s+(?:Parameters|Recipe|Guide|Settings))\s*:/i.exec(flatten(page));
 if(!header)return '';
 const full=flatten(page),at=full.search(/(?:Espresso\s+(?:Parameter\s+)?Recommendations?|(?:Recommended\s+)?Espresso\s+(?:Parameters|Recipe|Guide|Settings))\s*:/i);
 if(at<0)return '';
 let section=full.slice(at+header[0].length,at+header[0].length+850);
 const stop=section.search(/\b(?:V60 Brew|Filter Brew|Hario|Aeropress|French Press|Product Details|Customer Reviews|Ingredients)\b/i);
 if(stop>=0)section=section.slice(0,stop);
 return section;
}
const number=s=>Number(s);
function measure(block,label,unit){
 const matcher=new RegExp('\\b(?:'+label+')\\s*:\\s*(\\d{1,3}(?:\\.\\d{1,2})?)\\s*('+unit+')\\b\\s*(?:[-–—]|to)\\s*(\\d{1,3}(?:\\.\\d{1,2})?)\\s*(?:'+unit+')\\b','i');
 const range=matcher.exec(block);
 if(range)return [number(range[1]),number(range[3])];
 const single=new RegExp('\\b(?:'+label+')\\s*:\\s*(\\d{1,3}(?:\\.\\d{1,2})?)\\s*(?:'+unit+')\\b','i').exec(block);
 return single?[number(single[1]),number(single[1])]:null;
}
const CONFLICT=Symbol('conflicting espresso guide');
function attribute(node,name,max=160){
 const matches=[...node.attributes.matchAll(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'=<>`]+))','gi'))];
 if(matches.length!==1)return '';
 const value=matches[0][1]??matches[0][2]??matches[0][3];
 return value.length<=max?value:'';
}
const guideId=node=>{
 const value=attribute(node,'data-guide');
 return /^[a-z0-9][a-z0-9_:-]{0,119}$/i.test(value)?value:'';
};
const hasClass=(node,name)=>attribute(node,'class',600).split(/\s+/).includes(name);
const closed=(page,node)=>new RegExp('^<\\/'+node.tag+'\\s*>$','i').test(page.slice(node.contentEnd,node.end));
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
 const section=boundedSection(page);
 if(!section)return null;
 const dose=measure(section,'dose|coffee\\s+in','g|grams?');
 const output=measure(section,'output|yield|espresso\\s+out','g|grams?');
 const time=measure(section,'time|brew\\s+time','s|sec(?:onds?)?');
 if(!dose||!output||!time)return null;
 const [d1,d2]=dose,[y1,y2]=output,[t1,t2]=time;
 if(![d1,d2,y1,y2,t1,t2].every(Number.isFinite)||d1<5||d2>40||d2<d1||y1<5||y2>150||y2<y1||t1<5||t2>90||t2<t1)return null;
 const result={dose_g:d1,time_s_min:t1,time_s_max:t2,method:'Espresso'};
 if(y1===y2)result.yield_g=y1;
 else{result.yield_g_min=y1;result.yield_g_max=y2;}
 if(d1!==d2)result.dose_g_max=d2;
 const tol=/\bDose\s*:\s*\d+(?:\.\d+)?\s*g\s*(?:\+\/-|±)\s*(\d+(?:\.\d+)?)\s*g/i.exec(section);
 if(tol&&number(tol[1])<=2)result.dose_tolerance_g=number(tol[1]);
 const temp=/(?:water\s+temp(?:erature)?|temperature|temp)\s*:\s*(.{1,105}?)(?=\s+(?:size|quantity|qty|dose|output|time|tasting notes|components)\s*:|$)/i.exec(section);
 if(temp){
  const raw=temp[1].trim().replace(/[.,;]+$/,'').slice(0,100);
  const exact=raw.match(/^\s*(\d{2,3}(?:\.\d+)?)\s*°?\s*([FC])\b/i);
  if(exact)result.temperature=exact[1]+'°'+exact[2].toUpperCase();
  else if(raw&&!/\b(?:filter|v60|aeropress|hario)\b/i.test(raw))result.temperature_reference=raw;
 }
 return result;
}
