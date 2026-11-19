// Current selected product-specific project team name discrepancy, never global SEO.
import {productCoffeeProse} from './coffee-product-prose.mjs';
const word="[\\p{Lu}][\\p{L}\\p{M}'’.-]{1,34}";
const person=word+"(?:\\s+"+word+"){1,2}";
const team=new RegExp("^("+person+")\\s+(?:and|&)\\s+("+person+")$","u");
const leaders=new RegExp("\\b(?:project|team)\\s+(?:is\\s+)?led\\s+by\\s+("+person+")\\s+(?:and|&)\\s+("+person+")(?=\\s*(?:[,.;]|\\bwho\\b|\\bbuilt\\b))","u");
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z]+/g,' ').trim();
const first=s=>norm(s).split(' ')[0]||'';
export function selectedProducerTeamNameDisagreement(selectedHtml,{producer,clean}={}){
 if(typeof selectedHtml!=='string'||typeof producer!=='string'||typeof clean!=='function')return null;
 const label=producer.trim(),pair=team.exec(label);if(!pair||label.length>180)return null;
 for(const block of productCoffeeProse(selectedHtml,clean)){
  if(block.educational||!block.text||block.text.length>2500)continue;
  const match=leaders.exec(block.text);if(!match)continue;
  const before=[pair[1],pair[2]],after=[match[1],match[2]];
  for(const [a,b] of [[0,1],[1,0]]){
   if(norm(before[a])!==norm(after[a]))continue;
   if(first(before[b])!==first(after[b])||norm(before[b])===norm(after[b]))continue;
   if(first(before[b])===first(before[a]))continue;
   return {label,narrative:after.join(' and ')};
  }
 }
 return null;
}
