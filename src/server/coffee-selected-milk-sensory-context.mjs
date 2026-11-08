// Context-qualified exact selected-product sensory prose belongs in Source Review,
// not unqualified tasting_notes or coffee data. No URL/roaster-specific rules.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {selectedCoffeeNameWithoutPrice} from './coffee-product-identity.mjs';
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
const WITH_MILK=/\b(?:layered|served|prepared|combined|mixed)\s+with\s+milk\b/iu;
const TASTING=/\b(?:showcas(?:ing|es)|reveal(?:ed|s|ing)?|highlight(?:s|ing)|offer(?:s|ing)|display(?:s|ing))\b/iu;
const HISTORICAL=/\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|last\s+(?:year|season|lot)|prior\s+(?:lot|release)|another\s+coffee|other\s+coffee|hypothetical|example|usually|typically|rather\s+than|not\s+this\s+coffee)\b/iu;
export function selectedCoffeeMilkSensoryContext(html,{name='',clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof name!=='string'||name.length<4||name.length>180)return '';
 const blocks=productCoffeeProse(html,clean),selected=fold(name);
 const headings=blocks.filter(b=>b.tag==='h1'&&!b.educational)
  .map(b=>fold(selectedCoffeeNameWithoutPrice(b.text)));
 if(!headings.length||headings.some(h=>h!==selected))return '';
 // The short grammatical subject must be the selected name's distinctive prefix
 // (e.g. Raven's ... under H1 Raven Espresso). No generic "our coffees" claims.
 const first=selected.split(' ')[0];
 if(first.length<4||/^(?:coffee|espresso|decaf|blend|medium|dark|light|roast)$/iu.test(first))return '';
 const acceptedSubjects=new Set([selected,first]),found=new Map();
 for(const block of blocks){
  if(block.tag!=='p'||block.educational||block.text.length>1200||
   /\b(?:related|recommended|other coffees?|you may also like|education|faq)\b/iu.test(block.section||'')||
   HISTORICAL.test(block.text)||NONCURRENT_COFFEE_PROSE.test(block.text))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u).slice(0,16)){
   const quote=sentence.trim();
   if(quote.length<45||quote.length>380||!WITH_MILK.test(quote)||!TASTING.test(quote)||
    HISTORICAL.test(quote))continue;
   const named=quote.match(/^([\p{L}\p{M}][\p{L}\p{M}’' .-]{2,95}?)['’]s\s/iu);
   if(!named||!acceptedSubjects.has(fold(named[1])))continue;
   if(!/\b(?:chocolate|cocoa|berry|berries|cherry|caramel|hazelnut|nutty|citrus|fruity|floral|honey|vanilla|spice|tea|melon|grape|apple|peach|plum|orange|jasmine|nougat|liqueur)\b/iu.test(quote.slice(named[0].length)))continue;
   found.set(fold(quote),quote);
   if(found.size>2)return '';
  }
 }
 // Multiple distinct conditioning claims cannot become a single assertion.
 return found.size===1?[...found.values()][0]:'';
}
