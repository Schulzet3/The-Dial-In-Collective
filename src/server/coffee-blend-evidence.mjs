// Selected-product blend facts, from explicit percentage-labeled components.
// Keep real multi-origin / multi-producer values, never invent one origin or
// attribute an unlabeled lot/station name to a producer.
import {productMarkup} from './coffee-product-scope.mjs';

const COUNTRIES=/\b(Ethiopia|Colombia|Peru|Panama|Brazil|Guatemala|Kenya|Honduras|Mexico|Rwanda|Nicaragua|Costa Rica|El Salvador|Uganda|Indonesia|Burundi|Ecuador|Bolivia|Yemen|India|Tanzania|Thailand|United States)\b/gi;
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
 return String(s||'').replace(/<[^<>]*>/g,' ').replace(/&amp;/gi,'&')
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
export function extractCoffeeBlendEvidence(html){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const page=productMarkup(html);
 const marker=/<(?:p|h[2-6]|strong|b)\b[^<>]{0,350}>\s*(?:<strong\b[^<>]*>)?\s*Components?\s*:\s*(?:<\/strong>\s*)?<\/(?:p|h[2-6]|strong|b)>/i.exec(page)||
  /<(?:p|strong|b)\b[^<>]*>\s*Components?\s*:\s*(?:<br\s*\/?>)/i.exec(page)||
  /<(?:p|li)\b[^<>]*>\s*Components?\s*:\s*(?=\d{1,3}\s*%\s+)/i.exec(page);
 if(!marker)return null;
 let tail=page.slice(marker.index+marker[0].length,marker.index+marker[0].length+2500);
 tail=tail.split(/<(?:h[2-6]|p|strong)\b[^<>]*>\s*(?:tasting\s+notes?|espresso(?:\s+parameter)?|brew(?:ing)?\s+tips|about this coffee)\s*:/i)[0];
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
 const originValues=[],producerValues=[],methodValues=[],componentMethods=[];
 for(const component of components){
  const foundMethods=[...component.description.matchAll(METHODS)].map(m=>pretty(m[1]));
  componentMethods.push(unique(foundMethods));
  for(const m of component.description.matchAll(COUNTRIES))originValues.push(pretty(m[1]));
  producerValues.push(...producersInComponent(component.description));
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
  components:components.length
 };
}
