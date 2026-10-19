// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official
// roaster verification and never promotes a canonical record.
import {extractRoastVisualEvidence} from './roast-level-evidence.mjs';
import {extractLayoutEvidence} from './coffee-product-layouts.mjs';
import {extractNarrativeCoffeeEvidence} from './coffee-narrative-evidence.mjs';
import {extractCoffeeBlendEvidence} from './coffee-blend-evidence.mjs';
import {extractProductEspressoReference} from './coffee-espresso-evidence.mjs';
import {semanticCoffeeSourceText} from './coffee-semantic-source.mjs';
import {productMarkup} from './coffee-product-scope.mjs';
import {interpretAgtron,agtronExplanation} from './agtron-roast.mjs';
const FIELD_ALIASES={
 origin:['origin','country','country of origin','region','coffee origin','région','location','growing region','país','pais','país de origen','origine','pays','región'],
 elevation_m:['elevation','altitude','elevation m','altitude masl','grown at','altitude (masl)','altura','altitud'],
 process:['process','processing','processing method','processing style','traitement','treatment','process method','proceso','procesamiento','processo'],
 variety:['variety','varietal','cultivar','cultivars','varieties','varietals','variété','variété(s)','variedad','variedades'],
 producer:['producer','farm','farmer','grower','cooperative','co-op','farm/co-op','producteur','washing station','productor','productora','finca','produtor'],
 roast_level:['roast','roast level','roast profile'],
 tasting_notes:['tasting notes','taste notes','flavor notes','flavour notes','cup notes','flavors','flavours','notes','reminds us of','tastes like','flavor profile','flavour profile','cupping notes','notas de cata','notas de sabor','sabores'],
 release_label:['harvest','harvest year','harvest date','crop year','lot','lot number','release','release year','cosecha','fecha de cosecha']
};
const LOOKUP=new Map(Object.entries(FIELD_ALIASES).flatMap(([field,names])=>names.map(name=>[keyOf(name),field])));
function keyOf(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function entities(s){
 const replace={'amp':'&','quot':'"','apos':"'",'lt':'<','gt':'>','nbsp':' ','ndash':'–','mdash':'—','bull':'•'};
 return String(s??'').replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,(s,key)=>{
  const lower=key.toLowerCase();
  if(lower in replace)return replace[lower];
  if(lower.startsWith('#')){
   const hex=lower.startsWith('#x'),n=Number.parseInt(lower.slice(hex?2:1),hex?16:10);
   if(Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff))return String.fromCodePoint(n);
  }
  return s;
 });
}
function clean(s,max=250){
 return entities(String(s??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
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
 for(const m of String(tag).matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){
  out[m[1].toLowerCase()]=entities(m[2]??m[3]);
 }
 return out;
}
function pageMeta(html){
 const r={};
 for(const match of html.match(/<meta\b[^>]{0,1600}>/gi)||[]){
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
 for(const match of html.matchAll(/<script\b([^>]{0,1000})>([\s\S]*?)<\/script\s*>/gi)){
  const at=attrs(match[1]);
  if((at.type||'').toLowerCase()!=='application/ld+json'||match[2].length>250000)continue;
  try{walk(JSON.parse(match[2]),result);}catch{/* Malformed page JSON isn't evidence. */}
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
function normalized(field,value){
 const s=textOf(value,field==='tasting_notes'?650:220);
 if(!s)return '';
 if(field==='tasting_notes'){
  // An explicit product flavor label sometimes includes a prose lead-in.
  // Keep the roaster's actual listed notes, not the words "coffee with notes of".
  // Remove only this anchored, clearly extraneous introductory phrase.
  const labelled=s.match(/^(?:this )?coffee\s+(?:with|has)\s+(?:tasting\s+)?notes?\s+of\s+(.+)$/i);
  return labelled?labelled[1].replace(/[.!?]+\s*$/,'').trim():s;
 }
 if(field==='roast_level'){
  const norm=s.toLowerCase().replace(/[\s_-]/g,'');
  return norm==='lightmedium'?'Medium-Light':ROAST.find(x=>x.toLowerCase().replace(/[\s-]/g,'')===norm)||'';
 }
 if(field==='process'){
  // This is one anaerobic treatment with a natural drying subtype,
  // not an ambiguous Washed & Natural blend.
  if(/\b(?:anaerobic[\s-]+natural|natural[\s-]+anaerobic)\b/i.test(s))
   return 'Anaerobic';
  const norm=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // Different components of a blend can have different processes; the
  // canonical single-select field must not silently say "Washed" if the
  // roaster actually says "Washed & Natural".
  const found=[
   ['Anaerobic',/\b(?:anaerobic|anaerobico|anaerobica)\b/],['Honey',/\b(?:honey|miel)\b/],
   ['Washed',/\b(?:washed|lavado|lavada)\b/],['Natural',/\bnatural\b/]
  ].filter(([,re])=>re.test(norm)).map(([name])=>name);
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
 if(key==='producer'&&/^(?:since|est(?:ablished)?\.?|founded)\s+(?:19|20)\d{2}$/i.test(s))return;
 // Withhold contradictory categorical/release evidence instead of silently
 // preferring stale JSON-LD. Compound processes must stay unsimplified.
 const anaerobicNatural=key==='process'&&/\b(?:anaerobic[\s-]+natural|natural[\s-]+anaerobic)\b/i.test(textOf(value));
 const compound=key==='process'&&!anaerobicNatural&&new Set(textOf(value).toLowerCase().match(/\b(?:washed|natural|honey|anaerobic)\b/g)||[]).size>1;
 if(conflicts&&(compound||(s&&fields[key]&&['process','roast_level','release_label'].includes(key)&&
    keyOf(s)!==keyOf(fields[key])))){
  conflicts.add(key);delete fields[key];return;
 }
 if(fields[key])return;
 if(s)fields[key]=s;
}
function productDetails(fields,p){
 const brand=textOf(p.brand??p.manufacturer);
 if(brand&&!fields.roaster)fields.roaster=brand;
 for(const row of Array.isArray(p.additionalProperty)?p.additionalProperty.slice(0,80):[]){
  addField(fields,row?.name,row?.value);
 }
 // Merchant descriptions often embed origin/processing and roast level in a
 // simple product specification, not in structured Product properties.
 const description=String(p.description??'');
 if(description&&description.length<=16000)labeledPairs(description,fields);
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
 for(const tag of Array.isArray(p.tags)?p.tags.slice(0,60):[]){
  if(typeof tag!=='string')continue;
  const m=tag.match(/^(origin|process|roast(?: level)?|variety|tasting notes|region|producer)\s*[:=]\s*(.{2,130})$/i);
  if(m)addField(fields,m[1],m[2]);
 }
}
function focusedProductText(html){
 const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]{0,320}?)<\/h1>/gi)];
 const start=h1.length===1?h1[0].index:0;
 let crop=html.slice(start,start+25000);
 const end=crop.search(/<h[2-4][^>]*>\s*(?:more coffees|you may also like|related products|shop similar)/i);
 if(end>400)crop=crop.slice(0,end);
 return clean(crop,6500);
}
function explicitNearbyFacts(html,fields){
 const near=focusedProductText(html).slice(0,2600);
 if(!fields.variety){
  const v=near.match(/\b(Heirloom|Bourbon|Typica|Caturra|Catuai|Catuaí|Gesha|Geisha|SL28|SL34|Pacamara|Castillo|Bourbon Sidra)\s+variet(?:y|ies)\b/i);
  if(v)fields.variety=clean(v[1],100);
 }
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
 const h1=html.match(/<h1\b[^>]*>[\s\S]{0,320}?<\/h1>/i);
 if(h1)focused=html.slice(h1.index,h1.index+16000);
 const paragraphs=[...focused.matchAll(/<p\b[^>]{0,350}>([\s\S]{1,450}?)<\/p>/gi)]
  .map(m=>clean(m[1],200)).filter(Boolean).slice(0,24);
 const originIndex=paragraphs.findIndex(p=>/^[A-Z][A-Za-z'-]{2,}(?:\s+[A-Z][A-Za-z'-]{2,}){0,3},\s*[A-Z][A-Za-z'-]{3,}(?:\s+[A-Z][A-Za-z'-]{2,}){0,3}$/.test(p));
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
 // A heading such as "850 small scale producers" next to an explicit
 // "PRODUCER" metric identifies a producer group, not the crop year.
 if(!fields.producer){
  for(const m of html.matchAll(/<h([23])\b[^>]*>([\s\S]{1,200}?)<\/h\1>/gi)){
   const label=clean(m[2],120);
   if(!/^(?:\d{1,5}\s+)?(?:small[ -]?scale\s+)?(?:small[ -]?holder\s+)?(?:producers?|farmers?|cooperatives?|[A-Z][A-Za-z' ]{2,50})$/i.test(label))continue;
   // Only count a nearby explicit metric label before any *other* heading.
   // Otherwise an unrelated "Heirloom Variety" or "Roast Level" heading
   // could accidentally be assigned to the producer field.
   const following=html.slice(m.index+m[0].length,m.index+m[0].length+300).split(/<h[1-6]\b/i)[0];
   if(/\bPRODUCER\b/i.test(clean(following,200))){
    fields.producer=label;
    break;
   }
  }
 }
 // Never infer harvest or roast from surrounding promotional prose.
}
function explicitEspressoRecipe(html){
 // Some roasters publish equipment-specific Espresso recipes alongside V60
 // and AeroPress recipes. Scope strictly to the named Espresso heading, not
 // the adjacent filter method, and never invent missing dose/yield/time.
 for(const h of html.matchAll(/<h([2-6])\b[^>]{0,400}>([^<>]{0,95}\bEspresso\b[^<>]{0,65})<\/h\1>/gi)){
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
 const compact=html.match(/<p\b[^>]*class=["'][^"']*meta-title[^"']*["'][^>]*>\s*Espresso\s*\|\s*Filter\s*<\/p>[\s\S]{0,450}?<p\b[^>]*>\s*Ratio\s*1\s*:\s*(\d(?:\.\d{1,2})?)\s*\|\s*1\s*:\s*\d/i);
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
 const matches=[...html.matchAll(/<h1\b[^>]*>([\s\S]{0,400}?)<\/h1>/gi)]
  .map(m=>clean(m[1],170)).filter(x=>x&&!/^(shop|home|coffee|products|search|menu)$/i.test(x));
 const distinct=[...new Set(matches.map(x=>x.toLowerCase()))];
 return distinct.length===1?matches[0]:'';
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
 for(const m of html.matchAll(/<dt\b[^>]*>([\s\S]{0,180}?)<\/dt>\s*<dd\b[^>]*>([\s\S]{0,800}?)<\/dd>/gi)){
  addField(fields,clean(m[1],80),clean(m[2],600));
 }
 for(const m of html.matchAll(/<tr\b[^>]*>\s*<(?:th|td)\b[^>]*>([\s\S]{0,200}?)<\/(?:th|td)>\s*<td\b[^>]*>([\s\S]{0,800}?)<\/td>/gi)){
  addField(fields,clean(m[1],80),clean(m[2],600));
 }
 // On some pages a single coffee-info paragraph uses line breaks for
 // multiple labeled fields. Parse each explicitly delimited part separately,
 // instead of turning every later fact into a massive "Tasting Notes" value.
 // Shopify SEO description metadata is intentionally excluded.
 for(const m of html.matchAll(/<(?:p|li)\b[^>]*>([\s\S]{0,900}?)<\/(?:p|li)>/gi)){
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
 for(const m of html.matchAll(/<script\b([^>]{0,700})>([\s\S]{0,180000}?)<\/script>/gi)){
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
export function extractPublicCoffeeFacts(html,{source_url,include_semantic_text=false}={}){
 if(typeof html!=='string'||html.length>1_000_000||!source_url)return {ok:false,reason:'invalid_source'};
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
   let brand=meta['og:site_name']||'';
   // Onyx does not emit a conventional Product JSON-LD/H1/og:title on the
   // observed product page. Its canonical URL matches the exact handle and
   // HTML <title> is a release-specific name followed by the roaster. Do
   // not create an identity from the URL slug or a category page alone.
   if(!title&&likelyPath){
    const canonical=(html.match(/<link\b[^>]{0,950}\brel\s*=\s*["']canonical["'][^>]*>/i)||[])[0]||'';
    const declared=attrs(canonical).href||'';
    if(declared&&samePage(declared,source_url)){
     const rawTitle=clean((html.match(/<title\b[^>]*>([\s\S]{1,240}?)<\/title>/i)||[])[1]||'',200);
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
 const siteName=textOf(meta['og:site_name'],200);
 if(!fields.roaster&&siteName&&!/^(?:online store|shopify|home|products?)$/i.test(siteName))
  fields.roaster=siteName;
 // Avoid stray articles/related-product labels on custom Onyx storefronts.
 // The product's named a-stat metrics supply its selected factual labels.
 const product=productMarkup(html);
 const onyxMetrics=/<div\b[^>]*class=["'][^"']*a-stat[^"']*["'][^>]*data-name=["']roast-level["']/i.test(product);
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
  if(blend.multi_country)delete fields.origin;
  if(blend.multi_process)delete fields.process;
 }
 const roaster_recipe=explicitEspressoRecipe(product)||extractProductEspressoReference(product);
 // An extracted value is a suggestion, never proof of an official source.
 // Keep unexpected/absent facts blank instead of guessing.
 return {ok:true,source:'unverified_public_page',fields,available:Object.keys(fields),
  ...(conflicts.size?{conflicts:[...conflicts].sort()}:{}),
  ...(roaster_recipe?{roaster_recipe}:{}),
 ...(include_semantic_text?{semantic_text:semanticCoffeeSourceText(product,{name:fields.name,roaster:fields.roaster})}:{}),
  ...(Object.keys(roaster_details).length?{roaster_details}:{}),
  ...(roast_evidence.hint?{roast_hint:roast_evidence.hint}:{}),
  ...(roast_evidence.value?{roast_source:roast_evidence.source}:{}),
  note:'Best-effort webpage suggestions. The roaster, lot and release still require verification.'};
}
