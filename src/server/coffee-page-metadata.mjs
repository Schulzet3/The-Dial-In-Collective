// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official
// roaster verification and never promotes a canonical record.
const FIELD_ALIASES={
 origin:['origin','country','country of origin','region','coffee origin'],
 elevation_m:['elevation','altitude','elevation m','altitude masl','grown at'],
 process:['process','processing','processing method','processing style'],
 variety:['variety','varietal','cultivar','varieties','varietals'],
 producer:['producer','farm','farmer','grower','cooperative','co-op'],
 roast_level:['roast','roast level','roast profile'],
 tasting_notes:['tasting notes','taste notes','flavor notes','flavour notes','cup notes','flavors','flavours','notes'],
 release_label:['harvest','harvest year','crop year','lot','lot number','release','release year']
};
const LOOKUP=new Map(Object.entries(FIELD_ALIASES).flatMap(([field,names])=>names.map(name=>[keyOf(name),field])));
function keyOf(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
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
 if(types.some(t=>String(t||'').toLowerCase()==='product')&&typeof value.name==='string'){
  out.push(value);
 }
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
  return a.hostname.toLowerCase()===b.hostname.toLowerCase()&&
   a.pathname.replace(/\/+$/,'')===b.pathname.replace(/\/+$/,'');
 }catch{return false;}
}
const ROAST=['Light','Light-Medium','Medium','Medium-Dark','Dark'];
const PROCESS=['Washed','Natural','Honey','Anaerobic','Other/Unknown'];
function normalized(field,value){
 const s=textOf(value,field==='tasting_notes'?650:220);
 if(!s)return '';
 if(field==='roast_level'){
  const norm=s.toLowerCase().replace(/[\s_-]/g,'');
  return ROAST.find(x=>x.toLowerCase().replace(/-/g,'')===norm)||'';
 }
 if(field==='process'){
  const norm=s.toLowerCase();
  if(norm.includes('anaerobic'))return 'Anaerobic';
  if(norm.includes('honey'))return 'Honey';
  if(norm.includes('washed'))return 'Washed';
  if(norm.includes('natural'))return 'Natural';
  return '';
 }
 return s;
}
function addField(fields,rawKey,value){
 const key=LOOKUP.get(keyOf(rawKey));
 if(!key||fields[key])return;
 const s=normalized(key,value);
 if(s)fields[key]=s;
}
function productDetails(fields,p){
 const brand=textOf(p.brand??p.manufacturer);
 if(brand&&!fields.roaster)fields.roaster=brand;
 for(const row of Array.isArray(p.additionalProperty)?p.additionalProperty.slice(0,80):[]){
  addField(fields,row?.name,row?.value);
 }
 for(const [key,value] of Object.entries(p)){
  if(['additionalProperty','offers','description','brand','manufacturer','image'].includes(key))continue;
  addField(fields,key,value);
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
  const p=near.match(/\b(fully washed|washed|natural|honey|anaerobic)\s+(?:processed|process)\b/i);
  if(p)fields.process=normalized('process',p[1]);
 }
 if(!fields.elevation_m){
  const m=near.match(/\b(\d{3,4}\s*(?:[-–]\s*\d{3,4})?)\s*m(?:asl|eters?\s*(?:above sea level)?)/i);
  if(m)fields.elevation_m=m[1].replace(/\s+/g,' ').trim()+' masl';
 }
 // Some coffee labels print "Gedeb, Ethiopia" followed by a short, explicit
 // comma-separated list immediately before "washed process". These are only
 // proposals shown to the user, not authoritative catalog facts.
 const origin=near.slice(0,600).match(/\b([A-Z][a-z'-]{2,}(?:\s+[A-Z][a-z'-]{2,}){0,3}),\s*([A-Z][a-z'-]{3,}(?:\s+[A-Z][a-z'-]{2,}){0,3})\b/);
 if(origin&&!fields.origin)fields.origin=clean(origin[1]+', '+origin[2],160);
 if(origin&&!fields.tasting_notes){
  const afterOrigin=near.slice(origin.index+origin[0].length,origin.index+origin[0].length+260);
  const notes=afterOrigin.match(/^\s*([a-z][a-z' -]{2,45}(?:,\s*[a-z][a-z' -]{2,45}){2,5})\s+(?:washed|natural|honey|anaerobic)\s+process\b/i);
  if(notes)fields.tasting_notes=clean(notes[1],320);
 }
 // Never infer harvest/producer/roast from surrounding promotional prose.
}
function explicitEspressoRecipe(html){
 const text=focusedProductText(html);
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
 return matches.length===1?matches[0]:'';
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
 // Only parse bounded labeled blocks, never arbitrary text across the page.
 for(const m of html.matchAll(/<(?:p|li)\b[^>]*>([\s\S]{0,550}?)<\/(?:p|li)>/gi)){
  const str=clean(m[1],420);
  const label=str.match(/^([A-Za-z][A-Za-z /-]{1,32})\s*[:\-–]\s*(.{2,300})$/);
  if(label)addField(fields,label[1],label[2]);
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
   out.push({name:p.title,brand:p.vendor||'',additionalProperty:[],description:p.description||''});
  }catch{}
 }
 return out;
}
export function extractPublicCoffeeFacts(html,{source_url}={}){
 if(typeof html!=='string'||html.length>1_000_000||!source_url)return {ok:false,reason:'invalid_source'};
 const meta=pageMeta(html);
 const all=[...jsonProducts(html),...shopifyProduct(html,source_url)];
 const linked=all.filter(p=>p.url&&samePage(p.url,source_url));
 const unlinked=all.filter(p=>!p.url);
 const selected=linked.length?linked:unlinked;
 const unique=[...new Map(selected.map(p=>[keyOf(textOf(p.name)),p]).filter(([key])=>key)).values()];
 let p=unique.length===1?unique[0]:null;
 if(unique.length>1)return {ok:false,reason:'ambiguous_or_missing_product'};
 if(!p){
  let likelyPath=false;
  try{likelyPath=/\/(products?|coffee|coffees|beans?|shop)\/[^/]+/i.test(new URL(source_url).pathname);}catch{}
  const ogType=String(meta['og:type']||'');
  if(/^product(?:\.|$)/i.test(ogType)||likelyPath){
   const title=productHeading(html)||removeSiteSuffix(meta['og:title']||'',meta['og:site_name']);
   if(title)p={name:title,brand:meta['og:site_name']||'',additionalProperty:[],description:meta.description||''};
  }
 }
 if(!p||!textOf(p.name))return {ok:false,reason:'ambiguous_or_missing_product'};
 const fields={name:textOf(p.name,200)};
 productDetails(fields,p);
 const siteName=textOf(meta['og:site_name'],200);
 if(!fields.roaster&&siteName&&!/^(?:online store|shopify|home|products?)$/i.test(siteName))
  fields.roaster=siteName;
 labeledPairs(html,fields);
 explicitNearbyFacts(html,fields);
 const roaster_recipe=explicitEspressoRecipe(html);
 // An extracted value is a suggestion, never proof of an official source.
 // Keep unexpected/absent facts blank instead of guessing.
 return {ok:true,source:'unverified_public_page',fields,available:Object.keys(fields),
  ...(roaster_recipe?{roaster_recipe}:{}),
  note:'Best-effort webpage suggestions. The roaster, lot and release still require verification.'};
}
