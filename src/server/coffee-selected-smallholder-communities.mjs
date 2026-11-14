// Exact selected-coffee smallholder locality, REVIEW-ONLY, not a producer identity.
// Do not mistake named growing communities for a named farmer, estate or coop.
import {productCoffeeProse} from './coffee-product-prose.mjs';
const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/gu,'');
const normalizedHeading=value=>key(value);
const safeName=/^\p{Lu}[\p{L}\p{M}'’\-]*(?:\s+\p{Lu}[\p{L}\p{M}'’\-]*){0,3}$/u;
export function selectedSmallholderGrowingCommunities(selectedHtml,{name,origin,clean}={}){
 if(typeof selectedHtml!=='string'||selectedHtml.length>2_000_000||
  typeof clean!=='function'||!name||!origin)return null;
 const rows=productCoffeeProse(selectedHtml,clean);
 const headings=rows.filter(row=>row.tag==='h1');
 if(headings.length!==1||normalizedHeading(headings[0].text)!==normalizedHeading(name))return null;
 const claims=new Map();
 for(const row of rows){
  if(row.tag!=='p'||row.educational||row.text.length>900||
    /\b(?:former(?:ly)?|previous(?:ly)?|another coffee|other coffees|different lot|unrelated|not from)\b/iu.test(row.text))continue;
  const match=row.text.match(/\bthis coffee (?:was|is) (?:produced|grown) by (?:smallholder growers|smallholder farmers|smallholders) across the ([\p{L}\p{M}\s-]{3,55}?) communities of ([^.!?]{5,280})/iu);
  if(!match)continue;
  const region=match[1].trim().replace(/\s+/g,' ');
  if(!key(region)||!key(origin).includes(key(region)))continue;
  const communities=match[2].replace(/,\s*(?:and|&)\s+/giu,', ')
   .replace(/\s+(?:and|&)\s+/giu,', ').split(/\s*,\s*/u).map(x=>x.trim());
  if(communities.length<2||communities.length>10||
   communities.some(x=>x.length>45||!safeName.test(x))||
   new Set(communities.map(key)).size!==communities.length)continue;
  const signature=key(region)+'|'+communities.map(key).join('|');
  claims.set(signature,{region,communities});
 }
 return claims.size===1?[...claims.values()][0]:null;
}
