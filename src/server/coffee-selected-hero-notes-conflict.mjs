// Detect only a current exact-H1 hero whose three literal flavors are all
// corroborated by one named-coffee narrative, yet disagree with an independent
// selected product Tasting Notes label. Never infer a preferred flavor list.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const compact=x=>norm(x).replace(/\s+/gu,'');
const excluded=/\b(?:related|recommend(?:ed|ations?)|other coffees?|another coffee|different coffee|previous|former|last year|old lot|historical|education|unlike|rather than|used to|not from|no longer)\b/iu;
function threeNotes(raw){
 const parts=String(raw||'').split(/\s*,\s*/u).map(x=>x.trim());
 if(parts.length!==3||parts.some(x=>x.length<3||x.length>42||
   x.split(/\s+/u).length>4||/[\d<>:]|\b(?:coffee|process|roast|farms?|producer|brew|ratio|origin|location|flavo[u]?r|tasting)\b/iu.test(x)))return null;
 return parts;
}
export function selectedCurrentCorroboratedHeroNotesConflict(html,{name='',notes='',clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||
  typeof clean!=='function'||name.length<4||name.length>160||!threeNotes(notes))return null;
 const blocks=productCoffeeProse(html,clean);
 const titles=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(titles.length!==1||compact(titles[0].text)!==compact(name))return null;
 const heading=titles[0];
 const detail=blocks.find(b=>b.start>heading.end&&/^h[2-3]$/.test(b.tag)&&
   /^(?:description|harvest details|product details|coffee details|specifications?)$/iu.test(b.text.trim()));
 const end=Math.min(heading.end+30_000,detail?.start??Infinity);
 const current=blocks.filter(b=>b.start>=heading.end&&b.start<end&&!b.educational&&
  !excluded.test(b.section||'')&&['p','span','div','li'].includes(b.tag));
 const profiles=new Map();
 for(const b of current){
  const parts=threeNotes(b.text);
  if(parts&&!excluded.test(b.text))profiles.set(compact(b.text),{value:b.text.trim(),parts});
 }
 if(profiles.size!==1)return null;
 const hero=[...profiles.values()][0],printed=threeNotes(notes);
 const selectedSet=new Set(printed.map(compact)),heroSet=new Set(hero.parts.map(compact));
 if(selectedSet.size!==3||heroSet.size!==3||
   [...selectedSet].every(x=>heroSet.has(x))||
   [...heroSet].every(x=>selectedSet.has(x)))return null;
 // A page-wide recommendation cannot become competing selected-product
 // evidence. Require exact current selected name AND every literal flavor in
 // the selected pre-description narrative, excluding historical negatives.
 const narrative=current.filter(b=>b.tag==='p'&&b.text.length<=850&&
   !NONCURRENT_COFFEE_PROSE.test(b.text)&&!excluded.test(b.text)&&
   norm(b.text).includes(norm(name))&&
   hero.parts.every(term=>norm(b.text).includes(norm(term))));
 if(narrative.length!==1)return null;
 return {hero:hero.value,printed:notes,quote:narrative[0].text.slice(0,350)};
}
