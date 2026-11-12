// Exact selected-product description notes supplement a shorter printed profile.
// Never use meta/SEO, related products, alternatives, preparation or guessed notes.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {normalizeExplicitCoffeeTastingNotes} from './coffee-flavor-evidence.mjs';
const fold=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,' ').trim();
const unavailable=/\b(?:another|other|unrelated|previous|previously|former|formerly|historically|last year|used to|typically|usually|hypothetical|might|could|would|if|unless|when|only when|depending|alternative|instead|roast-specific|milk|creamer|syrup|prepared|brewed|served|added|mixed|cooled|heated)\b/i;
export function refineSelectedDescriptionSensory(html,{clean,notes}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof notes!=='string'||notes.length<8||notes.length>300)return '';
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(headings.length!==1||!headings[0].text||headings[0].text.length>180)return '';
 const parts=notes.split(/\s*(?:,|&|[•·;|]|\band\b)\s*/i).map(s=>s.trim()).filter(Boolean);
 if(parts.length<2||parts.length>8||parts.some(x=>!normalizeExplicitCoffeeTastingNotes(x)))return '';
 // The direct source must expressly mark the chosen product's description.
 // No arbitrary product JSON, recommendations, general story or hidden SEO.
 const descriptions=blocks.filter(b=>b.tag==='p'&&!b.educational&&
  ( /^description\s*:/i.test(b.text)||/^description$/i.test(b.section.trim()))&&
  b.text.length<1600&&!unavailable.test(b.section));
 if(descriptions.length!==1)return '';
 const paragraph=descriptions[0].text.replace(/^description\s*:\s*/i,'');
 if(!paragraph||/\b(?:as a (?:light|dark|medium)[ -]?roast|different (?:profiles?|roasts?)|either roast)\b/i.test(paragraph))return '';
 const found=new Map(),sourceSentences=paragraph.split(/(?<=[.!?])\s+/u).slice(0,16);
 let anchor=false;
 for(const sentence of sourceSentences){
  if(sentence.length>520||unavailable.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence))continue;
  for(const match of sentence.matchAll(/\bnotes?\s+of\s+([^.!?;]{2,180})/gi)){
   const literal=match[1].split(/\s+(?:alongside|followed by|which|that|with|on the|mentioned|described)\b|,\s*(?:but|however)\b/i)[0]
    .replace(/\s+and\s+a\s+touch\s+of\s+.*$/i,'').replace(/[,\s]+$/,'').trim();
   if(!literal||literal.length>115)continue;
   const candidates=literal.split(/\s+(?:and|&)\s+/i).map(x=>x.trim()).filter(Boolean);
   if(candidates.length<1||candidates.length>3)continue;
   const parsed=candidates.map(x=>normalizeExplicitCoffeeTastingNotes(x));
   if(parsed.some(x=>!x||x.length>52||x.split(/\s+/).length>5||
      /\b(?:body|mouthfeel|acidity|finish|flavor|flavour|sweetness|coffee|beans?|notes?)\b/i.test(x)))continue;
   for(const phrase of parsed){
    const key=fold(phrase);
    if(parts.some(part=>fold(part)===key))anchor=true;
    else found.set(key,phrase);
   }
  }
 }
 // At least one word-identical selected labeled descriptor must corroborate
 // the direct description, and at most four additional literal notes are safe.
 if(!anchor||found.size<1||found.size>4)return '';
 const augmented=[...parts,...found.values()].join(', ');
 return normalizeExplicitCoffeeTastingNotes(augmented)||'';
}


// Keep one literal, unconditional flavor finish printed with the already
// selected coffee's full note list in its own current product paragraph.
export function refineSelectedCurrentLiteralFinish(html,{clean,notes}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof notes!=='string'||notes.length<8||notes.length>300)return '';
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(headings.length!==1||!headings[0].text||headings[0].text.length>180)return '';
 const parts=notes.split(/\s*(?:,|&|[•·;|]|\band\b)\s*/i).map(x=>x.trim()).filter(Boolean);
 if(parts.length<2||parts.length>8||parts.some(x=>!normalizeExplicitCoffeeTastingNotes(x)))return '';
 const hits=new Set();
 for(const block of blocks){
  if(block.tag!=='p'||block.educational||unavailable.test(block.section)||
   block.text.length<22||block.text.length>650||unavailable.test(block.text)||
   NONCURRENT_COFFEE_PROSE.test(block.text))continue;
  // Every canonical note must occur within this one selected paragraph;
  // unbound SEO, related products and other coffees cannot supply a finish.
  const owned=fold(block.text);
  if(!parts.every(part=>owned.includes(fold(part))))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u).slice(0,12)){
   if(sentence.length>500)continue;
   const match=sentence.match(/(?:^|;)\s*([^;.!?]{3,105}\bnotes?)\s+with\s+(?:a|an)\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,3})\s+finish[.!?]?$/iu);
   // Only one exact selected paragraph/sentence may supply a direct flavor finish.
   // Unrelated roast, prior lot, meta, and conditional milk remain excluded.
   const literalFinish=match?.[2]||(
    parts.every(part=>fold(sentence).includes(fold(part)))?
     sentence.match(/\b(?:balanced|rounded)\s+by\s+a\s+(?:(?:smooth|clean|bright|sweet|long|lingering|delicate)\s+)?finish\s+of\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,3})(?=[.!?]|$)/iu)?.[1]:'');
   if(!literalFinish)continue;
   const finish=literalFinish.trim();
   if(/^(?:clean|smooth|bright|dry|long|short|pleasant|balanced|crisp|lingering|lasting|full|round|complex|delicate|fresh|soft|bold)$/i.test(finish)||
    /\b(?:body|mouthfeel|acidity|roast|process|brewed|served|milk|creamer|syrup|added|mixed|coffee|beans?)\b/i.test(finish)||
    parts.some(part=>fold(part)===fold(finish))||
    !normalizeExplicitCoffeeTastingNotes(finish))continue;
   hits.add(finish);
  }
 }
 if(hits.size!==1)return '';
 return normalizeExplicitCoffeeTastingNotes([...parts,...hits].join(', '))||'';
}


// Exact selected-product additional literal prose: review context, NOT a
// replacement for an independent, stronger printed Flavor/Notes label.
export function selectedCoffeeSupplementalTastingProse(html,{clean,notes}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof notes!=='string'||notes.length<8||notes.length>300)return '';
 const blocks=productCoffeeProse(html,clean);
 const h1=blocks.filter(x=>x.tag==='h1'&&!x.educational);
 if(h1.length!==1||!h1[0].text||h1[0].text.length>180)return '';
 const canonical=notes.split(/\s*(?:,|&|[•·;|]|\band\b)\s*/iu).map(x=>x.trim()).filter(Boolean);
 if(canonical.length<2||canonical.length>8)return '';
 const candidates=[];
 for(const block of blocks){
  if(block.tag!=='p'||block.educational||block.text.length<25||block.text.length>1100||
   unavailable.test(block.section)||NONCURRENT_COFFEE_PROSE.test(block.text))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u).slice(0,14)){
   if(sentence.length>350||unavailable.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence))continue;
   const hit=sentence.match(/\b(?:the|its|this coffee['’]s?)\s+taste\s+(?:has|offers|features|shows)\s+(?:a\s+)?(?:tones?|notes?)\s+of\s+([^.!?;]{8,140})/iu);
   if(!hit)continue;
   const raw=hit[1].trim().replace(/\s+(?:tones?|notes?)$/iu,'');
   const terms=raw.split(/\s+along\s+with\s+|,\s*|\s+and\s+/iu).map(s=>s.trim()).filter(Boolean);
   if(terms.length<2||terms.length>6||terms.some(s=>s.length>36||s.split(/\s+/u).length>3||
    /\b(?:body|acidity|finish|roast|process|producer|farm|coffee|tea|milk|syrup|flavor|sweetness|mouthfeel)\b/iu.test(s)))continue;
   const value=normalizeExplicitCoffeeTastingNotes(terms.join(', '));
   if(!value||terms.some(s=>canonical.some(c=>fold(s)===fold(c))))continue;
   candidates.push(value);
  }
 }
 // Two nonidentical extra descriptions are not one unambiguous context list.
 return candidates.length===1?candidates[0]:'';
}


// A chosen current product can state a distinct, intrinsic flavor base
// coordinated with its ALREADY accepted two-or-more selected notes.
// "Milk chocolate" is a chocolate tasting note, not "coffee with milk".
// Require a single selected H1, one literal current paragraph, identical
// already accepted suffix notes, and no alternate/related/conditional source.
export function refineSelectedCurrentFlavorBase(html,{clean,notes}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
    typeof notes!=='string'||notes.length<8||notes.length>300)return '';
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(x=>x.tag==='h1'&&!x.educational);
 if(headings.length!==1||!headings[0].text||headings[0].text.length>180)return '';
 const selectedSection=fold(headings[0].text);
 const allowedProductSection=/^(?:product info|product information|product description|description|coffee description|about the coffee|about this coffee|about coffee|coffee details|details|coffee notes|tasting notes|flavor notes|flavour notes|flavor profile|flavour profile|coffee profile|the coffee|specifications|overview|coffee information)$/u;
 const parts=notes.split(/\s*(?:,|&|[•·;|]|\band\b)\s*/iu).map(s=>s.trim()).filter(Boolean);
 if(parts.length<2||parts.length>7||parts.some(s=>!normalizeExplicitCoffeeTastingNotes(s)))return '';
 const candidates=new Set();
 for(const block of blocks){
  if(block.tag!=='p'||block.educational||block.text.length<45||block.text.length>900||
     unavailable.test(block.section)||NONCURRENT_COFFEE_PROSE.test(block.section))continue;
  // Do not read a similarly worded sibling product paragraph after its own
  // product heading. Empty, selected H1 or bounded generic details are eligible.
  const section=fold(block.section);
  if(section&&section!==selectedSection&&!allowedProductSection.test(section))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u).slice(0,14)){
   if(sentence.length>450||NONCURRENT_COFFEE_PROSE.test(sentence)||
      /\b(?:served|prepared|brewed|mixed|added|with milk\b|with cream\b|if|when|only when|depending|alternatively|hypothetical|previously|formerly|historically|different|another|other coffees?)\b/iu.test(sentence))continue;
   const match=sentence.match(/^(?:Its|This coffee['’]s)\s+([\p{L}\p{M}][\p{L}\p{M} -]{2,52}?)\s+base\s+is\s+complemented\s+with\s+notes\s+of\s+([^.!?;]{5,175})[.!?]?$/iu);
   if(!match)continue;
   const base=match[1].trim();
   // A sensory base requires a named literal flavor substance, not a roast,
   // mouthfeel, texture, milk service, generic "sweetness", or provenance.
   if(!/\b(?:chocolate|cocoa|cacao|caramel|toffee|hazelnut|almond|nougat|praline|vanilla|berry|cherry|fruit)\b/iu.test(base)||
      /\b(?:body|acidity|mouthfeel|finish|roast|brewing|brewed|served|with milk|coffee|beans?|texture|milk foam|creaminess|sweetness|processing)\b/iu.test(base))continue;
   const tail=match[2].replace(/,\s*(?:culminating|ending|resulting|leading)\b.*$/iu,'').trim();
   const printed=tail.split(/\s*(?:,|&|[•·;|]|\band\b)\s*/iu).map(s=>s.trim()).filter(Boolean);
   if(printed.length!==parts.length||printed.some(p=>!normalizeExplicitCoffeeTastingNotes(p))||
      !parts.every(p=>printed.some(t=>fold(t)===fold(p))))continue;
   if(parts.some(p=>fold(p)===fold(base)))continue;
   const complete=normalizeExplicitCoffeeTastingNotes([base,...parts].join(', '));
   if(complete)candidates.add(complete);
  }
 }
 return candidates.size===1?[...candidates][0]:'';
}
