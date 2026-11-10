// Original603 #516/#528 uncovered a generic direct selected-label omission.
// This is source evidence, not an oracle guess. Require unique exact current H1,
// a single bounded direct current product block, and compatible existing fields.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {normalizeExplicitCoffeeTastingNotes,coffeeTastingNotesSubset} from './coffee-flavor-evidence.mjs';
const safeNotes=x=>String(x??'').replace(/[.!?]+\s*$/u,'').trim();
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const key=x=>fold(x).replace(/\s+/gu,'');
const excluded=/\b(?:related|recommended|other products?|another coffee|customer reviews?|testimonials?|past releases?|education|brew guide|historical|previous|former|last year|old lot|hypothetical|unlike|instead of|not from|no longer|used to)\b/iu;
function selectedBlocks(html,{name,clean,maxDistance=18000}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||
  typeof name!=='string'||name.length<6||name.length>180)return [];
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(b=>b.tag==='h1'&&!b.educational);
 if(headings.length!==1||key(headings[0].text)!==key(name))return [];
 const h1=headings[0];
 return blocks.filter(b=>['p','div','span','li','dd'].includes(b.tag)&&
  !b.educational&&!excluded.test(b.section||'')&&
  b.start>h1.start&&b.start-h1.end<maxDistance&&
  typeof b.text==='string'&&b.text.length<1100&&
  !NONCURRENT_COFFEE_PROSE.test(b.text));
}
// A directly labeled changing single-origin lot is stronger than the broad
// country, but do not promote old lots or separate related product captions.
export function selectedCurrentCoffeeLabeledRegion(html,{name='',origin='',clean}={}){
 if(typeof origin!=='string'||origin.length<4||origin.length>60||origin.includes(',')||
  !/^[\p{Lu}][\p{L}\p{M}'’ -]{2,58}$/u.test(origin))return null;
 const blocks=selectedBlocks(html,{name,clean,maxDistance:80000}),found=new Map();
 // Country and current region must be in one actual product's labeled claim;
 // a general regional-story sentence or identity-mismatched fallbacks fail.
 for(const b of blocks){
  const matches=[...b.text.matchAll(/\bCurrent\s+Coffee\s*:\s*([\p{Lu}][\p{L}\p{M}'’ -]{2,52})\b/gu)];
  if(matches.length>2)continue;
  for(const m of matches){
   const phrase=m[1].trim(),head=phrase.match(/^([\p{Lu}][\p{L}\p{M}'’-]{2,36})\s+([\p{Lu}][\p{L}\p{M}'’-]{3,46})(?=\s*$)/u);
   if(!head||key(head[1])!==key(origin)||key(head[2])===key(origin)||
    /\b(?:coffee|roast|beans?|blend|light|medium|dark|decaf|variety|process|natural|washed|honey|flavou?r|chocolate|caramel|cocoa)\b/iu.test(head[2]))continue;
   found.set(key(head[2]),{value:head[2]+', '+origin,quote:m[0]});
  }
 }
 // Another labeled current coffee on the same selected document is ambiguous.
 return found.size===1?[...found.values()][0]:null;
}
// Direct chosen-coffee lead such as "Medium-dark roast with notes of ..."
// outranks a shorter icon list, but never SEO, score reviews or roast range axes.
export function selectedCurrentLeadRoastNotes(html,{name='',clean,notes=''}={}){
 const blocks=selectedBlocks(html,{name,clean,maxDistance:1800}),candidates=new Map();
 for(const b of blocks){
  if(!['p','div','span'].includes(b.tag)||b.text.length<45||b.text.length>300)continue;
  const m=b.text.match(/^(Ultra[ -]Light|Very[ -]Light|Medium[ -]Light|Light[ -]Medium|Medium[ -]Dark|Light|Medium|Dark)\s+roast\s+with\s+notes?\s+of\s+([^.!?;]{12,170})[.!?]?\s*$/iu);
  if(!m)continue;
  const flavorParts=m[2].split(/\s*,\s*|\s+and\s+/iu).map(x=>x.trim()).filter(Boolean);
  if(flavorParts.length<3||flavorParts.length>8||flavorParts.some(x=>
   x.length>45||x.split(/\s+/u).length>4||
   /\b(?:brew|roast|farm|process|variet(?:y|ies)|producer|medium|light|dark|coffee|milk|syrup)\b/iu.test(x)))continue;
  const complete=normalizeExplicitCoffeeTastingNotes(flavorParts.join(', '));
  if(!complete)continue;
  const level=m[1].replace(/\s+/gu,'-').replace(/\b\p{L}/gu,c=>c.toUpperCase());
  const canonical=level==='Light-Medium'?'Medium-Light':level;
  candidates.set(key(canonical)+'|'+key(complete),{roast_level:canonical,
   tasting_notes:complete,quote:b.text});
 }
 // A competing directly printed roast/notes list cannot be silently resolved.
 if(candidates.size!==1)return null;
 const one=[...candidates.values()][0];
 if(typeof notes!=='string'||!notes||
  !(coffeeTastingNotesSubset(safeNotes(notes),one.tasting_notes)||
    key(notes)===key(one.tasting_notes)))return null;
 return one;
}
