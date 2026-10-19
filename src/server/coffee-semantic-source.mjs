// Small, public, product-scoped text excerpt for optional LOCAL Claude BYOK.
// This does not read cookies, scripts, hidden template code, reviews, personal
// user data or arbitrary other URLs. A preview remains Unverified.
import {productMarkup} from './coffee-product-scope.mjs';
const MARKUP_LIMIT=950_000,OUTPUT_LIMIT=9_000;
export function semanticCoffeeSourceText(html,{name='',roaster=''}={}){
 if(typeof html!=='string'||html.length>MARKUP_LIMIT||!name)return '';
 let page=productMarkup(html).replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,' ')
  .replace(/<(?:form|button|select|textarea|iframe|canvas)\b[^>]*>[\s\S]*?<\/(?:form|button|select|textarea|iframe|canvas)>/gi,' ')
  .replace(/<input\b[^>]*>/gi,' ');
 // The exact coffee title, not a collection/sidebar, anchors the excerpt.
 const h1=/<h1\b[^>]*>[\s\S]{0,12000}?<\/h1>/i.exec(page);
 if(!h1)return '';
 page=page.slice(h1.index,h1.index+42000);
 const boundary=page.search(/<h[2-6]\b[^>]*>[\s\S]{0,350}?(?:you may also like|related products|more coffees|shop similar|customer reviews|recently viewed)\b/i);
 if(boundary>0)page=page.slice(0,boundary);
 page=page.replace(/<(?:br|\/p|\/li|\/h[1-6]|\/tr|\/dt|\/dd|\/section)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ');
 page=page.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|nbsp|quot|apos);/gi,(raw,k)=>{
  const v=k.toLowerCase();
  if(v==='amp')return '&';if(v==='nbsp')return ' ';
  if(v==='quot')return '"';if(v==='apos')return "'";
  const hex=v.startsWith('#x'),n=Number.parseInt(v.slice(hex?2:1),hex?16:10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):raw;
 });
 const lines=page.split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>1);
 return ('Product: '+String(name).slice(0,160)+'\nRoaster: '+String(roaster).slice(0,160)+'\n'+lines.join('\n')).slice(0,OUTPUT_LIMIT);
}
