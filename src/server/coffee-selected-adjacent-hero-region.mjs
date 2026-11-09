// R59: Current selected hero, not SEO, historical slug or neighboring coffee.
// Refine only an independently accepted single-country origin.
const stripped=s=>String(s||'').replace(/<script\b[\s\S]*?<\/script>/giu,' ')
 .replace(/<style\b[\s\S]*?<\/style>/giu,' ')
 .replace(/<[^>]{0,2500}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/\s+/gu,' ').trim();
const norm=s=>stripped(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function selectedCurrentAdjacentHeroRegion(html,{name='',origin=''}={}){
 if(typeof html!=='string'||html.length>1900000||
  typeof name!=='string'||name.length<8||name.length>180||
  typeof origin!=='string'||origin.length<4||origin.length>60||
  !/^[\p{Lu}][\p{L}\p{M} -]{2,59}$/u.test(origin)||origin.includes(','))return null;
 // An exact selected title and the independently accepted country must agree.
 if(!new RegExp('\\s+[-–—]\\s+'+origin+'$','iu').test(name))return null;
 const heads=[...html.matchAll(/<h1\b[^<>]{0,1500}>([\s\S]{0,2300}?)<\/h1>/giu)];
 if(heads.length!==1||norm(heads[0][1])!==norm(name))return null;
 const tail=html.slice((heads[0].index||0)+heads[0][0].length);
 const own=tail.split(/<h[1-6]\b|<script\b|<section\b[^>]*class=["'][^"']*(?:related|recommend)/iu)[0].slice(0,2500);
 const visible=stripped(own).slice(0,220);
 const word="[\u005cp{Lu}][\u005cp{L}\u005cp{M}'’.–-]{1,40}(?:\u005cs+[\u005cp{Lu}][\u005cp{L}\u005cp{M}'’.–-]{1,40}){0,2}";
 const regex=new RegExp('(?:^|\\s)('+word+')\\s*,\\s*('+word+')\\s+'+origin+'(?=\\s|[.,;:!?]|$)','gu');
 const matches=[...visible.matchAll(regex)].filter(m=>(m.index||0)<=80);
 if(matches.length!==1)return null;
 // A current hero locality is not a historical, related or negated claim.
 const prefix=visible.slice(0,matches[0].index||0);
 if(/\b(?:last year|previous(?:ly)?|formerly|historic(?:al)?|another|other coffee|related|recommended|no longer|not from|different coffee|old lot)\b/iu.test(prefix))return null;
 const [,part1,part2]=matches[0];
 if(/\b(?:coffee|roast|flavou?r|notes|process|blend|farmers?|beans?|origin|region|unknown|decaf|honey|natural|washed)\b/iu.test(part1+' '+part2)||norm(part1)===norm(part2))return null;
 return {value:[part1.trim(),part2.trim(),origin].join(', '),quote:matches[0][0].trim()};
}
