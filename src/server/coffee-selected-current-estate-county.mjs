// Exact current named-estate growing county. Not geographic lookup or SEO.
const clean=v=>String(v||'').replace(/<script\b[\s\S]*?<\/script>/giu,' ')
 .replace(/<style\b[\s\S]*?<\/style>/giu,' ')
 .replace(/<[^<>]{0,2500}>/gu,' ').replace(/&(?:nbsp|amp|#39);/giu,' ')
 .replace(/\s+/gu,' ').trim();
const key=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu,'');
const esc=v=>String(v).replace(/[|\\{}()[\]^$+*?.]/g,'\\$&');
const stale=/\b(?:previous(?:ly)?|formerly|historical(?:ly)?|last year|old lot|other coffee|another coffee|different coffee|not from|no longer)\b/iu;
const related=/<section\b[^>]*class=["'][^"']*(?:related|recommend)|<h[2-6]\b[^>]*>\s*(?:related(?:\s+products?|\s+coffees?)?|you\s+may\s+also\s+like|recommended(?:\s+products?)?)\s*<\/h[2-6]>|<aside\b|<h1\b/iu;
const place="[\\p{Lu}][\\p{L}\\p{M}'’-]{2,45}(?:\\s+[\\p{Lu}][\\p{L}\\p{M}'’-]{2,45}){0,2}";
export function selectedCurrentNamedEstateCountyOrigin(html,{name='',origin='',producer='',process=''}={}){
 if(typeof html!=='string'||html.length>1900000||
  typeof name!=='string'||name.length<9||name.length>170||
  typeof origin!=='string'||origin.length<4||origin.length>100||
  typeof producer!=='string'||producer.length<5||producer.length>120||
  !['Washed','Natural','Honey'].includes(process)||
  /\b(?:blend|sampler|assortment)\b/iu.test(name))return null;
 const title=name.match(/^([\p{Lu}][\p{L}\p{M}'’ -]{2,85}?)\s+[-–—]\s+([\p{Lu}][\p{L}\p{M} -]{2,55})$/u);
 if(!title)return null;
 const [,estate,country]=title,parts=origin.split(/\s*,\s*/u);
 if(parts.length>2||key(parts.at(-1))!==key(country)||
  (parts.length===2&&!/^Mount(?:ain)?\s+/iu.test(parts[0])))return null;
 const headings=[...html.matchAll(/<h1\b[^<>]{0,1500}>([\s\S]{0,2500}?)<\/h1>/giu)];
 if(headings.length!==1||key(clean(headings[0][1]))!==key(name))return null;
 const after=html.slice((headings[0].index||0)+headings[0][0].length);
 const visible=clean(after.split(/<h[1-6]\b|<script\b|<section\b[^>]*class=["'][^"']*(?:related|recommend)/iu)[0]).slice(0,240);
 const own=clean(after.split(related)[0].slice(0,32000));
 const direct=new RegExp("\\b"+esc(estate)+"\\s+is\\s+the\\s+(?:small\\s+)?(?:estate\\s+)?farm\\s+of\\s+("+place+")\\b.{0,330}?\\bon\\s+the\\s+slopes\\s+of\\s+("+place+")\\s+in\\s+("+place+")\\s+County\\b","giu");
 if(!new RegExp("\\bProducer\\s+"+esc(producer)+"\\b","iu").test(own)||
  !new RegExp("\\bProcessing\\s+"+esc(process)+"\\b","iu").test(own))return null;
 const candidates=new Map();
 for(const m of own.matchAll(direct)){
  const first=m[1].split(/\s+/u)[0];
  if(key(first)!==key(producer.split(/\s+/u)[0])||
   (parts.length===2&&key(parts[0])!==key(m[2]))||
   stale.test(own.slice(Math.max(0,(m.index||0)-80),m.index||0)))continue;
  const locality=m[3];
  const hero=new RegExp("(?:^|\\s)"+esc(locality)+"\\s+"+esc(country)+"(?=\\s|[.,;]|$)","iu").exec(visible);
  if(!hero||hero.index>110||stale.test(visible.slice(0,hero.index)))continue;
  const value=locality+', '+country;
  candidates.set(key(value),{value,quote:(m[0]+' | '+hero[0].trim()).slice(0,550)});
 }
 return candidates.size===1?[...candidates.values()][0]:null;
}
