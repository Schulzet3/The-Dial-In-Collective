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
   if(!match)continue;
   const finish=match[2].trim();
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
