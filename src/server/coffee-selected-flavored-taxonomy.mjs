// Selected flavored-product prose can outrank a *coarse merchant category*, not a
// genuine printed flavor list. Never treat infusion notes as actual ingredients.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {normalizeExplicitCoffeeTastingNotes} from './coffee-flavor-evidence.mjs';

const broad=new Set(['sweet sugary','spice','earthy','savory','grain cereal']);
const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function isCoarseFlavoredProductTaxonomy(value){
 const parts=String(value||'').split(/\s*,\s*/u).map(fold).filter(Boolean);
 return parts.length>=2&&parts.length<=6&&parts.every(x=>broad.has(x));
}
const forbidden=/\b(?:with milk|in milk|when served|only when|if served|prepared with|syrup added|another coffee|other coffees|previous season|previous lot|formerly|historically|for example|typically)\b/iu;
// Strict literal extraction: comma-separated named notes, or a single explicitly
// named note + its separately stated smoky flavor. No flavor thesaurus.
export function selectedFlavoredProductLiteralNotes(html,{clean,existing,sourceFacts}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  !isCoarseFlavoredProductTaxonomy(existing)||!Array.isArray(sourceFacts))return null;
 const category=sourceFacts.filter(f=>f.field==='tasting_notes'&&
  /^flavou?rs?$/iu.test(String(f.label||'').trim())&&
  f.source_type==='html'&&isCoarseFlavoredProductTaxonomy(f.value));
 if(!category.length||sourceFacts.some(f=>f.field==='tasting_notes'&&
   /^(?:tasting|cupping)\s+notes?$/iu.test(String(f.label||''))&&
   !isCoarseFlavoredProductTaxonomy(f.value)))return null;
 const blocks=productCoffeeProse(html,clean);
 const titles=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(titles.length!==1||titles[0].text.length>180)return null;
 const titleWords=fold(titles[0].text).split(/\s+/u);
 // Apostrophized names such as "It's Bourbon" tokenize as "it s bourbon".
 // Expand the SAME selected-H1 prefix rather than rejecting a valid title.
 const core=titleWords.slice(0,titleWords.slice(0,2).join(' ').length<6?4:2).join(' ');
 if(core.length<6)return null;
 const allowed=/^(?:description|product description|coffee description|about this coffee|about the coffee|coffee details|details|product information)$/u;
 // A later separate sentence like "without overpowering the palate" is
 // not a denial of the earlier explicit flavored-coffee claim. Qualify EACH
 // sentence independently: a genuinely conditional/previous/sibling sentence
 // still cannot authorize extraction, but unrelated later copy cannot erase
 // an already positive source claim.
 const stories=blocks.filter(b=>b.tag==='p'&&!b.educational&&
  b.text.length>=40&&b.text.length<=900&&
  (fold(b.section).startsWith(core)||allowed.test(fold(b.section))));
 const isFlavoredOwnSentence=s=>!forbidden.test(s)&&!NONCURRENT_COFFEE_PROSE.test(s)&&
  /\bflavou?red coffee\b|\binfused(?:\s+[a-z-]+){0,4}\s+(?:roast\s+)?coffee\b/iu.test(s);
 if(!stories.some(b=>b.text.split(/(?<=[.!?])\s+/u).slice(0,14).some(isFlavoredOwnSentence)))
  return null;
 const terms=new Map(),raw=[];
 const add=value=>{
  const term=String(value||'').toLowerCase().trim();
  if(!/^[a-z][a-z-]{2,23}$/u.test(term)||/\b(?:smooth|notes|sweet|coffee|richness|medium|roast|flavor|balance|gingery|earthy|cereal|spice|sugary|savory)\b/iu.test(term))return;
  if(!terms.has(fold(term)))terms.set(fold(term),term);
 };
 for(const block of stories){
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u).slice(0,14)){
   if(sentence.length<20||sentence.length>430||forbidden.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence))continue;
   for(const m of sentence.matchAll(/\b(?:notes?|hints?)\s+of\s+((?:[a-z]{3,24}\s*,\s*)+(?:and\s+)?[a-z]{3,24})\b/giu)){
    const parts=m[1].replace(/,\s*and\s+/giu,', ').split(/\s*,\s*/u);
    if(parts.length<2||parts.length>6)continue;
    parts.forEach(add);raw.push(sentence);
   }
   const one=sentence.match(/\b(?:notes?|hints?)\s+of\s+(?:(?:rich|velvety|smooth|creamy|oaky)\s+){0,3}([a-z]{3,24})(?=\s+(?:blend(?:s|ed)?|with|that|followed|balanced)\b|[,.;!?]|$)/iu);
   if(one){add(one[1]);raw.push(sentence);}
   // A seller's explicit smoky-flavor substance in the SAME sentence as
   // a named "notes of" flavor is a flavor descriptor, not an ingredient.
   if(/\bnotes?\s+of\b/iu.test(sentence)){
    const smoky=sentence.match(/\bsmoky richness of\s+(?:crispy\s+)?([a-z]{3,24})(?=\s*[,.;!?]|\s|$)/iu);
    if(smoky){add(smoky[1]);raw.push(sentence);}
   }
  }
 }
 if(terms.size<2||terms.size>8)return null;
 const literal=[...terms.values()].join(', ');
 const normalized=normalizeExplicitCoffeeTastingNotes(literal);
 if(!normalized)return null;
 return {value:normalized,quote:[...new Set(raw)].slice(0,3).join(' ').slice(0,850)};
}
