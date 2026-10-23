// Additional product-specific roaster ESPRESSO recommendation parser.
// Preserve published dose/output/time RANGES and explicit units; never
// reinterpret filter brew time or invent a temperature scale.
import {productMarkup} from './coffee-product-scope.mjs';
function flatten(html){
 return String(html||'').replace(/<br\s*\/?>|<\/(?:p|h[2-6]|li|div|tr)>/gi,' ').replace(/<[^<>]{0,2000}>/g,' ')
  .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function boundedSection(html){
 const page=productMarkup(html);
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
export function extractProductEspressoReference(html){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const section=boundedSection(html);
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
