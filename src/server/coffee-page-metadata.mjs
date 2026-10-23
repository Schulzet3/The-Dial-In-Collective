import {rawElements,removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official
// roaster verification and never promotes a canonical record.
import {extractRoastVisualEvidence} from './roast-level-evidence.mjs';
import {extractLayoutEvidence} from './coffee-product-layouts.mjs';
import {extractNarrativeCoffeeEvidence} from './coffee-narrative-evidence.mjs';
import {extractCoffeeBlendEvidence} from './coffee-blend-evidence.mjs';
import {extractProductEspressoReference} from './coffee-espresso-evidence.mjs';
import {productMarkup} from './coffee-product-scope.mjs';
import {interpretAgtron,agtronExplanation} from './agtron-roast.mjs';
import {COFFEE_FIELD_ALIASES} from './coffee-semantic-specs.mjs';
import {equivalentCoffeeVarieties} from './coffee-fact-compatibility.mjs';
import {extractProductImageTextEvidence} from './coffee-flavor-evidence.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
const FIELD_ALIASES=COFFEE_FIELD_ALIASES;
const LOOKUP=new Map(Object.entries(FIELD_ALIASES).flatMap(([field,names])=>names.map(name=>[keyOf(name),field])));
function keyOf(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function readableRoaster(s){
 const raw=String(s||'').trim();
 // Some Shopify sites publish an internal host slug (tim-wendelboe-no)
 // instead of a public-facing roaster. Drop only a terminal country TLD.
 if(!/^[a-z]+(?:-[a-z]+){2,}$/.test(raw))return raw;
 const parts=raw.split('-');
 if(parts.at(-1).length===2)parts.pop();
 return parts.map(part=>part[0].toUpperCase()+part.slice(1)).join(' ');
}
const LATIN_ENTITIES=Object.fromEntries('aacute:á agrave:à acirc:â atilde:ã auml:ä aring:å aelig:æ ccedil:ç eacute:é egrave:è ecirc:ê euml:ë iacute:í igrave:ì icirc:î iuml:ï ntilde:ñ oacute:ó ograve:ò ocirc:ô otilde:õ ouml:ö oslash:ø oelig:œ uacute:ú ugrave:ù ucirc:û uuml:ü yacute:ý yuml:ÿ szlig:ß'.split(' ').map(pair=>pair.split(':')));
function entities(s){
 const replace={'amp':'&','quot':'"','apos':"'",'lt':'<','gt':'>','nbsp':' ','ndash':'–','mdash':'—','bull':'•','bullet':'•','rsquo':'’','lsquo':'‘'};
 return String(s??'').replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,(s,key)=>{
  const lower=key.toLowerCase();
  if(lower in replace)return replace[lower];
  if(LATIN_ENTITIES[lower])return key[0]===key[0].toUpperCase()?LATIN_ENTITIES[lower].toUpperCase():LATIN_ENTITIES[lower];
  if(lower.startsWith('#')){
   const hex=lower.startsWith('#x'),n=Number.parseInt(lower.slice(hex?2:1),hex?16:10);
   if(Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff))return String.fromCodePoint(n);
  }
  return s;
 });
}
function clean(s,max=250){
 return entities(removeElements(String(s??''),['script','style'])
  .replace(/<[^<>]{0,2000}>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
  .replace(/\s+/g,' ').trim()).slice(0,max);
}
function textOf(v,max=250){
 if(typeof v==='string'||typeof v==='number')return clean(v,max);
 if(Array.isArray(v))return v.slice(0,5).map(x=>textOf(x,80)).filter(Boolean).join(', ').slice(0,max);
 if(v&&typeof v==='object')return textOf(v.name??v.value??v.text??'',max);
 return '';
}
function attrs(tag){
 const out={};
 for(const m of String(tag).matchAll(/(?:^|[\s<])([:\w-]{1,64})\s*=\s*(?:"([^"]{0,2000})"|'([^']{0,2000})')/g)){
  out[m[1].toLowerCase()]=entities(m[2]??m[3]);
 }
 return out;
}
function pageMeta(html){
 const r={};
 for(const match of html.match(/<meta\b[^<>]{0,1600}>/gi)||[]){
  const a=attrs(match);
  const k=(a.property||a.name||'').toLowerCase();
  if(k&&a.content)r[k]=clean(a.content,k==='description'?650:250);
 }
 return r;
}
function walk(value,out,depth=0,budget={n:0}){
 if(depth>9||++budget.n>450||!value||typeof value!=='object')return;
 if(Array.isArray(value)){
  for(const child of value.slice(0,80))walk(child,out,depth+1,budget);
  return;
 }
 const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
 // A Shopify ProductGroup is the release-level parent and its child
 // Products are purchase variants (size/grind), not separate coffees.
 // Only an explicit named ProductGroup with its own product URL may become
 // the parent candidate. Same-page matching happens before selection.
 if(types.some(t=>String(t||'').toLowerCase()==='product')&&typeof value.name==='string')
  out.push(value);
 else if(types.some(t=>String(t||'').toLowerCase()==='productgroup')&&
         typeof value.name==='string'&&typeof value.url==='string')
  out.push(value);
 for(const key of ['@graph','mainEntity','itemListElement','hasVariant','isVariantOf','offers']){
  if(value[key])walk(value[key],out,depth+1,budget);
 }
}
function jsonProducts(html){
 const result=[];
 for(const block of rawElements(html)){
  if(block.attributes.length>1000)continue;
  const at=attrs(block.attributes);
  if(!block.closed||(at.type||'').toLowerCase()!=='application/ld+json'||block.body.length>250000)continue;
  try{walk(JSON.parse(block.body),result);}catch{/* Malformed page JSON isn't evidence. */}
 }
 return result.slice(0,30);
}
function samePage(raw,target){
 try{
  const a=new URL(raw,target),b=new URL(target);
  const host=x=>x.toLowerCase().replace(/^www\./,'');
  const path=x=>x.replace(/\/+$/,'');
  if(host(a.hostname)!==host(b.hostname))return false;
  if(path(a.pathname)===path(b.pathname))return true;
  const handle=x=>x.match(/\/(?:products)\/([^/]+)\/?$/i)?.[1]||'';
  return !!handle(a.pathname)&&handle(a.pathname)===handle(b.pathname);
 }catch{return false;}
}
const ROAST=['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark'];
const conflictsByFields=new WeakMap();
const producerEvidenceByFields=new WeakMap();
const farmEvidenceByFields=new WeakMap();
const geographyByFields=new WeakMap();
const ORIGIN_COUNTRIES=new Set('Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|China|Vietnam|Laos|Myanmar|Papua New Guinea|DR Congo|United States|Jamaica'.split('|').map(keyOf));
const geographyParts=value=>[...new Set(String(value).split(/\s*(?:,|\/|;|&|\+|\band\b)\s*|\s+[-–—|]\s+/i).map(keyOf).filter(Boolean))];
function compatibleGeography(first,second){
 if(keyOf(first)===keyOf(second))return first;
 const a=geographyParts(first),b=geographyParts(second);
 if(a.every(part=>b.includes(part)))return second;
 if(b.every(part=>a.includes(part)))return first;
 return null;
}
// Some merchants flatten <br>-separated specifications into one field.
// Stop at the NEXT explicit key, including concatenated CamelCase labels:
// e.g. "Lime, Tea Origin: Kenya" or "GedebElevation: 1900m".
// We intentionally do not guess flavor/origin facts from arbitrary prose.
function cleanTrailingProductLabels(text){
 const key=/(?:Tasting Notes?|Flavou?r Notes?|Cupping Notes?|Origin|Country(?: of Origin)?|Region|Elevation|Altitude|Farm\/Co-?op|Farm|Producer|Variet(?:y|ies|al|als)|Process(?:ing)?(?: Method)?|Roast(?: Level)?|Harvest(?: Year)?|Shipping|Quantity)\s*:/gi;
 let first=text.length;
 for(const match of text.matchAll(key)){
  // The leading label can legitimately be the value if a source already
  // retained it. Only subsequent key-value blocks are contamination.
  if(match.index>0&&match.index<first)first=match.index;
 }
 return text.slice(0,first).trim();
}
function normalized(field,value){
 const raw=textOf(value,field==='tasting_notes'?650:220);
 if(!raw)return '';
 const s=['tasting_notes','origin','producer','variety','elevation_m','release_label'].includes(field)?
  cleanTrailingProductLabels(raw):raw;
 if(!s)return '';
 if(field==='tasting_notes'){
  // An explicit product flavor label sometimes includes a prose lead-in.
  // Keep the roaster's actual listed notes, not the words "coffee with notes of".
  // Remove only this anchored, clearly extraneous introductory phrase.
  const labelled=s.match(/^(?:this )?coffee\s+(?:with|has)\s+(?:tasting\s+)?notes?\s+of\s+(.+)$/i);
  return (labelled?labelled[1].replace(/[.!?]+\s*$/,'').trim():s)
   .replace(/\s*[•·]\s*/g,', ').replace(/(?:,\s*)+$/,'').trim();
 }
 if(field==='roast_level'){
  const norm=s.toLowerCase().replace(/[\s_-]/g,'');
  return norm==='lightmedium'?'Medium-Light':ROAST.find(x=>x.toLowerCase().replace(/[\s-]/g,'')===norm)||'';
 }
 if(field==='process'){
  // This is one anaerobic treatment with a natural drying subtype,
  // not an ambiguous Washed & Natural blend.
  if(/\b(?:anaerob(?:ic|ico|ica)[\s-]+natural|natural[\s-]+anaerob(?:ic|ico|ica))\b/i.test(s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))
   return 'Anaerobic';
  const norm=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // Different components of a blend can have different processes; the
  // canonical single-select field must not silently say "Washed" if the
  // roaster actually says "Washed & Natural".
  const found=[
   ['Anaerobic',/\b(?:anaerobic|anaerobico|anaerobica)\b/],['Honey',/\b(?:honey|miel)\b/],
   ['Washed',/\b(?:washed|lavado|lavada)\b/],['Natural',/\bnatural\b/]
  ].filter(([,re])=>re.test(norm)).map(([name])=>name);
  if(/^(?:other\s*\/\s*unknown|other|unknown|mixed)$/i.test(norm.trim()))return 'Other/Unknown';
  // Explicitly combined methods (not an anaerobic-natural single process)
  // use the approved dropdown's Other/Unknown while retaining source text.
  if(found.length>1&&/\s(?:and|&)\s|\s*[+,\/|]\s*|\s*;\s*|\s*,\s*/i.test(norm))
   return 'Other/Unknown';
  return found.length===1?found[0]:'';
 }
 return s;
}
function addField(fields,rawKey,value){
 // Layout extractors may pass either a visible roaster label or an
 // already-resolved internal field key such as release_label. Never drop a
 // supported canonical key just because its display synonym is absent.
 const key=Object.hasOwn(FIELD_ALIASES,rawKey)?rawKey:LOOKUP.get(keyOf(rawKey));
 if(!key)return;
 const conflicts=conflictsByFields.get(fields);
 if(conflicts?.has(key))return;
 const s=normalized(key,value);
 // Storefront reverse-layout metrics can accidentally assign the RELATIONSHIP
 // year to the neighboring PRODUCER label (observed on Wuri / Uraga).
 if(key==='producer'&&(/^(?:since|est(?:ablished)?\.?|founded)\s+(?:19|20)\d{2}$/i.test(s)||
   /^(?:coffee\s+)?growers?\s+from\b/i.test(s)))return;
 // A farm and its named grower are complementary source facts. Preserve
 // the farm separately and prefer an explicit producer over a farm fallback.
 if(key==='producer'&&s){
  const farm=/^(?:farm|farms|finca)$/i.test(String(rawKey).trim());
  if(farm){
   if(!farmEvidenceByFields.has(fields))farmEvidenceByFields.set(fields,s);
   if(fields.producer)return;
   producerEvidenceByFields.set(fields,'farm');
  }else if(producerEvidenceByFields.get(fields)==='farm'){
   fields.producer=s;producerEvidenceByFields.set(fields,'producer');return;
  }else producerEvidenceByFields.set(fields,'producer');
 }
 if(key==='origin'&&s){
  const label=keyOf(rawKey),geography=geographyByFields.get(fields)||{};
  const part=/^(?:country|countryoforigin|pais|paisdeorigen|pays)$/.test(label)?'country':
   /^(?:region|growingregion)$/.test(label)?'region':null;
  const reject=()=>{conflicts?.add('origin');delete fields.origin;geographyByFields.delete(fields);};
  // Country evidence also appears under Origin/Origen or inside a fuller
  // region-country value. A narrower label cannot overwrite a different
  // explicit country, even before its Region counterpart has arrived.
  const countries=geographyParts(s).filter(value=>ORIGIN_COUNTRIES.has(value)).sort();
  if(!countries.length&&part==='country')countries.push(...geographyParts(s).sort());
  if(countries.length&&geography.countries?.length&&countries.join('|')!==geography.countries.join('|')){
   reject();return;
  }
  if(countries.length)geography.countries=countries;
  if(part){
   const value=geography[part]?compatibleGeography(geography[part],s):s;
   if(!value){reject();return;}
   geography[part]=value;
  }else{
   // Keep a small deduplicated set of original untyped values. Waiting for
   // the typed pair permits Origin:Huila as well as Origin:Colombia, while
   // still checking every earlier source once that pair is complete.
   geography.origins??=[];
   if(!geography.origins.some(value=>keyOf(value)===keyOf(s))){
    if(geography.origins.length>=16){reject();return;}
    geography.origins.push(s);
   }
  }
  geographyByFields.set(fields,geography);
  if(geography.country&&geography.region){
   const region=geography.region,country=geography.country;
   let combined=keyOf(region).includes(keyOf(country))?region:region+', '+country;
   for(const origin of geography.origins||[]){
    combined=compatibleGeography(combined,origin);
    if(!combined){reject();return;}
   }
   fields.origin=combined;
   return;
  }
 }
 // Withhold contradictory categorical/release evidence instead of silently
 // preferring stale JSON-LD. Compound processes must stay unsimplified.
 // A truly mixed-process product is explicitly Other/Unknown, not blank.
 // Once its mixture is documented, a narrower single-method summary should
 // not override it. Contradictory single methods still require review.
 if(key==='process'&&s==='Other/Unknown'){
  fields.process='Other/Unknown';return;
 }
 if(key==='process'&&fields.process==='Other/Unknown')return;
 if(conflicts&&(s&&fields[key]&&['process','roast_level','release_label','variety'].includes(key)&&
    (key==='variety'?!equivalentCoffeeVarieties(s,fields[key]):keyOf(s)!==keyOf(fields[key])))){
  conflicts.add(key);delete fields[key];return;
 }
 if(fields[key])return;
 if(s)fields[key]=s;
}
function productDetails(fields,p){
 const brand=textOf(p.brand??p.manufacturer);
 if(brand&&!fields.roaster)fields.roaster=readableRoaster(brand);
 for(const row of Array.isArray(p.additionalProperty)?p.additionalProperty.slice(0,80):[]){
  addField(fields,row?.name,row?.value);
 }
 // Product JSON-LD and storefront metadata may include HTML or plain-text
 // labels, often separated by BR, newlines or semicolons (not HTML tables).
 // Only the selected Product's explicitly labeled lines are evidence.
 const description=String(p.description??'');
 if(description&&description.length<=16000){
  labeledPairs(description,fields);
  const delimited=description.replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi,'\n')
   .replace(/<[^<>]{0,800}>/g,' ');
  for(const line of delimited.split(/\r?\n|\s*;\s*/).slice(0,45)){
   const m=clean(line,450).match(/^([\p{L}][\p{L} .&/'-]{1,36})\s*[:：]\s*(.{2,270})$/u);
   if(m&&LOOKUP.has(keyOf(m[1])))addField(fields,m[1],m[2]);
  }
 }
 for(const [key,value] of Object.entries(p)){
  if(['additionalProperty','offers','description','brand','manufacturer','image'].includes(key))continue;
  addField(fields,key,value);
 }
 const details=p.metafields??p.metadata??p.attributes??p.options??null;
 if(details&&typeof details==='object'&&!Array.isArray(details)){
  for(const [key,value] of Object.entries(details).slice(0,80)){
   // Some Shopify theme metafields use {value:"Light"} / nested custom.
   if(key==='custom'&&value&&typeof value==='object'&&!Array.isArray(value)){
    for(const [sub,subValue] of Object.entries(value).slice(0,50))addField(fields,sub,subValue);
   }else addField(fields,key,value);
  }
 }
 const tags=(Array.isArray(p.tags)?p.tags.slice(0,60):[]).filter(tag=>typeof tag==='string');
 const tagPairs=tags.map(tag=>tag.match(/^(origin|process|roast(?: level)?|variety|tasting notes|region|producer)\s*[:=]\s*(.{2,130})$/i)).filter(Boolean);
 const originTags=tagPairs.filter(pair=>pair[1].toLowerCase()==='origin');
 let blendOrigin='';
 // An explicitly blend-tagged Product can list one origin country per tag
 // (e.g. Onyx Geometry). Combine only that same-product component cohort;
 // independent descriptions, attributes and visible labels still pass through
 // the ordinary whole-product geography conflict checks.
 if(tags.some(tag=>/^type\s*[:=]\s*blend\s*$/i.test(tag))&&originTags.length>1&&
    originTags.every(pair=>ORIGIN_COUNTRIES.has(keyOf(pair[2])))){
  const countries=new Map();
  for(const pair of originTags)if(!countries.has(keyOf(pair[2])))countries.set(keyOf(pair[2]),pair[2].trim());
  const joined=[...countries.values()].join(', ');
  if(joined.length<=220)blendOrigin=joined;
 }
 let blendOriginAdded=false;
 for(const pair of tagPairs){
  if(blendOrigin&&pair[1].toLowerCase()==='origin'){
   if(!blendOriginAdded)addField(fields,'origin',blendOrigin);
   blendOriginAdded=true;
  }else addField(fields,pair[1],pair[2]);
 }
}
function focusedProductText(html){
 const h1=[...html.matchAll(/<h1\b[^<>]{0,2000}>([\s\S]{0,320}?)<\/h1>/gi)];
 const start=h1.length===1?h1[0].index:0;
 let crop=html.slice(start,start+25000);
 const end=crop.search(/<h[2-4][^<>]{0,2000}>\s*(?:more coffees|you may also like|related products|shop similar)/i);
 if(end>400)crop=crop.slice(0,end);
 return clean(crop,6500);
}
function explicitNearbyFacts(html,fields){
 const near=focusedProductText(html).slice(0,2600);
 if(!fields.process){
  const combo=/\b(washed|natural|honey|anaerobic)\s*(?:&|and|\/|,)\s*(washed|natural|honey|anaerobic)\s+(?:processed|process)\b/i.test(near);
  if(!combo){
   const p=near.match(/\b(fully washed|washed|natural|honey|anaerobic)\s+(?:processed|process)\b/i);
   if(p)fields.process=normalized('process',p[1]);
  }
 }
 if(!fields.elevation_m){
  const m=near.match(/\b(\d{3,4}\s*(?:[-–]\s*\d{3,4})?)\s*m(?:asl|eters?\s*(?:above sea level)?)/i);
  if(m)fields.elevation_m=m[1].replace(/\s+/g,' ').trim()+' masl';
 }
 // Some coffee labels place "Gedeb, Ethiopia" and a flavor list in
 // adjacent product <p> elements. Read the discrete elements, never combine
 // navigation/header words into a fabricated origin.
 let focused=html;
 const h1=html.match(/<h1\b[^<>]{0,2000}>[\s\S]{0,320}?<\/h1>/i);
 if(h1)focused=html.slice(h1.index,h1.index+16000);
 const paragraphs=[...focused.matchAll(/<(p|h[2-6])\b[^<>]{0,350}>([\s\S]{1,450}?)<\/\1>/gi)]
  .map(m=>clean(m[2],200)).filter(Boolean).slice(0,40);
 const originIndex=paragraphs.findIndex(p=>/^[\p{L}\p{M}][\p{L}\p{M} .’'&/-]{1,135},\s*(?:Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|China|Vietnam|Laos|Myanmar|Papua New Guinea|DR Congo|United States|Jamaica|Hawaii)$/iu.test(p));
 if(originIndex>=0){
  if(!fields.origin)fields.origin=paragraphs[originIndex];
  if(!fields.tasting_notes){
   const candidate=paragraphs[originIndex+1]||'';
   const following=paragraphs[originIndex+2]||'';
   if(/^[a-z][a-z' -]{2,45}(?:,\s*[a-z][a-z' -]{2,45}){2,5}$/i.test(candidate)&&
     /\b(?:washed|natural|honey|anaerobic)\s+process\b/i.test(following)){
    fields.tasting_notes=candidate;
   }
  }
 }
 // Never infer harvest or roast from surrounding promotional prose.
}
function explicitEspressoRecipe(html){
 // Some roasters publish equipment-specific Espresso recipes alongside V60
 // and AeroPress recipes. Scope strictly to the named Espresso heading, not
 // the adjacent filter method, and never invent missing dose/yield/time.
 for(const h of html.matchAll(/<h([2-6])\b[^<>]{0,400}>([^<>]{0,95}\bEspresso\b[^<>]{0,65})<\/h\1>/gi)){
  const title=clean(h[2],85);
  if(!/\bEspresso\b/i.test(title)||/^(?:Espresso\s*\|\s*Filter|Espresso Recipe|Filter\s*(?:&|and)\s*Espresso)$/i.test(title))continue;
  let block=html.slice(h.index+h[0].length,h.index+h[0].length+2100);
  const next=block.search(/<h[2-4]\b/i);if(next>80)block=block.slice(0,next);
  const recipe=clean(block,1600);
  const dose=recipe.match(/\bDOSE\s*:?\s*(\d{1,2}(?:\.\d)?)\s*g\b/i);
  const yieldG=recipe.match(/\bYIELD\s*:?\s*(\d{1,3}(?:\.\d)?)\s*g\b/i);
  const time=recipe.match(/\bTIME\s*:?\s*(?:(\d):)?(\d{1,2})(?:\s*(?:s|sec|seconds))?\b/i);
  if(!dose||!yieldG||!time)continue;
  const input=Number(dose[1]),output=Number(yieldG[1]);
  const seconds=Number(time[2])+(time[1]?60*Number(time[1]):0);
  if(input<5||input>40||output<5||output>150||seconds<5||seconds>80)continue;
  const result={dose_g:input,yield_g:output,time_s_min:seconds,time_s_max:seconds,
   method:title};
  const temp=recipe.match(/\bTEMP\s*:?\s*(\d{2,3}(?:\.\d)?)\s*°?\s*(F|C)\b/i);
  if(temp&&Number(temp[1])>=40&&Number(temp[1])<=220)
   result.temperature=temp[1]+'°'+temp[2].toUpperCase();
  return result;
 }
 // Proud Mary provides an Espresso 1:2.5 alongside Filter 1:16 but does
 // NOT publish the dose, output mass or seconds. Expose a ratio reference
 // without fabricating a full recipe or inserting a default dose.
 const text=focusedProductText(html);
 // Proud Mary uses its product-specific meta-info block and often puts
 // this before the H1 and far from the short main-title crop.
 const compact=html.match(/<p\b[^<>]{0,2000}class=["'][^"']{0,2000}meta-title[^"']{0,2000}["'][^<>]{0,2000}>\s*Espresso\s*\|\s*Filter\s*<\/p>[\s\S]{0,450}?<p\b[^<>]{0,2000}>\s*Ratio\s*1\s*:\s*(\d(?:\.\d{1,2})?)\s*\|\s*1\s*:\s*\d/i);
 if(compact){
  const ratio=Number(compact[1]);
  if(ratio>=1&&ratio<=5)return {ratio,method:'Espresso'};
 }
 const ratioOnly=text.match(/\bEspresso\s*\|\s*Filter\b[\s\S]{0,130}?\bRatio\s*1\s*:\s*(\d(?:\.\d{1,2})?)\s*\|\s*1\s*:/i);
 if(ratioOnly){
  const ratio=Number(ratioOnly[1]);
  if(ratio>=1&&ratio<=5)return {ratio,method:'Espresso'};
 }

 const i=text.search(/\bEspresso\b/i);
 if(i<0)return null;
 const snippet=text.slice(i,i+750);
 const dose=snippet.match(/\bCOFFEE\s+IN\s*:?\s*(\d{1,2}(?:\.\d)?)\s*g\b/i);
 const yieldMass=snippet.match(/\bESPRESSO\s+OUT\s*:?\s*(\d{1,3}(?:\.\d)?)\s*g\b/i);
 const time=snippet.match(/\bBREW\s+TIME\s*:?\s*(\d{1,2}(?:\.\d)?)\s*(?:[-–]\s*(\d{1,2}(?:\.\d)?))?\s*s(?:ec|econds?)?\b/i);
 if(!dose||!yieldMass||!time)return null;
 const input=Number(dose[1]),output=Number(yieldMass[1]),first=Number(time[1]),last=Number(time[2]||time[1]);
 if(input<5||input>40||output<5||output>150||first<5||first>80||last<first||last>80)return null;
 return {dose_g:input,yield_g:output,time_s_min:first,time_s_max:last};
}
function productHeading(html){
 const page=productMarkup(html),{nodes}=coffeeHtmlElements(page);
 const matches=nodes.filter(node=>node.tag==='h1'&&node.contentEnd-node.headEnd<=10000&&
  /^<\/h1\s*>/i.test(page.slice(node.contentEnd,node.end))).slice(0,20).map(node=>{
   const content=removeElements(page.slice(node.headEnd,node.contentEnd),['svg','audio','button','style','script']);
   // Animated headings can wrap every letter in nested spans. Only join
   // single-character leaves within explicitly grouped words; ordinary
   // multiword headings retain their normal spaces and accents.
   const words=[...content.matchAll(/<div\b[^<>]{0,1000}\bclass=["'][^"']{0,400}\bword\b[^"']{0,400}["'][^<>]{0,1000}>([\s\S]{1,5000}?)<\/div>/gi)];
   if(words.length&&words.length<=16){
    const reconstructed=words.map(word=>{
     const chars=[...word[1].matchAll(/<span\b[^<>]{0,500}>([^<>]{0,20})<\/span>/gi)]
      .map(char=>entities(char[1]));
     const joined=chars.join('').trim();
     const complete=clean(word[1],250).replace(/\s+/g,'')===joined.replace(/\s+/g,'');
     return complete&&chars.length>=1&&chars.length<=80&&chars.every(char=>[...char].length===1||/^[^\p{M}]\p{M}$/u.test(char))?joined:'';
    });
    const rest=content.replace(/<div\b[^<>]{0,1000}\bclass=["'][^"']{0,400}\bword\b[^"']{0,400}["'][^<>]{0,1000}>([\s\S]{1,5000}?)<\/div>/gi,'');
    if(reconstructed.every(Boolean)&&!clean(rest,200))return reconstructed.join(' ').slice(0,170);
   }
   return clean(content,170);
  }).filter(x=>x&&!/^(shop|home|coffee|products|search|menu)$/i.test(x));
 const distinct=[...new Set(matches.map(x=>x.toLowerCase()))];
 return distinct.length===1?matches[0]:'';
}
// A shop-wide SEO heading on a deep Ecwid/Wix URL is not proof that any
// individual coffee is selected. Never invent product identity from it.
function genericStorefrontHeading(value){
 const s=clean(value,180);
 return /^(?:store|shop|catalog|online store|products?|all products?|shop all)(?:\s*[|:\u2013\u2014-].*)?$/i.test(s)||
  /^.{2,90}?\s*[:|\u2013\u2014-]\s*(?:store|shop|catalog|online store|products?|all products?)$/i.test(s);
}
function removeSiteSuffix(title,site){
 const raw=clean(title,200),siteName=clean(site,120);
 if(!siteName||!raw.toLowerCase().endsWith(siteName.toLowerCase()))return raw;
 const stem=raw.slice(0,-siteName.length).replace(/[\s|–—-]+$/g,'').trim();
 return stem||raw;
}
function labeledPairs(html,fields){
 // Structured specifications: <dt>Label</dt><dd>Value</dd>,
 // <tr><th>Label</th><td>Value</td></tr> and common flat key:value.
 for(const m of html.matchAll(/<dt\b[^<>]{0,2000}>([\s\S]{0,180}?)<\/dt>\s*<dd\b[^<>]{0,2000}>([\s\S]{0,800}?)<\/dd>/gi)){
  addField(fields,clean(m[1],80),clean(m[2],600));
 }
 for(const m of html.matchAll(/<tr\b[^<>]{0,2000}>\s*<(?:th|td)\b[^<>]{0,2000}>([\s\S]{0,200}?)<\/(?:th|td)>\s*<td\b[^<>]{0,2000}>([\s\S]{0,800}?)<\/td>/gi)){
  addField(fields,clean(m[1],80),clean(m[2],600));
 }
 // On some pages a single coffee-info paragraph uses line breaks for
 // multiple labeled fields. Parse each explicitly delimited part separately,
 // instead of turning every later fact into a massive "Tasting Notes" value.
 // Shopify SEO description metadata is intentionally excluded.
 for(const m of html.matchAll(/<(?:p|li)\b[^<>]{0,2000}>([\s\S]{0,900}?)<\/(?:p|li)>/gi)){
  const parts=m[1].split(/<br\s*\/?\s*>/gi);
  for(const part of parts.slice(0,14)){
   const str=clean(part,420);
   const label=str.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|]|\s+[-–]\s+)\s*(.{2,300})$/u);
   if(label)addField(fields,label[1],label[2]);
  }
 }
}
function shopifyProduct(html,target){
 // Inline, static Shopify/WooCommerce product JSON: no eval and no JS fetch.
 const out=[];
 for(const block of rawElements(html)){
  if(!block.closed||block.attributes.length>700||block.body.length>180000)continue;
  const m=[null,block.attributes,block.body];
  const a=attrs(m[1]);
  if((a.type||'').toLowerCase()!=='application/json'||!/product/i.test(JSON.stringify(a)))continue;
  try{
   const p=JSON.parse(m[2]);
   if(!p||typeof p!=='object'||typeof p.title!=='string')continue;
   if(p.url&&!samePage(p.url,target))continue;
   out.push({name:p.title,brand:p.vendor||'',additionalProperty:[],description:p.description||'',metafields:p.metafields||p.metadata||{},tags:p.tags||[],attributes:p.attributes||{},url:p.url||null});
  }catch{}
 }
 return out;
}
export function extractPublicCoffeeFacts(html,{source_url}={}){
 if(typeof html!=='string'||html.length>2_000_000||!source_url)return {ok:false,reason:'invalid_source'};
 const meta=pageMeta(html);
 const all=[...jsonProducts(html),...shopifyProduct(html,source_url)];
 const linked=all.filter(p=>p.url&&samePage(p.url,source_url));
 const unlinked=all.filter(p=>!p.url);
 const selected=linked.length?linked:unlinked;
 const unique=[...new Map(selected.map(p=>[keyOf(textOf(p.name)),p]).filter(([key])=>key)).values()];
 let p=unique.length===1?unique[0]:null;
 if(unique.length>1){
  // Shopify's JSON-LD graph can list a current Product followed by eight
  // purchase/size variants, all assigned its canonical URL. The exact
  // product title in og:title is required; unrelated products stay rejected.
  const ogName=clean(meta['og:title']||'',200);
  const exact=unique.filter(row=>keyOf(textOf(row.name))===keyOf(ogName));
  if(exact.length===1&&exact[0].url&&samePage(exact[0].url,source_url))p=exact[0];
  else return {ok:false,reason:'ambiguous_or_missing_product'};
 }
 if(!p){
  let likelyPath=false;
  try{likelyPath=/\/(products?|coffee|coffees|beans?|shop)\/[^/]+/i.test(new URL(source_url).pathname);}catch{}
  const ogType=String(meta['og:type']||'');
  if(/^product(?:\.|$)/i.test(ogType)||likelyPath){
   let title=productHeading(html)||removeSiteSuffix(meta['og:title']||'',meta['og:site_name']);
   if(genericStorefrontHeading(title))title='';
   let brand=meta['og:site_name']||'';
   // Onyx does not emit a conventional Product JSON-LD/H1/og:title on the
   // observed product page. Its canonical URL matches the exact handle and
   // HTML <title> is a release-specific name followed by the roaster. Do
   // not create an identity from the URL slug or a category page alone.
   if(!title&&likelyPath){
    const canonical=(html.match(/<link\b[^<>]{0,950}\brel\s*=\s*["']canonical["'][^<>]{0,2000}>/i)||[])[0]||'';
    const declared=attrs(canonical).href||'';
    if(declared&&samePage(declared,source_url)){
     const rawTitle=clean((html.match(/<title\b[^<>]{0,2000}>([\s\S]{1,240}?)<\/title>/i)||[])[1]||'',200);
     const bits=rawTitle.split(/\s+[–—]\s+/);
     if(bits.length===2&&bits[0].length>3&&bits[1].length>2&&bits[1].length<100){
      title=bits[0];brand=bits[1];
     }
    }
   }
   if(title)p={name:title,brand,additionalProperty:[],description:meta.description||''};
  }
 }
 if(!p||!textOf(p.name))return {ok:false,reason:'ambiguous_or_missing_product'};
 const fields={name:textOf(p.name,200)},conflicts=new Set();
 conflictsByFields.set(fields,conflicts);
 productDetails(fields,p);
 // Repeated JSON-LD/inline nodes may describe the same selected product.
 // Deduplicating its title must not discard contradictory roast, process,
 // or release evidence. Retain the chosen node's precedence for compatible
 // facts, and run equivalent nodes through the same conflict checks.
 const identity=keyOf(textOf(p.name));
 for(const equivalent of selected){
  if(equivalent!==p&&keyOf(textOf(equivalent.name))===identity)productDetails(fields,equivalent);
 }
 // An actual, literal lot number in the selected Product title is stronger
 // than an inferred harvest based on a URL, SKU, publication date or country.
 // Preserve exact source text; never manufacture release identifiers.
 if(!fields.release_label){
  const lot=textOf(p.name,200).match(/\bLot\s*#?\s*\d{1,4}(?:[\/-]\d{1,4}){0,2}\b/i);
  if(lot)fields.release_label=lot[0].replace(/\s+/g,' ').trim();
 }
 const siteName=textOf(meta['og:site_name'],200);
 if(!fields.roaster&&siteName&&!/^(?:online store|shopify|home|products?)$/i.test(siteName))
  fields.roaster=readableRoaster(siteName);
 // WooCommerce may identify the roaster only as this Product's seller.
 // Require its explicit roastery name and same-site URL; an arbitrary
 // marketplace seller or unrelated graph Organization is not a roaster.
 if(!fields.roaster&&p.url&&samePage(p.url,source_url)){
  const sellers=(Array.isArray(p.offers)?p.offers.slice(0,20):[p.offers]).map(offer=>offer?.seller);
  const candidates=new Set();
  for(const seller of sellers){
   const name=textOf(seller?.name,150);
   if(!/\b(?:coffee\s+roasters?|roastery|coffee\s+lab)\b/i.test(name)||typeof seller?.url!=='string')continue;
   try{
    const sellerUrl=new URL(seller.url),sourceUrl=new URL(source_url);
    if(sellerUrl.protocol==='https:'&&sellerUrl.hostname.replace(/^www\./,'')===sourceUrl.hostname.replace(/^www\./,''))candidates.add(name);
   }catch{/* Invalid seller URL is not identity evidence. */}
  }
  if(candidates.size===1)fields.roaster=[...candidates][0];
 }
 // Avoid stray articles/related-product labels on custom Onyx storefronts.
 // The product's named a-stat metrics supply its selected factual labels.
 const product=productMarkup(html);
 const onyxMetrics=/<div\b[^<>]{0,2000}class=["'][^"']{0,2000}a-stat[^"']{0,2000}["'][^<>]{0,2000}data-name=["']roast-level["']/i.test(product);
 if(!onyxMetrics)labeledPairs(product,fields);
 // Source-backed storefront layouts beyond JSON-LD: metrics, localized
 // labels, reversed Onyx captions, honest extra facts and product notes.
 const roaster_details=extractLayoutEvidence(product,{
  fields,addField:(key,value)=>addField(fields,key,value),clean
 });
 // Supplement explicit page labels with current-coffee narrative evidence.
 // The canonical Process selector is coarse; keep complex fermentation and
 // farm/grower attributions as reviewable, noncanonical details.
 const narrative=extractNarrativeCoffeeEvidence(product,{name:fields.name,fields});
 for(const [key,value] of Object.entries(narrative.fields)){
  if(key==='process'&&fields.process&&fields.process!==value)continue;
  addField(fields,key,value);
 }
 for(const [key,value] of Object.entries(narrative.details)){
  if(!roaster_details[key]&&value)roaster_details[key]=value;
 }
 const farm=farmEvidenceByFields.get(fields);
 if(farm&&!roaster_details.farm)roaster_details.farm=farm;
 // The page's accessible image description sometimes transcribes the
 // selected bag's profile card. Read only explicit words attached to an
 // exact-name image; pixels, color, filenames and other coffees are ignored.
 const imageText=extractProductImageTextEvidence(product,{name:fields.name,clean});
 if(imageText.tasting_notes&&!fields.tasting_notes)addField(fields,'tasting_notes',imageText.tasting_notes);
 if(imageText.roast_level)addField(fields,'roast_level',imageText.roast_level);
 // JSON-LD additionalProperty can publish numeric roast color without an
 // HTML metric. Retain the measured value from this matched Product only.
 if(!roaster_details.agtron){
  const attrs=Array.isArray(p.additionalProperty)?p.additionalProperty:[];
  const evidence=attrs.find(row=>/^(?:ground\s+)?(?:agtron|roast\s+colou?r|agtron\s+(?:gourmet|commercial))$/i.test(String(row?.name||'').trim()));
  if(evidence){
   const reading=interpretAgtron(evidence.value,{scale:evidence.name});
   if(reading){
    roaster_details.agtron=reading.display;
    if(reading.scale!=='unspecified')roaster_details.agtron_scale=reading.scale;
    if(reading.sample!=='unspecified')roaster_details.agtron_sample=reading.sample.replace('_',' ');
   }
  }
 }

 // Coffee-specific product and brand metadata may be present in HTML meta tags
 // rather than JSON-LD (but never trust unrelated generic SEO prose).
 for(const [k,v] of Object.entries(meta)){
  if(/^(?:coffee[:._-]|product[:._-])(?:origin|process(?:ing)?|variety|producer|roast[_-]?level|harvest|elevation|tasting[_-]?notes)$/.test(k)){
   addField(fields,k.replace(/^(?:coffee|product)[:._-]/,''),v);
  }
 }
 if(!onyxMetrics)explicitNearbyFacts(product,fields);
 const roast_evidence=extractRoastVisualEvidence(product);
 if(roast_evidence.confidence==='conflict'){
  delete fields.roast_level;conflicts.add('roast_level');
 }
 if(roast_evidence.value){
  if(fields.roast_level&&fields.roast_level!==roast_evidence.value){
   delete fields.roast_level;
   conflicts.add('roast_level');
   roast_evidence.hint='The page contains inconsistent roast values; select the correct level from the roaster’s label.';
   roast_evidence.value=null;
  }else if(!fields.roast_level)fields.roast_level=roast_evidence.value;
 }
 // Agtron's manufacturer reference uses GROUND coffee and has two scales.
 // Show exact score and a reviewable seven-tier suggestion; an unspecified
 // scale/sample is provisional. Explicit labels and source conflicts win.
 const agtron=interpretAgtron(roaster_details.agtron||'',{
  scale:roaster_details.agtron_scale||'',sample:roaster_details.agtron_sample||''
 });
 if(agtron?.roast){
  const explicit=fields.roast_level||'';
  if(!explicit&&!conflicts.has('roast_level')){
   fields.roast_level=agtron.roast;
   roast_evidence.value=agtron.roast;
   roast_evidence.hint=agtronExplanation(agtron);
   roast_evidence.source=agtron.provisional?'agtron_provisional_review':'agtron_ground_anchor';
  }else if(explicit&&explicit!==agtron.roast){
   roast_evidence.hint=agtronExplanation(agtron,explicit);
  }
 }
 // Fallback extractors may directly set a field; a conflict remains final.
 for(const field of conflicts)delete fields[field];
 // An explicitly listed multi-component blend cannot be represented as one
 // country or processing category. Retain component facts for review.
 const blend=extractCoffeeBlendEvidence(product);
 if(blend){
  roaster_details.blend_components=blend.display;
  // List distinct evidenced countries in first-seen order, never label a
  // multi-origin blend with only one of its components' countries.
  if(blend.multi_country)fields.origin=blend.origins.join(', ');
  else if(!fields.origin&&blend.origins.length===1)fields.origin=blend.origins[0];
  // Only genuinely named farms/producers are used. An unlabeled component
  // coffee name alone is not enough evidence to assert its producer.
  if(blend.multi_producer)fields.producer=blend.producers.join(', ');
  else if(!fields.producer&&blend.producers.length===1)fields.producer=blend.producers[0];
  if(blend.multi_process){
   fields.process='Other/Unknown';
   roaster_details.processing_detail=blend.processes.join(', ');
  }else if(!fields.process&&blend.complete_process)fields.process=blend.processes[0];
 }
 // A later direct blend fallback cannot resurrect rejected geography.
 if(conflicts.has('origin'))delete fields.origin;
 const roaster_recipe=explicitEspressoRecipe(product)||extractProductEspressoReference(product);
 // An extracted value is a suggestion, never proof of an official source.
 // Keep unexpected/absent facts blank instead of guessing.
 return {ok:true,source:'unverified_public_page',fields,available:Object.keys(fields),
  ...(conflicts.size?{conflicts:[...conflicts].sort()}:{}),
  ...(roaster_recipe?{roaster_recipe}:{}),
  ...(Object.keys(roaster_details).length?{roaster_details}:{}),
  ...(roast_evidence.hint?{roast_hint:roast_evidence.hint}:{}),
  ...(roast_evidence.value?{roast_source:roast_evidence.source}:{}),
  note:'Best-effort webpage suggestions. The roaster, lot and release still require verification.'};
}
