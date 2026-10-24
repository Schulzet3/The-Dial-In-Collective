import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';

const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/’/g,"'").replace(/\s+/g,' ').trim();
const NAME=String.raw`[\p{Lu}][\p{L}\p{M}\d'’.-]*(?:\s+(?:[\p{Lu}][\p{L}\p{M}\d'’.-]*|de|del|la|las|los|el|y|da|das|do|dos|of|the|and)){1,11}`;
const CLAIM=new RegExp('^(?:Producer Info:\\s*)?('+NAME+')\\s+is\\s+(?:an?|our)\\s+'+
 '(?:(?:cherished|family[- ](?:run|owned|operated)|family|(?:first|second|third|fourth|fifth)[ -]generation)[, ]+){0,4}'+
 '(cooperative|co-op|farm|estate)\\b','u');

// Input must already represent the selected coffee. This is literal role
// corroboration, not a place database: the source independently names the
// entity before a mislabeled geographic value can be cleaned for comparison.
export function extractCoffeeGeographyEntityRoles(html,{clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function')return [];
 const result=[],seen=new Set();
 for(const block of productCoffeeProse(html,clean)){
  if(block.educational||/^h[1-6]$/.test(block.tag))continue;
  for(const raw of block.text.split(/(?<=[.!?])\s+|[\r\n]+/u).slice(0,80)){
   const sentence=raw.trim();
   if(sentence.length>1600||NONCURRENT_COFFEE_PROSE.test(sentence)||
     /\b(?:hypothetical|imaginary|fictional|example|suppose|imagine|used to be)\b/i.test(sentence))continue;
   const claim=sentence.match(CLAIM);if(!claim||claim[1].length>120)continue;
   const name=claim[1],role=claim[2],signature=key(name)+'\0'+role;
   if(seen.has(signature))continue;seen.add(signature);
   result.push({name,role,quote:sentence,...(/^Producer Info:/u.test(sentence)?{explicit_producer_context:true}:{})});
   if(result.length===32)return result;
  }
 }
 return result;
}

// Only remove a complete attested name directly prefixed to a longer place
// tuple. A comma after the name explicitly makes it a geographic segment;
// preserve that, unknown prefixes, single places and all original source text.
export function cleanCoffeeGeographyEntityPrefix(value,roles){
 if(typeof value!=='string'||value.length>500||!Array.isArray(roles))return value;
 const text=value.trim(),words=[...text.matchAll(/\S+/gu)],candidates=new Set();
 for(const role of roles.slice(0,32)){
  if(!role||!['cooperative','co-op','farm','estate'].includes(role.role)||
    typeof role.name!=='string'||role.name.length>120)continue;
  const count=role.name.trim().split(/\s+/u).length;
  if(count<2||count>12||words.length<=count)continue;
  const last=words[count-1],end=last.index+last[0].length;
  if(key(text.slice(0,end))!==key(role.name)||!/^\s/u.test(text.slice(end)))continue;
  const remainder=text.slice(end).trim(),parts=remainder.split(',').map(part=>part.trim());
  if(parts.length<2||parts.length>6||parts.some(part=>!part||part.length>100||
    !/^[\p{L}][\p{L}\p{M}\d\s'’().-]*$/u.test(part)))continue;
  candidates.add(remainder);
 }
 return candidates.size===1?[...candidates][0]:value;
}
