// Direct exact-selected-product prose credits. No network access, no roaster-specific rules.
import {productCoffeeProse} from './coffee-product-prose.mjs';
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
export function selectedDirectProductCredits(html,{name='',clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||!name||typeof clean!=='function')return {};
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(x=>x.tag==='h1').map(x=>fold(x.text));
 if(headings.length!==1||headings[0]!==fold(name))return {};
 const body=blocks.filter(x=>!x.educational&&x.text.length<=1200&&
  ['p','div','h4','h5','li'].includes(x.tag)&&
  !/\b(?:related products?|you may also like|recommended|more coffees?)\b/i.test(x.section));
 const organizations=new Set(),farms=new Set(),sensory=new Set(),literals=new Set();
 let anotherExplicitList=false;
 for(const b of body){
  const line=b.text.replace(/\s+/g,' ').trim();
  const organization=line.match(/^(?:Single[- ]Origin\s+)?(?:Organic\s+)?([\p{L}\p{M}' -]{3,70}?)\s+coffee\s+from\s+([A-Z][A-Z\d-]{2,18})\s+in\s+([\p{L}\p{M}'’,. -]{3,90})(?:[.!]|$)/iu);
  if(organization&&fold(name).includes(fold(organization[1]))&&
     !/\b(?:blends?|rotating|mixed)\b/i.test(name))organizations.add(organization[2]);
  const farm=line.match(/\b(?:working|work)\s+directly\s+with\s+(?:the\s+)?([\p{Lu}][\p{L}\p{M}'’-]{1,30}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{1,30}){0,4})\s+farm\b/u);
  if(farm&&fold(name).includes(fold(farm[1])))farms.add(farm[1]);
  const directFlavor=line.match(/^(?:A|An|This|Our)\s+[^.!?]{0,100}\bcoffee\b[^.!?]{0,100}\bit\s+has\s+([\p{L}\p{M},\s-]{4,110}?)\s+notes?\s+that\s+are\s+sometimes\s+described\b/iu);
  if(directFlavor){
   const value=directFlavor[1].replace(/\s*,\s*/g,', ').trim();
   if(value.length>=4&&!/\b(?:roaster|brew|process|coffee|origin)\b/i.test(value))sensory.add(value);
  }
  const explicit=line.match(/^Tastes\s+like\s*:\s*(.{5,170})$/iu);
  if(explicit){
   const value=explicit[1].trim().replace(/[.;]+$/,'').trim();
   if(value&&!/\b(?:generally|typically|other coffee|previous lot|education)\b/i.test(value))literals.add(value);
  }
  if(/^(?:(?:Tasting|Cupping|Flavor|Flavour|Cup)\s+Notes?|Notes?)\s*:\s*\S/i.test(line))anotherExplicitList=true;
 }
 const out={};
 if(organizations.size===1)out.producer=[...organizations][0];
 if(!out.producer&&farms.size===1){
  const farm='Finca '+[...farms][0];
  if(body.some(b=>b.text.includes(farm))){out.producer=farm;out.farm=farm;}
 }
 if(sensory.size===1)out.tasting_notes=[...sensory][0];
 if(literals.size===1&&!anotherExplicitList)out.explicit_tastes_like=[...literals][0];
 return out;
}
