// Generic direct selected-product icon-labeled specifications (never SEO).
// Seller image filenames label SAME-heading text; the image itself supplies
// no coffee data. Exact current H1 required; unrelated/sidebar/education denied.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {normalizeExplicitCoffeeTastingNotes} from './coffee-flavor-evidence.mjs';
import {inferDecaffeinationMethod} from './coffee-decaffeination-method.mjs';
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const exclude=/\b(?:related|recommended|other products?|another coffee|reviews|education|brew guide|past releases?|previous lot|historical)\b/iu;
export function selectedIconLabeledCoffeeSpecs(html,{name='',clean}={}){
 const none={notes:[],methods:[]};
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
    !name||name.length>180)return none;
 const blocks=productCoffeeProse(html,clean),heads=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(heads.length!==1||fold(heads[0].text)!==fold(name))return none;
 const notes=new Map(),methods=new Map(),h1=heads[0];
 for(const b of blocks){
  if(b.tag!=='h4'||b.educational||b.start<=h1.end||b.start-h1.end>85000||
     b.text.length<8||b.text.length>260||exclude.test(b.section||'')||
     NONCURRENT_COFFEE_PROSE.test(b.text))continue;
  const images=[...b.html.matchAll(/<img\b[^>]{0,1800}>/giu)]
   .map(m=>m[0].match(/\bsrc\s*=\s*["']([^"']{1,900})["']/iu)?.[1]||'');
  if(images.length!==1)continue;
  const icon=images[0].split('?')[0].toLowerCase();
  if(/(?:^|\/)tasting[_-]?notes?[_-]?\d+x\d+\.(?:png|svg|webp)$/iu.test(icon)){
   const first=b.text.split(/[.!?]/u)[0].trim(),parts=first.split(/\s*,\s*/u);
   if(parts.length<3||parts.length>8||parts.some(x=>x.length<2||x.length>45||
     /\b(?:process|brew|roast|origin|price|producer|decaf|offer|method)\b/iu.test(x)))continue;
   const value=normalizeExplicitCoffeeTastingNotes(parts.join(', '));
   if(value)notes.set(fold(value),value);
  }
  if(/(?:^|\/)process[_-]?\d+x\d+\.(?:png|svg|webp)$/iu.test(icon)&&
     /\b(?:decaffeination|decaffeinated|sugarcane|ethyl acetate|swiss water|mountain water)\b/iu.test(b.text)&&
     inferDecaffeinationMethod({name,selectedMethod:b.text}))
   methods.set(fold(b.text),b.text.trim());
 }
 return {notes:[...notes.values()],methods:[...methods.values()]};
}
