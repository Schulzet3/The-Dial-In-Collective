import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
// Deterministic, evidence-only reading of the SELECTED product's visible text.
// Supplement existing labeled and structured parsers; never create Verified facts.
// No network calls, model invocation, hidden scripts or unrestricted site crawling.
import {productMarkup} from './coffee-product-scope.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';

const COUNTRY=String.raw`Panama|Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Papua New Guinea|DR Congo|United States|Jamaica`;
const ENTITIES={'amp':'&','nbsp':' ','quot':'"','apos':"'",'eacute':'é','ndash':'–','mdash':'—'};
function text(raw,max=300){
 return String(raw||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi,(all,key)=>{
  const k=key.toLowerCase();
  if(Object.hasOwn(ENTITIES,k))return ENTITIES[k];
  if(k[0]!=='#')return all;
  const n=k[1]==='x'?Number.parseInt(k.slice(2),16):Number.parseInt(k.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):all;
 }).replace(/\s+/g,' ').trim().slice(0,max);
}
function scopedPage(html){
 let p=removeElements(productMarkup(html),['svg']);
 const heading=/<h1\b[^<>]{0,2000}>[\s\S]{0,12500}?<\/h1>/i.exec(p);
 if(!heading)return '';
 p=p.slice(heading.index+heading[0].length,heading.index+heading[0].length+45000);
 const stop=p.search(/<h[2-6]\b[^<>]{0,2000}>[\s\S]{0,400}?(?:you may also like|related products|more coffees|shop similar|customer reviews|recently viewed)\b/i);
 return stop<0?p: p.slice(0,stop);
}
const PERSON=String.raw`([A-ZÀ-Ý][a-zà-ÿ'’.-]{1,30}(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’.-]{1,30}){1,2})`;
const BAD_PERSON=/^(?:Corvus Coffee|Proud Mary|Little Wolf|Our Coffee|The Coffee|This Coffee|Natural Process|Carbonic Maceration|Finca Deborah)$/i;
const LOC_RE=new RegExp(String.raw`\b((?:Finca|Hacienda|Farm|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,4})\s*,\s*(`+COUNTRY+String.raw`)\b`,'iu');
function foundGrower(paragraphs){
 for(const paragraph of paragraphs){
  if(paragraph.length>1000||/\b(?:generally|typically|for example|such as|learn about)\b/i.test(paragraph))continue;
  const patterns=[
   new RegExp(String.raw`\b(?:from\s+)?(?:producer|farmer|grower)\s+`+PERSON+String.raw`(?=\s+(?:and|of|who|at|on|in)\b|[,!.;]|$)`,'u'),
   new RegExp(String.raw`\b(?:grown|produced|cultivated|harvested|farmed)\s+by\s+`+PERSON+'\\b','u'),
   new RegExp(String.raw`\b(?:farmer|producer|grower|farm owner|estate owner)\s*(?:is|:|–|-)\s*`+PERSON+'\\b','iu'),
   new RegExp('\\b'+PERSON+String.raw`\s+(?:is|was)\s+(?:the|a)\s+(?:farmer|producer|grower)\b`,'u'),
   new RegExp('\\b'+PERSON+String.raw`\s+has\s+(?:taken|created|produced|developed)\b.{0,250}\b(?:coffees?|geishas?|geshas?|variet(?:y|ies)|process(?:ing)?)\b`,'iu')
  ];
  for(const re of patterns){
   const m=re.exec(paragraph);
   const candidate=m?.[1]?.replace(/\s+(?:Country|Origin|Region|Variety|Cultivar|Harvest|Elevation|Altitude|Process)(?:\s.*)?$/,'');
   if(candidate&&!BAD_PERSON.test(candidate)&&
       candidate.split(/\s+/).every(part=>/^\p{Lu}/u.test(part)))return candidate;
  }
 }
 return '';
}
const TECHNIQUE=/\b(?:carbonic maceration|anaerobic fermentation|co[\s-]?ferment(?:ation|ed)?|lactic fermentation|thermal shock|double fermentation|inoculated fermentation)\b/i;
const PRODUCTION=/\b(?:cherries|coffee|beans|ferment(?:ation|ed|ing)?|process(?:ed|ing)?|co2|carbon dioxide|tanks?|washing|washed)\b/i;
function processingDetail(headings,paragraphs){
 // Named processing headings are stronger evidence than incidental prose.
 const heading=headings.find(x=>x.length>5&&x.length<130&&TECHNIQUE.test(x)&&
  !/\b(?:what is|how does|learn|understanding|all about|guide to)\b/i.test(x));
 if(heading)return heading;
 for(const paragraph of paragraphs){
  if(paragraph.length>1100||!TECHNIQUE.test(paragraph)||!PRODUCTION.test(paragraph)||
     /\b(?:what is|in general|different types of|we also discuss|as a general rule|learn about)\b/i.test(paragraph))continue;
  const sentences=paragraph.match(/[^.!?]+[.!?]?/g)||[];
  const sentence=sentences.find(x=>TECHNIQUE.test(x)&&PRODUCTION.test(x));
  if(sentence)return sentence.trim().slice(0,190);
 }
 return '';
}
function locationFromHeadings(headings){
 for(const heading of headings.slice(0,16)){
  const m=heading.match(LOC_RE);
  if(m&&m[0].length===heading.length)return {farm:m[1],country:m[2]};
 }
 return null;
}
function explicitFarmOwnership(page){
 const {nodes}=coffeeHtmlElements(page);
 const headings=nodes.filter(node=>/^h[2-6]$/.test(node.tag));
 const found=new Map();
 for(let i=0;i<headings.length;i++){
  const heading=headings[i];
  if(heading.contentEnd-heading.headEnd>1500)continue;
  const title=text(page.slice(heading.headEnd,heading.contentEnd),100).replace(/\s+[+−-](?:\s*[+−-])?\s*$/,'');
  if(!/^(?:sobre la finca|acerca de la finca|about (?:this|the) farm)$/i.test(title))continue;
  const end=Math.min(headings[i+1]?.start??page.length,heading.end+5000);
  const paragraph=text(page.slice(heading.end,end),1500);
  // Literal farm ownership in the selected farm story, including a family
  // attribution. Generic farming explanations and other sections do not count.
  const match=paragraph.match(/^([A-ZÀ-Ý][\p{L}\p{M}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}\p{M}'’.-]*){0,4})\s+es propiedad de\s+([A-ZÀ-Ý][\p{L}\p{M}'’.-]+(?:\s+[A-ZÀ-Ý][\p{L}\p{M}'’.-]+){1,3}(?:\s+y su familia)?)(?=\s*[,.;])/u);
  if(match)found.set(match[1]+'\0'+match[2],{farm:match[1],producer:match[2]});
 }
 return found.size===1?[...found.values()][0]:null;
}
export function extractNarrativeCoffeeEvidence(html,{name='',fields={}}={}){
 if(typeof html!=='string'||html.length>2_000_000||!name)return {fields:{},details:{}};
 const page=scopedPage(html);
 if(!page)return {fields:{},details:{}};
 const headings=[...page.matchAll(/<h([2-6])\b[^<>]{0,2000}>([\s\S]{1,500}?)<\/h\1>/gi)]
  .map(m=>text(m[2],200)).filter(Boolean).slice(0,80);
 const paragraphs=[...page.matchAll(/<(?:p|li)\b[^<>]{0,2000}>([\s\S]{1,3000}?)<\/(?:p|li)>/gi)]
  .map(m=>text(m[1],1400)).filter(Boolean).slice(0,90);
 const prose=paragraphs.join(' ').slice(0,11000);
 const output={},details={};
 const ownership=explicitFarmOwnership(page);
 if(ownership){
  details.farm=ownership.farm;details.named_producer=ownership.producer;
  if(!fields.producer)output.producer=ownership.producer;
 }
 const place=locationFromHeadings(headings);
 if(place){
  details.farm=place.farm;
  if(!fields.origin)output.origin=place.country;
  if(!fields.producer)output.producer=place.farm;
 }
 // Farm and grower are not interchangeable; preserve distinct source facts.
 const namedGrower=foundGrower(paragraphs);
 if(namedGrower)details.named_producer=namedGrower;
 for(const p of paragraphs){
  const farm=p.match(/^(?:Farm|Estate|Finca)\s*[:：-]\s*((?:Finca|Hacienda|Farm|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}'’ -]{2,85})$/iu);
  if(farm&&!details.farm)details.farm=farm[1].slice(0,110);
  // An explicitly named grower's own farm is a separate fact, not an
  // interchangeable producer value. Keep the exact name and source casing.
  if(!details.farm&&namedGrower&&p.includes(namedGrower)&&p.length<=1000){
   const namedFarm=p.match(/\b(?:his|her|their)\s+(?:farm|estate)\s+([A-ZÀ-Ý][\p{L}\p{M}'’.-]*(?:\s+[A-ZÀ-Ý][\p{L}\p{M}'’.-]*){0,5})(?=\s+(?:is|was|has|where|in|and|produces|grows)\b|[,!.;]|$)/u);
   if(namedFarm)details.farm=namedFarm[1].slice(0,110);
  }
 }
 const technique=processingDetail(headings,paragraphs);
 if(technique){
  details.processing_detail=technique;
  // CO2-rich carbonic maceration is an oxygen-limited treatment. This
  // approximate fixed-category mapping is disclosed alongside source text.
  if(!fields.process&&/\b(?:carbonic maceration|anaerobic fermentation)\b/i.test(technique))
   output.process='Anaerobic';
 }
 if(technique&&/\b(?:before .*?\bwashed\b|then\s+washed\b|washed clean and dried)\b/i.test(prose))
  details.processing_detail=(technique+'; washed finish').slice(0,190);
 if(!fields.variety&&/\b(?:gesha|geisha)\b/i.test(name)&&
    /\b(?:experimental\s+geishas?|geshas?\s+(?:cultivar|variet)|geishas?\s+(?:cultivar|variet)|queen of variet(?:y|ies))\b/i.test(prose))
  output.variety='Gesha';
 // Narrative altitude is factual only when it carries a physical unit
 // and an explicit coffee-growth context. Generic how-to altitudes excluded.
 if(!fields.elevation_m){
  const m=prose.match(/\b(?:grown|cultivated|planted)\s+at\s+(\d[\d,]{2,4}(?:\s*[-–]\s*\d[\d,]{2,4})?)\s*(?:meters?|metres?|masl|m\.a\.s\.l\.)\b/i);
  if(m)output.elevation_m=m[1].replace(/,/g,'')+' masl';
 }
 return {fields:output,details};
}
