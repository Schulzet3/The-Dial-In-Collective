// Explicit component lists identify BLENDS. Never infer one origin/process
// from several separately named coffees or overwrite a roaster's lot.
import {productMarkup} from './coffee-product-scope.mjs';
const COUNTRIES=/\b(Ethiopia|Colombia|Peru|Panama|Brazil|Guatemala|Kenya|Honduras|Mexico|Rwanda|Nicaragua|Costa Rica|El Salvador|Uganda|Indonesia|Burundi|Ecuador|Bolivia)\b/gi;
const METHODS=/\b(Washed|Natural|Honey|Anaerobic)\b/gi;
function clean(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
export function extractCoffeeBlendEvidence(html){
 if(typeof html!=='string'||html.length>1_000_000)return null;
 const page=productMarkup(html);
 // "Components:" must be an actual product field, not a word in an article.
 const marker=/<(?:p|h[2-6]|strong|b)\b[^>]{0,350}>\s*(?:<strong\b[^>]*>)?\s*Components?\s*:\s*(?:<\/strong>\s*)?<\/(?:p|h[2-6]|strong|b)>/i.exec(page)||
  /<(?:p|strong|b)\b[^>]*>\s*Components?\s*:\s*(?:<br\s*\/?>)/i.exec(page);
 if(!marker)return null;
 let tail=page.slice(marker.index+marker[0].length,marker.index+marker[0].length+1800);
 tail=tail.split(/<(?:h[2-6]|p|strong)\b[^>]*>\s*(?:tasting\s+notes?|espresso(?:\s+parameter)?|brew(?:ing)?\s+tips|about this coffee)\s*:/i)[0];
 const rows=tail.replace(/<\/(?:p|li|div)>|<br\s*\/?>/gi,'\n').split('\n').map(clean).filter(Boolean).slice(0,16);
 const components=[];
 for(const row of rows){
  const m=/^(\d{1,3})\s*%\s+(.{3,125})$/.exec(row);
  if(!m||Number(m[1])>100)continue;
  const candidate=m[2].replace(/^[–:|\s]+/,'').trim();
  if(/\b(?:buy now|add to cart|shipping|review|subscription|subscribe)\b/i.test(candidate))continue;
  components.push({percentage:Number(m[1]),description:candidate});
 }
 const sum=components.reduce((a,x)=>a+x.percentage,0);
 if(components.length<2||components.length>8||sum<90||sum>110)return null;
 const countries=new Set(),methods=new Set();
 for(const c of components){
  for(const m of c.description.matchAll(COUNTRIES))countries.add(m[1].toLowerCase());
  for(const m of c.description.matchAll(METHODS))methods.add(m[1].toLowerCase());
 }
 return {display:components.map(c=>c.percentage+'% '+c.description).join('; ').slice(0,360),
  multi_country:countries.size>1,multi_process:methods.size>1,components:components.length};
}
