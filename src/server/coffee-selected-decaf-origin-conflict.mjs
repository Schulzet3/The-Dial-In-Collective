// Generic exact selected coffee: conflicting direct decaf source-country prose
// versus a directly selected Origin caption. This is a source-integrity veto,
// never a new origin guess; old lots, generic SEO and related items are excluded.
import {compatibleCoffeeOrigins} from './coffee-fact-compatibility.mjs';
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
const countries={mexican:'Mexico',kenyan:'Kenya',colombian:'Colombia',brazilian:'Brazil',
 peruvian:'Peru',ethiopian:'Ethiopia',guatemalan:'Guatemala',honduran:'Honduras',
 rwandan:'Rwanda',ugandan:'Uganda',nicaraguan:'Nicaragua',indonesian:'Indonesia',
 tanzanian:'Tanzania',panamanian:'Panama',salvadoran:'El Salvador'};
const claim=/\b(?:crafted|made|sourced|produced)\s+from\s+(?:only\s+|exclusively\s+|100\s*%\s+)?(mexican|kenyan|colombian|brazilian|peruvian|ethiopian|guatemalan|honduran|rwandan|ugandan|nicaraguan|indonesian|tanzanian|panamanian|salvadoran)\s+coffees?\s+decaffeinated\s+(?:with|using|via|through|by)\s+(?:a\s+|the\s+)?(?:natural\s+)?(?:sugar(?:[ -]?cane)?\s+process|sugar[ -]?cane|ethyl\s+acetate|swiss[ -]?water|mountain[ -]?water|carbon\s+dioxide)\b/giu;
const past=/\b(?:previous(?:ly)?|former(?:ly)?|historical(?:ly)?|other\s+coffees?|another\s+coffee|prior\s+(?:lot|harvest)|not|never|rather\s+than|instead\s+of|unlike)\b/iu;
const relevant=b=>b&&!b.educational&&!/related products?|recommended|other coffees?|you may also like|former coffees?/iu.test(b.section||'');
export function conflictingCurrentSelectedDecafSource({name='',origin='',blocks=[]}={}){
 if(!/\bdecaf(?:feinated)?\b/iu.test(name)||!origin||origin.length>140||
    !Array.isArray(blocks)||blocks.length>2500)return null;
 const headings=blocks.filter(b=>b.tag==='h1');
 if(headings.length!==1||fold(headings[0].text)!==fold(name))return null;
 // The current selected product must independently PRINT the exact field
 // currently proposed by the extractor; general country marketing is insufficient.
 const labels=[...new Set(blocks.filter(b=>relevant(b)&&['span','p','li','dd'].includes(b.tag))
  .map(b=>String(b.text||'').trim().match(/^Origin\s*[:：]\s*(.{3,130})$/iu)?.[1]?.trim())
  .filter(Boolean))];
 if(labels.length!==1||fold(labels[0])!==fold(origin))return null;
 const all=[];
 for(const b of blocks){
  if(!relevant(b)||!['p','li'].includes(b.tag)||String(b.text||'').length>1300)continue;
  const value=String(b.text||'');
  for(const m of value.matchAll(claim)){
   const before=value.slice(Math.max(0,m.index-140),m.index);
   // Only negation/history in this SAME clause can veto selected country;
   // unrelated earlier sensory prose (e.g. "not bitter.") cannot.
   const clause=before.split(/(?<=[.!?])\s+/u).at(-1)||'';
   // Attribution can span neighboring sentences ("Coast Decaf... Crafted from"),
   // but negation/history may veto only the current source-claim clause.
   if(past.test(clause)||(!fold(before).includes(fold(name))&&
      !/\b(?:this|our)\s+(?:decaf(?:feinated)?\s+)?coffee\b/iu.test(before)))continue;
   all.push({country:countries[m[1].toLowerCase()],quote:m[0]});
  }
 }
 const unique=[...new Set(all.map(x=>x.country))];
 if(unique.length!==1||compatibleCoffeeOrigins(origin,unique[0]))return null;
 return {prose_country:unique[0],selected_origin:labels[0],prose_quote:all[0].quote};
}
