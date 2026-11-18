// Bounded, evidence-only extraction for coffee-specific storefront layouts.
// Representative source patterns: Proud Mary, Queen City Collective, Onyx,
// PERC, SEY, The Picky Chemist, Black & White, Little Wolf and Heart.
// This is a parser, not a roaster-specific source-verification allowlist.
// Roast can be suggested from an Agtron reading only with scale/sample
// caveats. Never infer roast from brand, hue or tasting language.
import {extractDelimitedCoffeeSpecs} from './coffee-delimited-specs.mjs';
import {selectedIconCountryRegion} from './coffee-selected-icon-geography.mjs';
import {productMarkup} from './coffee-product-scope.mjs';
import {interpretAgtron} from './agtron-roast.mjs';
import {extractProductFlavorEvidence} from './coffee-flavor-evidence.mjs';
import {coffeeFieldKey,extractSemanticCoffeeSpecs} from './coffee-semantic-specs.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {parseCoffeeElevation} from './coffee-elevation-evidence.mjs';
import {compatibleEADecaffeinationDetail} from './coffee-processing-evidence.mjs';
const leaf=/<(h[2-6]|p|div|span|strong|small|label|dt|dd|li|b)\b[^<>]{0,420}>([^<>]{1,400})<\/\1\s*>/gi;
const allowedExtra=new Set(['agtron','agtron_scale','agtron_sample','recommended_rest','drying_method','harvest_season','preferred_extraction','processing_detail','production_roaster']);
const getKey=coffeeFieldKey;
const isInfoText=s=>s.length>=2&&s.length<=240&&!/^(?:add to cart|shop|read more|next|size|quantity|subscribe|search|all coffee|more coffees|customer reviews|related products|regular price)$/i.test(s);
const cleanValue=(s,clean,max=230)=>clean(s,max).replace(/^\s*[:\-|–]\s*/,'').trim();
const normalizedProcess=s=>{
 const lower=s.toLowerCase();
 const flags=[
  ['Washed',/\bwashed\b|\blavado\b/i],
  ['Natural',/\bnatural(?:[\s-]processed)?\b/i],
  ['Honey',/\bhoney\b/i],
  ['Anaerobic',/\banaerobic\b/i]
 ].filter(([,regex])=>regex.test(lower));
 return flags.length===1?flags[0][0]:'';
};
const extraConflicts=new WeakMap();
export const coffeeLayoutDetailConflicts=details=>[...(extraConflicts.get(details)||[])];
function addExtra(extras,kind,value){
 if(!allowedExtra.has(kind)||!value||extraConflicts.get(extras)?.has(kind))return;
 if(extras[kind]){
  if(kind==='processing_detail'){
   const compatible=compatibleEADecaffeinationDetail(extras[kind],value);
   if(compatible){extras[kind]=compatible;return;}
  }
  if(extras[kind].normalize('NFKC').toLowerCase()!==String(value).normalize('NFKC').toLowerCase()){
   const conflicts=extraConflicts.get(extras)||new Set();conflicts.add(kind);extraConflicts.set(extras,conflicts);delete extras[kind];
   if(kind==='agtron'){delete extras.agtron_scale;delete extras.agtron_sample;}
  }
  return;
 }
 extras[kind]=value;
}
function field(fields,label,value,add,extras,clean){
 const kind=getKey(label),raw=cleanValue(value,clean,260);
 if(!kind||!isInfoText(raw))return;
 // An adjacent coffee story is never a producer/variety/origin name.
 if(['producer','variety','origin','release_label'].includes(kind)&&
   (/[.!?]\s*$/.test(raw)||raw.split(/\s+/).length>17))return;
 if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(raw))return;
 if(kind==='agtron'){
  const score=interpretAgtron(raw);
  if(score){
   addExtra(extras,'agtron',score.display);
   if(score.scale!=='unspecified')addExtra(extras,'agtron_scale',score.scale);
   if(score.sample!=='unspecified')addExtra(extras,'agtron_sample',score.sample.replace('_',' '));
  }
  return;
 }
 if(kind==='recommended_rest'){
  const m=raw.match(/\b(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*(days?|weeks?|months?)\b/i);
  if(m&&Number(m[1])>0&&(!m[2]||Number(m[2])>=Number(m[1])))
   addExtra(extras,kind,m[1]+(m[2]?'–'+m[2]:'')+' '+m[3].toLowerCase());
  return;
 }
 if(kind==='harvest_season'||kind==='drying_method'||kind==='preferred_extraction'||kind==='production_roaster'){
  addExtra(extras,kind,raw.slice(0,105));return;
 }
 if(kind==='processing_detail'){
  const decaf=/^decaffeination (?:method|process)$/i.test(String(label).replace(/[:：]\s*$/,''));
  const detail=decaf?'Decaffeination: '+raw.split(/[.!?](?:\s|$)/)[0].trim():raw;
  addExtra(extras,kind,detail.slice(0,160));return;
 }
 // Processing can be an elaborate treatment with multiple stages:
 // the single-select field must never misrepresent a blended process.
 if(kind==='process'){
  const value=normalizedProcess(raw);
  // Pass the original evidence so the shared conflict tracker can suppress
  // a stale single-process fallback when the visible process is compound.
  add(kind,raw);
  if(raw.length<=150&&raw.toLowerCase()!==value.toLowerCase()&&
     /\b(?:washed|natural|honey|anaerobic|lavado|lavada|miel|ferment|fermentation|maceration|carbonic|thermal shock|dried|drying|wet[ -]+process(?:ed|ing)?|dry[ -]+process(?:ed|ing)?|decaf(?:feination|feinated)?|sugar[ -]?cane|sugar\s+process|ethyl[ -]+acetate|swiss[ -]+water|mountain[ -]+water)\b/i.test(raw))
    addExtra(extras,'processing_detail',raw.slice(0,160));
  return;
 }
 // Long narrative process paragraphs, roaster navigation or unrelated SEO
 // must not become a numeric/identity field via a generic label.
 if(raw.length>175&&kind!=='tasting_notes')return;
 if(kind==='elevation_m'&&!parseCoffeeElevation(raw))return;
 add(label,raw);
}
function parsePairs(tokens,fields,add,extras,clean){
 // Onyx-style all-caps DIV captions follow their metric values. Other sites
 // (Proud Mary, PERC and SEY) put labels BEFORE values. Establish layout
 // direction first, instead of mistaking the previous field's value for
 // the next field's value.
 const reverseLayout=tokens.filter((t,i)=>i>0&&t.tag==='div'&&
  tokens[i-1].tag==='div'&&getKey(t.text)&&
  /^[A-Z][A-Z ]{3,}$/.test(t.text)).length>=2;
 // First trust value-then-metric layouts (Onyx). A subsequent unrelated
 // metric must never overwrite an earlier explicit reverse-layout value.
 // Preserve exact category evidence without relying on numeric roast color.
 for(let i=1;i<tokens.length;i++){
  if(!reverseLayout)break;
  const label=tokens[i],kind=getKey(label.text);
  if(!kind||!['roast_level','origin','variety','process','elevation_m','agtron','drying_method','harvest_season','preferred_extraction'].includes(kind))continue;
  const prior=tokens[i-1];
  if(label.parent!==prior.parent||label.at-prior.end>260||getKey(prior.text)||!isInfoText(prior.text))continue;
  if(kind==='roast_level'&&!/^(Ultra Light|Very Light|Light|Light-Medium|Medium.Light|Medium|Medium-Dark|Dark)$/i.test(prior.text))continue;
  if(kind==='elevation_m'&&!parseCoffeeElevation(prior.text))continue;
  if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(prior.text))continue;
  field(fields,label.text,prior.text,add,extras,clean);
 }
 // Also support heading-then-value sections (PERC and SEY), but never
 // convert unlabeled Light/Medium spectrum endpoints into a roast choice.
 for(let i=0;i<tokens.length;i++){
  const tok=tokens[i],kind=getKey(tok.text);
  if(!kind)continue;
  if(reverseLayout&&tok.tag==='div'&&/^[A-Z][A-Z ]{3,}$/.test(tok.text))continue;
  for(let j=i+1;j<Math.min(i+5,tokens.length);j++){
   const next=tokens[j];
   if(next.parent!==tok.parent)break;
   if(next.at-tok.end>650)break;
   if(getKey(next.text))break;
   if(!isInfoText(next.text))continue;
   // Skip decorative SVG and empty layout blocks; do not combine values.
   if(next.text.length>190 && kind!=='tasting_notes')break;
   if(kind==='roast_level'){
    const labels=tokens.slice(i+1,i+6).filter(x=>
     /^(?:Ultra Light|Very Light|Light|Light-Medium|Medium.Light|Medium|Medium-Dark|Dark)$/i.test(x.text));
    if(labels.length!==1)break;
   }
   if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(next.text))break;
   field(fields,tok.text,next.text,add,extras,clean);
   break;
  }
 }

}
// Read the description belonging to the selected coffee, never the
// navbar, unrelated recommendations, an Agtron FAQ, or another product.
// Product title inference is permitted only when the story corroborates it.
function detailedCoffeeNarrative(page,fields,extras,clean,addField){
 // Nested heading icons/spans on actual PERC pages can prevent a plain
 // "<h2>THE DEETS!</h2>" token match. First prefer structured section
 // boundaries, then fall back to the BOUNDED, current-product-only
 // plain-text segment between this coffee's story heading and its brew FAQ.
 const headings=[...page.matchAll(/<h[2-5]\b[^<>]{0,350}>([\s\S]{0,500}?)<\/h[2-5]\s*>/gi)];
 const section=headings.find(h=>/^(?:the deets!?|the story|about this coffee|coffee story|the details!?|about the coffee)$/i.test(clean(h[1],95)));
 let story='';
 if(section){
  const after=page.slice(section.index+section[0].length,section.index+section[0].length+8500);
  const stop=after.search(/<h[2-5]\b[^<>]{0,2000}>[\s\S]{0,350}?(?:brew\s+recc?s|brew\s+recommendations?|what.s\s+agtron|related products|more coffees|you may also like)/i);
  story=clean(stop>=0?after.slice(0,stop):after,5000);
 }
 if(!story||story.length<35){
  const text=clean(page,12000),start=text.search(/\b(?:the deets|the story|about this coffee|coffee story|the details|about the coffee)\b/i);
  if(start<0)return;
  let tail=text.slice(start).slice(0,6200);
  const stop=tail.search(/\b(?:brew\s+recc?s|brew\s+recommendations?|what.s\s+agtron|more stuff|related products|you may also like)\b/i);
  if(stop>=0)tail=tail.slice(0,stop);
  story=tail.slice(0,5000);
 }
 if(!story||story.length<35)return;
 // A product story can explain techniques this lot did NOT use, describe a
 // previous harvest, or teach general coffee processing. Those sentences
 // must not become positive canonical claims through this legacy fallback.
 story=story.split(/(?<=[.!?])\s+/u).filter(sentence=>!/\b(?:not|never|without|neither|unlike|isn't|wasn't|doesn't|rather than|generally|typically|usually|for example|such as|other coffees?|previous (?:harvest|lot|year)|last year)\b/i.test(sentence)).join(' ');
 if(!story)return;
 // Only the selected product's own bounded coffee story can supply
 // narrative tasting notes. Don't pull sensory prose from processing FAQs.
 if(!fields.tasting_notes){
  const tasting=story.match(/\b(?:with|featuring|showing|reveals?)\s+(?:tasting\s+)?notes?\s+of\s+([^.!?;]{8,150})(?=[.!?;]|$)/i);
  if(tasting&&/\b(?:coffee|cup|taste|flavo[u]?r|profile)\b/i.test(story.slice(Math.max(0,tasting.index-115),tasting.index)))
   addField('tasting_notes',tasting[1].trim());
 }
 const heading=(page.match(/<h1\b[^<>]{0,2000}>([\s\S]{1,260}?)<\/h1>/i)||[])[1]||'';
 // fields.name is already the matched source Product identity; storefront
 // H1 text may be nested, elided, or a short SEO heading. Require the
 // same producer entity to occur in THIS product's story regardless.
 const title=clean(fields.name||heading,150).replace(/^(?:Kenya|Ethiopia|Colombia|Brazil|Honduras|Rwanda|Burundi|Peru|Panama|Guatemala|Mexico|Costa Rica|Uganda|Nicaragua|Ecuador|Bolivia|Tanzania)\s+/i,'');
 const farm=title.match(/^([\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,5}\s+(?:Estate|Farm))$/iu);
 if(!fields.producer&&farm&&story.toLocaleLowerCase().includes(farm[1].toLocaleLowerCase()))
  fields.producer=farm[1];
 if(!fields.producer){
  const named=story.match(/\b(?:from|grown\s+(?:at|on)|produced\s+(?:by|at))\s+([\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,5}\s+(?:Estate|Farm))\b/iu);
  if(named&&clean(heading,200).toLocaleLowerCase().includes(named[1].toLocaleLowerCase()))
   fields.producer=named[1];
 }
 // Only a named grower explicitly credited in the selected lot's narrative
 // can fill producer when farm/estate corroboration was unavailable.
 if(!fields.producer){
  const grower=story.match(/\b([A-ZÀ-Ý][a-zà-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’.-]+){1,2})\s+produces\s+[^.!?]{0,125}?\bat\s+(?:his|her|their)\s+(?:farm|estate)\b/u);
  if(grower)addField('producer',grower[1]);
 }
 // Preserve Natural as the drying style, but choose the more informative
 // single-select Anaerobic only when THIS coffee's narrative explicitly
 // describes the anaerobic-natural fermentation.
 const isAnaerobicNatural=/\banaerobic[\s-]+natural\b/i.test(story);
 const oxygenLimited=/\bferment(?:ed|ing)?\s+anaerobically\b/i.test(story)&&
  /\b(?:sealed\s+tanks?|oxygen[\s-]+limited)\b/i.test(story);
 if((isAnaerobicNatural||oxygenLimited)&&(fields.process==='Natural'||!fields.process)){
  if(extras.processing_detail&&
     !/^(?:adv(?:anced)?[\s-]+natural|natural(?:[\s-]+processed)?)$/i.test(extras.processing_detail))return;
  fields.process='Anaerobic';
  const fermentation=story.split(/(?<=[.!?])\s+/u).find(sentence=>/\b(?:anaerobic|anaerobically)\b/i.test(sentence)&&/\b(?:ferment|tanks?)\w*/i.test(sentence))||'';
  const hours=fermentation.match(/\b(\d{1,3})\s*(?:[- ]hours?|h)\b/i);
  const original=extras.processing_detail||'Natural';
  extras.processing_detail=`${original}; anaerobic natural${hours?', '+hours[1]+'-hour sealed-tank fermentation':''}`.slice(0,160);
 }
}
function selectedMarkup(html){
 return productMarkup(html).slice(0,60000);
}
export function extractLayoutEvidence(html,{fields,addField,clean,hasOriginConflict=()=>false}){
 html=productMarkup(html);
 const extras={},page=selectedMarkup(html);
 // An adjacent Country/Region icon-caption pair inside this exact selected
 // product is direct locality evidence, unlike SEO or a generic farm story.
 const iconCountryRegion=selectedIconCountryRegion(html,{clean});
 if(iconCountryRegion)addField('Origin',iconCountryRegion);
 const onyxMetric=/<div\b[^<>]{0,2000}class=["'][^"']{0,2000}a-stat[^"']{0,2000}["'][^<>]{0,2000}data-name=["']roast-level["']/i.test(html);
 if(onyxMetric){
  // Onyx publishes many general education sections on the product URL.
  // The actual coffee has named a-stat fields. Only read those source
  // blocks, never a distant paragraph titled "Producer"/"Extraction".
  for(const m of html.matchAll(/<div\b[^<>]{0,2000}class=["'](?:[^"']{0,1000}\s)?a-stat(?:\s[^"']{0,1000})?["'][^<>]{0,2000}>[\s\S]{0,2900}?<p\b[^<>]{0,2000}>([\s\S]{1,650}?)<\/p>/gi)){
   const p=m[1],label=(p.match(/<label\b[^<>]{0,2000}>([^<>]{2,75})<\/label>/i)||[])[1];
   if(!label)continue;
   const value=p.split(/<br\s*\/?\s*>/i)[0];
   field(fields,clean(label,80),value,addField,extras,clean);
   if(getKey(label)==='roast_level'){
    const num=(p.match(/\bAgtron\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)/i)||[])[1];
    if(num)addExtra(extras,'agtron',num);
   }
  }
  // Named Onyx Elevation modal belongs to this matched product; skip all
  // neighboring educational prose and unnamed numeric measures.
  if(!fields.elevation_m){
   const altitude=html.match(/<div\b[^<>]{0,800}\bclass=["'][^"']{0,2000}\ba-stat-desc\b[^"']{0,2000}["'][^<>]{0,2000}\bdata-stat-id=["']elevation["'][^<>]{0,2000}>[\s\S]{0,650}?<h[2-5]\b[^<>]{0,2000}>\s*Elevation\s*<\/h[2-5]>[\s\S]{0,220}?<h[3-6]\b[^<>]{0,2000}>\s*(\d{3,4}\s*(?:MASL|m))\s*<\/h[3-6]>/i);
   if(altitude)addField('elevation_m',altitude[1]);
  }
  if(!fields.tasting_notes){
   const found=extractProductFlavorEvidence(html,{clean,origin:fields.origin,originConflict:hasOriginConflict()});
   if(found)addField('tasting_notes',found);
  }
  return extras;
 }
 // Paired identity/processing specifications preserve station names, accents
 // and narrative processing facts without guessing from importer biographies.
 const delimited=extractDelimitedCoffeeSpecs(page,{clean});
 for(const [key,value] of Object.entries(delimited.fields))addField(key,value);
 for(const [key,value] of Object.entries(delimited.details))addExtra(extras,key,value);
 // Proud Mary renders certain product attributes with the value inside an
 // <a> rather than a <p>. Read text only; never follow javascript: hrefs.
 // Named widgets can follow large decorative SVGs. Scan the bounded product
 // scope, not the shorter generic-token window, so valid late facts survive.
 for(const block of html.matchAll(/<div\b[^<>]{0,2000}class=["'][^"']{0,2000}meta-info[^"']{0,2000}["'][^<>]{0,2000}>([\s\S]{0,1150}?)<\/div>/gi)){
  const m=block[1].match(/<p\b[^<>]{0,2000}class=["'][^"']{0,2000}meta-title[^"']{0,2000}["'][^<>]{0,2000}>([^<>]{2,90})<\/p>[\s\S]{0,380}?<(?:a|p)\b[^<>]{0,2000}>([^<>]{1,220})<\/(?:a|p)>/i);
  if(m)field(fields,clean(m[1],80),m[2],addField,extras,clean);
 }
 // PERC Shopify layouts render headings and values several nested elements
 // apart; no arbitrary cross-heading pairing is allowed.
 for(const m of html.matchAll(/<h2\b[^<>]{0,2000}>([\s\S]{1,85}?)<\/h2>((?:(?!<h2\b)[\s\S]){0,5200}?)<h6\b[^<>]{0,2000}>([^<>]{2,190})<\/h6>/gi)){
  const label=clean(m[1],75);
  if(getKey(label))field(fields,label,m[3],addField,extras,clean);
 }
 // Onyx uses a named product metric followed by a <label> inside the same
 // compact <p>, e.g. "Ultra Light<br>Agtron #133<br><label>ROAST LEVEL".
 // Only the explicit selected value counts, not Agtron inferred darkness.
 for(const m of html.matchAll(/<div\b[^<>]{0,2000}class=["'][^"']{0,2000}a-stat[^"']{0,2000}["'][^<>]{0,2000}data-name=["'](?:roast-level|variety|process-method|elevation|origin|harvest-season)["'][\s\S]{0,2900}?<p\b[^<>]{0,2000}>([\s\S]{1,650}?)<\/p>/gi)){
  const label=(m[1].match(/<label\b[^<>]{0,2000}>([^<>]{2,75})<\/label>/i)||[])[1];
  if(!label)continue;
  const first=m[1].split(/<br\s*\/?\s*>/i)[0];
  field(fields,clean(label,80),first,addField,extras,clean);
  const agtron=(m[1].match(/\bAgtron\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)/i)||[])[1];
  if(agtron)addExtra(extras,'agtron',agtron);
 }
 // SEY encodes process in a release-specific product title component:
 // ETHIOPIAN LANDRACE - WASHED, never as a generic roast/brand heuristic.
 // Its other named title components explicitly label producer and country.
 // coffeeTitle_farm can instead contain a size separation, so it is excluded.
 for(const match of html.matchAll(/<span\b[^<>]{0,1500}\bclass=["'][^"']{0,500}\bcoffeeTitle_(producer|country)\b[^"']{0,500}["'][^<>]{0,1500}>([^<>]{2,150})<\/span>/gi)){
  field(fields,match[1].toLowerCase(),match[2],addField,extras,clean);
 }
 // A named location directly beside the selected WooCommerce title supplies
 // its country. Restrict this label-free pattern to explicit country names;
 // an address, marketing phrase or related product cannot fill geography.
 const location=html.match(/<h1\b[^<>]{0,2000}>[\s\S]{1,500}?<\/h1>\s*<div\b[^<>]{0,1500}\bclass=["'][^"']{0,500}\bproduct-drilldown__content--info__location\b[^"']{0,500}["'][^<>]{0,1500}>([^<>]{2,90})<\/div>/i);
 if(location){
  const country=clean(location[1],90);
  if(/^(?:Panama|Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Papua New Guinea|DR Congo|United States|Jamaica)$/i.test(country))addField('Country',country);
 }
 const sey=(html.match(/<span\b[^<>]{0,2000}class=["'][^"']{0,2000}coffeeTitle_varietyProcess[^"']{0,2000}["'][^<>]{0,2000}>([^<>]{3,140})<\/span>/i)||[])[1];
 if(sey){
  const m=clean(sey,140).match(/\s[-–]\s(Washed|Natural|Honey|Anaerobic)\s*$/i);
  if(m&&!fields.process)addField('process',m[1]);
 }
 // Structural semantic facts scan the full already-bounded product, so a
 // large gallery cannot hide late metric cards. Handled caption ranges are
 // excluded from the older token parser to avoid pairing in both directions.
 const semantic=extractSemanticCoffeeSpecs(html,{clean});
 for(const fact of semantic.facts)field(fields,fact.label,fact.value,addField,extras,clean);
 const parents=new Map(coffeeHtmlElements(page).nodes.map(node=>[node.start,node.parent]));
 const tokens=[...page.matchAll(leaf)].slice(0,850).map(m=>({
  at:m.index,end:m.index+m[0].length,parent:parents.get(m.index),tag:m[1].toLowerCase(),text:clean(m[2],260)
 })).filter(m=>m.text&&!semantic.handledRanges.some(range=>m.at>=range.start&&m.end<=range.end));
 parsePairs(tokens,fields,addField,extras,clean);
 // Explicit inline paragraph style, including French and pipe-delimited specs.
 for(const t of tokens){
  const p=t.text.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|]|\s+[-–]\s+)\s*(.{2,240})$/u);
  if(p)field(fields,p[1],p[2],addField,extras,clean);
 }
 // Some roasters put the label and value into a single flat text node or
 // nested rich-text wrapper that leaf tokenization cannot match.
 const visible=page.replace(/<[^<>]{0,2000}>/g,'\n');
 const rows=visible.split(/\n/).map(x=>clean(x,280)).filter(Boolean).slice(0,450);
 for(const r of rows){
  const p=r.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|]|\s+[-–]\s+)\s*(.{2,230})$/u);
  if(p)field(fields,p[1],p[2],addField,extras,clean);
 }
 // Only when the product title itself ends in an explicit processing tag,
 // use that value as a fallback; "Ultra Light" is NEVER inferred from title
 // brand, flavor notes or an unlabeled chart.
 if(!fields.process){
  const h1=page.match(/<h1\b[^<>]{0,2000}>([\s\S]{0,440}?)<\/h1>/i);
  const title=h1?clean(h1[1],250):'';
  const m=title.match(/(?:\s[-|]\s|\s\/\/\s)(Washed|Natural|Honey|Anaerobic)\s*$/i);
  if(m)addField('process',m[1]);
 }
 // Explicit named profiles and a full bounded prose reader take precedence
 // over the older short-window narrative fallback. Gallery bytes cannot
 // hide a later real flavor sentence, and labels beat incidental prose.
 if(!fields.tasting_notes){
  const found=extractProductFlavorEvidence(html,{clean,origin:fields.origin,originConflict:hasOriginConflict()});
  if(found)addField('tasting_notes',found);
 }
 // "In the cup we find ..." is explicit tasting prose. Strip punctuation
 // after one short sentence; do not turn the whole page into tasting notes.
 if(!fields.tasting_notes){
  for(const paragraph of page.matchAll(/<(?:p|li)\b[^<>]{0,1200}>([\s\S]{1,900}?)<\/(?:p|li)>/gi)){
   const txt=clean(paragraph[1],300);
   for(const sentence of txt.split(/(?<=[.!?])\s+/u)){
    const m=sentence.match(/^(?:in the cup we find|notes of)\s+([\p{L}][^.!?;]{8,130})[.!?;]?$/iu);
    if(m&&/(?:\band\b|,)/i.test(m[1])){addField('tasting_notes',m[1].trim());break;}
   }
   if(fields.tasting_notes)break;
  }
 }
 // A large product's decorative HTML can push its story beyond the
 // 60 KB metric-token window. The full source is still already bounded,
 // stripped of navigation and unrelated products by productMarkup().
 detailedCoffeeNarrative(html,fields,extras,clean,addField);
 if(!fields.tasting_notes){
  const found=extractProductFlavorEvidence(html,{clean,origin:fields.origin,originConflict:hasOriginConflict()});
  if(found)addField('tasting_notes',found);
 }
 return extras;
}
