// Current selected-product literal details only. No roaster-specific URL rules;
// never use catalog cards, educational copy, old SEO or a different product.
import {productCoffeeProse} from './coffee-product-prose.mjs';
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
export function selectedCoffeeContextRoles(html,{name='',clean}={}){
 const out={};
 if(typeof html!=='string'||html.length>2_000_000||typeof name!=='string'||name.length<3||typeof clean!=='function')return out;
 const blocks=productCoffeeProse(html,clean).filter(b=>!b.educational&&b.text.length<=4000);
 const headings=[...new Set(blocks.filter(b=>b.tag==='h1').map(b=>fold(b.text)))];
 if(headings.length!==1||headings[0]!==fold(name))return out;
 const selected=fold(name);
 const literal=[],possibleProducers=new Set(),possibleNotes=new Set(),possibleHarvests=new Set();
 for(const b of blocks){
  const text=b.text;
  const section=fold(b.section);
  // These simple producer-plus-locality list items belong under the exact
  // selected product's OWN heading. Names alone in generic cards do not count.
  if(b.tag==='li'&&section===selected){
   const location=text.match(/^([\p{L}\p{M}'’\s.-]{4,90}?),\s*([\p{L}\p{M}'’\s.-]{3,90}?)\s+(Guatemala|Colombia|Ethiopia|Honduras|Peru|Kenya|Brazil)$/iu);
   if(location){
    const candidate=location[1].trim(),withinName=fold(name).includes(fold(candidate));
    const token=candidate.split(/\s+/)[0].replace(/[^\p{L}]/gu,'');
    const evidence=token.length>=3&&blocks.some(x=>x.tag==='p'&&x.section===b.section&&new RegExp('\\b'+token+'\\b','iu').test(x.text)&&
     /\b(?:coffee producer|family farm|family farms|farmer|farmers|grower|grows|growing)\b/i.test(x.text));
    if(evidence&&(withinName||/^[\p{Lu}][\p{L}\p{M}'’-]{2,30}\s+[\p{Lu}][\p{L}\p{M}'’-]{2,35}$/u.test(candidate)))possibleProducers.add(candidate);
   }
  }
  if(b.tag==='p'){
   // Exact current coffee's own geographical Flavor statement; preserve
   // its directly printed aroma/cup noun list, excluding body prose.
   const sensory=text.match(/^([\p{L}\p{M}]{3,30})\s+Flavor:\s*[^.!?]{3,130}\.\s*([\p{L}\p{M}'’,\s-]{15,280}?)\s+in\s+aroma\s+and\s+cup\b/iu);
   if(sensory&&selected.startsWith(fold(sensory[1]))){
    const notes=sensory[2].replace(/\s+/g,' ').trim();
    if(notes.split(',').length>=3&&notes.length<=200&&!/\b(?:brew|roast|process|producer|recipe|region|farm)\b/i.test(notes))possibleNotes.add(notes);
   }
   // A named current producer's own lot explicitly tied to main-harvest
   // months. Distinguish harvest context from release/batch identifiers.
   const seasonal=text.match(/\bmain\s+harvest\s+(?:season\s+)?that\s+runs\s+from\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+to\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
   if(seasonal&&/\b(?:this|our)\s+(?:first\s+)?lot\b/i.test(text)&&/\b(?:farm|finca)\b/i.test(text)&&!b.educational)possibleHarvests.add(seasonal[1]+'–'+seasonal[2]);
  }
  // Exact selected product taxonomy detail, never from another product's
  // bestseller/recommendation section, marketing adjective or generic text.
  if((b.tag==='li'||b.tag==='p')&&/^Lot\s*:\s*Micro[ -]?lot\.?$/i.test(text)&&
   /^(?:origin details|coffee details|product details|specifications)$/i.test(b.section.trim()))literal.push('Micro-Lot');
 }
 if(possibleProducers.size===1)out.producer=[...possibleProducers][0];
 if(possibleNotes.size===1)out.tasting_notes=[...possibleNotes][0];
 if(possibleHarvests.size===1)out.harvest_season=[...possibleHarvests][0];
 if(literal.length&&literal.every(x=>x==='Micro-Lot'))out.release_label='Micro-Lot';
 return out;
}
