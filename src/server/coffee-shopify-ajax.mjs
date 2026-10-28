import {equivalentCoffeeVarieties,compatibleGenericCoffeeVarieties,compatibleCoffeeOrigins} from './coffee-fact-compatibility.mjs';
import {coffeeIdentityKey,equivalentCoffeeProductNames,preferredCoffeeRoasterName} from './coffee-product-identity.mjs';
import {parseCoffeeElevation,equivalentCoffeeElevations,compatibleCoffeeElevations} from './coffee-elevation-evidence.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {collectStructuredCoffeeSourceFacts,mergeCoffeeSourceFacts} from './coffee-source-facts.mjs';
import {reconcileCoffeeProcessingClaims,mergeCoffeeProcessingClaims} from './coffee-processing-evidence.mjs';

// Public Shopify Ajax Product API, not merchant/Admin APIs. All reads use the
// same bounded connection-time DNS-pinned HTTPS transport as product previews.
// A response must identify the exact handle on the supplied product URL.
import {safeCoffeeUrl,fetchPublicCoffeeJson,MAX_HTML_BYTES,coffeeProductHandle} from './coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from './coffee-page-metadata.mjs';
import {explicitlyRotatingCoffeeOrigin} from './coffee-selected-source-evidence.mjs';
import {extractSelectedCoffeeRoastVariants} from './coffee-roast-variants.mjs';

const norm=coffeeIdentityKey;
export function shopifyProductRequest(raw){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 // Locale prefix is optional; collections can refer to the same product.
 const m=url.pathname.match(/^\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?(?:collections\/[a-z0-9][a-z0-9-]*\/)?products\/([^/]+)\/?$/i);
 const handle=m&&coffeeProductHandle(m[2]);if(!handle||/[.+~]/.test(handle))return null;
 const path='/'+(m[1]?m[1]+'/':'')+'products/'+m[2]+'.js';
 const endpoint=new URL(path,url.origin).toString();
 if(!safeCoffeeUrl(endpoint))return null;
 return {url:endpoint,handle,sourceUrl:url.toString()};
}

// The exact public Shopify Product endpoint is selected by the requested
// handle. Read only its current description; not any saved 603-corpus capture,
// cached SEO card, related coffee, general guide, or unrelated page.
function selectedCurrentProductSpecs(description){
 const raw=String(description||'');
 const clean=value=>String(value||'').replace(/<[^<>]{0,2000}>/g,' ')
  .replace(/&(?:nbsp|amp|quot|apos);/gi,x=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'"}[x.toLowerCase()]||x))
  .replace(/\s+/g,' ').trim();
 const text=clean(raw);
 const specs={origin:[],roast_level:[],tasting_notes:[],process:[],variety:[]};
 const kind=name=>({
  origin:'origin',country:'origin',countryoforigin:'origin',
  roast:'roast_level',roastlevel:'roast_level',
  notes:'tasting_notes',tastingnotes:'tasting_notes',cuppingnotes:'tasting_notes',
  process:'process',processing:'process',processingmethod:'process',
  variety:'variety',varieties:'variety',varietal:'variety',varietals:'variety'
 })[String(name).toLowerCase().replace(/[^a-z]/g,'')];
 const add=(field,value)=>{
  const s=clean(value).replace(/\s*[|;,]\s*$/,'');
  if(!field||!s||s.length>210||specs[field].some(other=>norm(other)===norm(s)))return;
  if(specs[field].length<8)specs[field].push(s);
 };
 // Only small self-contained Product rows: a parent div, a general guide,
 // a full nested processing story and a related-products card are not labels.
 for(const match of raw.matchAll(/<(p|li|dd|span|strong|b)\b[^<>]{0,600}>([^<>]{2,450})<\/\1\s*>/gi)){
  const row=clean(match[2]);
  const m=row.match(/^(Origin|Country(?: of Origin)?|Roast(?: Level)?|Notes|Tasting Notes?|Cupping Notes?|Process(?:ing(?: Method)?)?|Variet(?:y|ies|als?))\s*[:：|]\s*(.{2,220})$/i);
  if(m)add(kind(m[1]),m[2]);
 }
 const countries='Papua New Guinea|Costa Rica|El Salvador|Ethiopia|Colombia|Kenya|Brazil|Guatemala|Honduras|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand';
 const location=text.match(new RegExp('\\bcurrent\\s+(?:(?:organic|specialty|decaf(?:feinated)?)\\s+){0,3}coffee\\s+(?:location|origin|country)\\s*:\\s*('+countries+')\\b','i'));
 const offering=text.match(new RegExp('\\bcurrent\\s+(?:decaf\\s+)?(?:offering|coffee|lot|release)\\s+(?:is\\s+)?from\\s+('+countries+')\\b','i'));
 const activeOriginConflict=location&&offering&&norm(location[1])!==norm(offering[1])?
  [location[1],offering[1]]:[];
 // Timed, selected-lot yeast-inoculated extended fermentation is the
 // owner's broad app category Anaerobic. The method is NOT proof the tanks
 // excluded oxygen; preserve precise stages in source_facts. A generic time
 // period or ordinary yeast mention alone is insufficient.
 const named=specs.process.some(x=>/\bextended\s+ferment(?:ation)?\b.*\byeast\s+inoculation\b/i.test(x));
 const timedStages=/\b\d{1,3}\s*[- ]hours?\s+(?:whole\s+cherry\s+)?fermentation\b/i.test(text)&&
  /\b\d{1,3}\s*[- ]hours?\s+secondary\s+fermentation\b/i.test(text)&&
  /\b(?:yeast|Saccharomyces)\b/i.test(text);
 const contraindicated=/\b(?:aerobic|open[- ]air|oxygenated|not\s+anaerobic)\b/i.test(text)||
  /\b(?:mixed\s+processing\s+methods|separate\s+process\s+components)\b/i.test(text);
 return {specs,activeOriginConflict,controlledFermentation:named&&timedStages&&!contraindicated,
  processCaption:specs.process.find(x=>/extended\s+ferment/i.test(x))||''};
}
export function extractShopifyAjaxData(data,request,{extract=extractPublicCoffeeFacts}={}){
 if(!request||!data||Array.isArray(data)||typeof data!=='object'||
    typeof data.title!=='string'||!data.title.trim()||data.title.length>200||
    typeof data.handle!=='string'||data.handle.normalize('NFC').toLowerCase()!==request.handle)return null;
 const description=typeof data.description==='string'&&data.description.length<=20000?data.description:'';
 const tags=Array.isArray(data.tags)?data.tags.slice(0,70).filter(v=>typeof v==='string'&&v.length<=150):
  typeof data.tags==='string'?data.tags.split(',').slice(0,70).map(s=>s.trim()):[];
 const product={'@context':'https://schema.org','@type':'Product',
  name:data.title,url:request.sourceUrl,description,
  ...(typeof data.vendor==='string'&&data.vendor.length<150?{brand:{'@type':'Brand',name:data.vendor}}:{}),
  tags,...(Array.isArray(data.options)?{options:data.options.slice(0,30)}:{})};
 // Escape HTML metacharacters inside JSON-LD to prevent closing <script>.
 const json=JSON.stringify(product).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
 // Current product description only; never let embedded checkout or scripts
 // escape the current-product boundary or run as executable code.
 const story=removeElements(description,['script', 'style', 'form', 'iframe', 'nav', 'footer'])
  .replace(/<\/?main\b[^<>]{0,2000}>/gi,' ');
 const html='<html><head><script type="application/ld+json">'+json+'</script></head>'+
  '<body><main><h1>'+data.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+
  '</h1>'+story+'</main></body></html>';
 if(Buffer.byteLength(html)>MAX_HTML_BYTES)return null;
 const result=extract(html,{source_url:request.sourceUrl});
 if(!result?.ok||norm(result.fields?.name)!==norm(data.title))return null;
 const originalFacts=result.source_facts;
 const endpointFacts=(originalFacts||[]).map(fact=>({...fact,source_type:'product_json',source_url:request.url}));
 const source_facts=mergeCoffeeSourceFacts(endpointFacts,
  collectStructuredCoffeeSourceFacts(data,{source_url:request.url,source_type:'product_json'}));

 // Current printed specifications outrank an archived/SEO description only
 // after selected-title/handle verification above. Competing direct current
 // fields and exact-product roast taxonomy remain conflicts, not guesses.
 const policy=selectedCurrentProductSpecs(description);
 const roast_variants=extractSelectedCoffeeRoastVariants({description,options:data.options});
 // Keep the WeakMap-backed source process claims attached to the original
 // preview fields. Cloning them loses evidence needed for safe stage merge.
 const fields=result.fields,conflicts=new Set(result.conflicts||[]);
 const conflict_options={...result.conflict_options};
 const current_spec_fields=[];
 const conflictingSpec=key=>policy.specs[key].length>1;
 const reviewConflict=(key,items)=>{
  conflicts.add(key);delete fields[key];
  conflict_options[key]=items.map((value,i)=>({value,label:key==='origin'?
   (i?'Current offering description':'Current coffee location'):'Current product specification'}));
 };
 // A historical SEO country must not hide a selected direct current origin.
 // A trailing decaffeination method in parentheses is NOT a geography.
 if(conflictingSpec('origin'))reviewConflict('origin',policy.specs.origin);
 else if(policy.specs.origin.length===1&&!conflicts.has('origin')){
  const value=policy.specs.origin[0];
  const country=value.match(/^(.+?)\s*\((?:mountain|swiss|sugarcane|sugar cane|EA|water)\s+[^)]*decaf[^)]*\)$/i)||
   value.match(/^(.+?)\s*\((?:mountain|swiss)\s+water\s+process(?:ed)?\)$/i);
  const candidate=country?country[1].trim():value;
  if(!fields.origin||norm(fields.origin)===norm(value))fields.origin=candidate;
  current_spec_fields.push('origin');
 }
 if(policy.activeOriginConflict.length)reviewConflict('origin',policy.activeOriginConflict);
 if(conflictingSpec('roast_level'))reviewConflict('roast_level',policy.specs.roast_level);
 else if(policy.specs.roast_level.length===1&&!conflicts.has('roast_level')){
  const value=policy.specs.roast_level[0];
  if(/^(?:Ultra[- ]Light|Very[- ]Light|Light|Medium[- ]Light|Medium|Medium[- ]Dark|Dark|Very[- ]Dark)(?: Roast)?$/i.test(value)){
   if(!fields.roast_level)fields.roast_level=value.replace(/\s+Roast$/i,'');
   current_spec_fields.push('roast_level');
  }
 }
 if(conflictingSpec('tasting_notes'))reviewConflict('tasting_notes',policy.specs.tasting_notes);
 else if(policy.specs.tasting_notes.length===1&&!conflicts.has('tasting_notes')){
  if(!fields.tasting_notes)fields.tasting_notes=policy.specs.tasting_notes[0];
  current_spec_fields.push('tasting_notes');
 }
 if(conflictingSpec('variety'))reviewConflict('variety',policy.specs.variety);
 else if(policy.specs.variety.length===1&&!conflicts.has('variety')){
  fields.variety=policy.specs.variety[0];
  current_spec_fields.push('variety');
 }
 // Distinct published decaf/washing/fermentation stages need the existing
 // literal stage reconciler, not a blanket new process conflict.
 if(policy.controlledFermentation){
  fields.process='Anaerobic';conflicts.delete('process');
  current_spec_fields.push('process');
 }
 // Two offered roast preparations are options, not contradictory products.
 // Do not erase an unrelated direct printed specification conflict.
 if(roast_variants.length>1){
  if(!policy.specs.roast_level.length){delete fields.roast_level;conflicts.delete('roast_level');}
  if(!policy.specs.tasting_notes.length){delete fields.tasting_notes;conflicts.delete('tasting_notes');}
 }
 // Preserve the published raw stages/method in source facts. Do not create
 // unverifiable fermentation-oxygen claims or overwrite stored member data.
 const details={...result.roaster_details};
 if(policy.processCaption&&!details.processing_detail)details.processing_detail=policy.processCaption;
 return {...result,fields,available:Object.keys(fields),source_facts,
  ...(roast_variants.length>1?{roast_variants}:{}),
  ...(explicitlyRotatingCoffeeOrigin(description)?{origin_confirmation_required:true}:{}),
  ...(Object.keys(details).length?{roaster_details:details}:{}),
  ...(conflicts.size?{conflicts:[...conflicts].sort(),conflict_options}:{conflicts:undefined,conflict_options:undefined}),
  ...(current_spec_fields.length?{current_product_spec_fields:current_spec_fields}:{}),
  ...(result.source_facts_truncated||originalFacts?.truncated||source_facts.truncated?{source_facts_truncated:true}:{})};
}
const recipeMasses=recipe=>[recipe?.dose_g,recipe?.dose_g_max??recipe?.dose_g,
 recipe?.yield_g??recipe?.yield_g_min,recipe?.yield_g??recipe?.yield_g_max];
const hasRecipeMasses=recipe=>recipeMasses(recipe).every(Number.isFinite);
function recipeValue(key,value){
 if(key!=='temperature')return typeof value==='string'?norm(value):value;
 const match=String(value).match(/^(\d+(?:\.\d+)?)\s*°?\s*([FC])$/i);
 if(!match)return norm(value);
 return Math.round((match[2].toUpperCase()==='F'?(Number(match[1])-32)*5/9:Number(match[1]))*1e6)/1e6;
}
function conflictingRecipes(base,extra){
 if(!base||!extra)return false;
 const method=recipe=>norm(recipe.method);
 if(method(base)&&method(extra)&&method(base)!=='espresso'&&method(extra)!=='espresso'&&method(base)!==method(extra))return true;
 if(hasRecipeMasses(base)&&hasRecipeMasses(extra)&&recipeMasses(base).some((value,index)=>value!==recipeMasses(extra)[index]))return true;
 for(const [key,value] of Object.entries(base)){
  if(key==='method'||extra[key]===undefined)continue;
  if(recipeValue(key,value)!==recipeValue(key,extra[key]))return true;
 }
 for(const [ratioSource,measured] of [[base,extra],[extra,base]]){
  if(!Number.isFinite(ratioSource.ratio)||!hasRecipeMasses(measured))continue;
  const [d1,d2,y1,y2]=recipeMasses(measured);
  if(ratioSource.ratio<y1/d2-1e-6||ratioSource.ratio>y2/d1+1e-6)return true;
 }
 return false;
}
function enrichEspressoRecipe(base,extra){
 if(!base)return extra;
 // Independently matching dose and output establish the same reference.
 // Add only compatible missing measurements; never build a hybrid from
 // different espresso settings or replace a complete HTML recommendation.
 if(extra&&hasRecipeMasses(base)&&hasRecipeMasses(extra)&&!conflictingRecipes(base,extra)){
  const result={...extra,...base};
  if((!base.method||norm(base.method)==='espresso')&&extra.method)result.method=extra.method;
  return result;
 }
 // Keep a complete HTML recipe intact. Only a ratio-only reference can gain
 // the endpoint's complete recipe, and only with corroborating measurements.
 if(!extra||!Number.isFinite(base.ratio)||base.ratio<1||base.ratio>5||
    Object.keys(base).some(key=>!['ratio','method'].includes(key)))return base;
 if(base.method&&norm(base.method)!=='espresso'&&norm(base.method)!==norm(extra.method))return base;
 if(extra.method&&!/\bespresso\b/i.test(extra.method))return base;
 const doseMin=extra.dose_g,doseMax=extra.dose_g_max??doseMin;
 const yieldMin=extra.yield_g??extra.yield_g_min,yieldMax=extra.yield_g??extra.yield_g_max;
 const timeMin=extra.time_s_min,timeMax=extra.time_s_max;
 if(![doseMin,doseMax,yieldMin,yieldMax,timeMin,timeMax].every(Number.isFinite)||
    doseMin<=0||doseMax<doseMin||yieldMin<=0||yieldMax<yieldMin||timeMin<=0||timeMax<timeMin)return base;
 const same=(a,b)=>Math.abs(a-b)<=1e-6;
 const explicitRatio=Number.isFinite(extra.ratio);
 if(explicitRatio&&!same(base.ratio,extra.ratio))return base;
 // An explicit ratio must also agree with the published measurement range.
 // Without one, ranged quantities alone cannot prove the same target ratio.
 if(base.ratio<yieldMin/doseMax-1e-6||base.ratio>yieldMax/doseMin+1e-6)return base;
 if(!explicitRatio&&(!same(doseMin,doseMax)||!same(yieldMin,yieldMax)||!same(base.ratio,yieldMin/doseMin)))return base;
 return {...extra,ratio:base.ratio,...(!extra.method&&base.method?{method:base.method}:{})};
}
function nativeElevation(preview){
 const canonical=preview.fields?.elevation_m,source=preview.elevation_source;
 const parsed=typeof source==='string'?parseCoffeeElevation(source):null;
 // Provenance is usable only when its deterministic metric display is the
 // field that actually survived this source's conflict checks.
 return parsed&&!parsed.conflicting&&equivalentCoffeeElevations(parsed.display,canonical)?source:canonical;
}
export function mergePublicProductPreview(base,extra){
 if(!extra?.ok)return base;
 if(!base?.ok)return extra;
 if(!equivalentCoffeeProductNames(base.fields?.name,extra.fields?.name,{brands:[base.fields?.roaster,extra.fields?.roaster]}))return base;
 const fields={...extra.fields};
 // Empty source fields must not erase supported facts from the other read.
 for(const [key,value] of Object.entries(base.fields||{}))
  if(typeof value==='string'?value.trim():value!=null)fields[key]=value;
 // The endpoint already matched the exact handle. Prefer its undecorated
 // title after the conservative cross-source comparison above.
 if(extra.fields?.name)fields.name=extra.fields.name;
 if(base.fields?.roaster&&extra.fields?.roaster)
  fields.roaster=preferredCoffeeRoasterName(base.fields.roaster,extra.fields.roaster);
 const conflicts=new Set([...(base.conflicts||[]),...(extra.conflicts||[])]);
 // Exact selected-coffee measured ground Agtron with a stated scale outranks
 // descriptive roast wording. Uncalibrated/unknown readings do not.
 const measured=preview=>preview?.roast_source==='agtron_ground_measurement'&&
  typeof preview.fields?.roast_level==='string'&&
  typeof preview.roaster_details?.agtron==='string'&&
  !preview.conflicts?.includes('roast_level');
 const measuredBase=measured(base),measuredExtra=measured(extra);
 const measuredWinner=measuredBase&&!measuredExtra?base:measuredExtra&&!measuredBase?extra:null;
 const compatibleProcess=reconcileCoffeeProcessingClaims([base,extra]);
 if(compatibleProcess){fields.process=compatibleProcess;conflicts.delete('process');}
 let producerSource=base.fields?.producer?base.producer_source:extra.producer_source;
 let elevationSource=base.fields?.elevation_m?nativeElevation(base):nativeElevation(extra);
 const narrativeSources=Object.fromEntries(['process','variety'].map(key=>[key,base.fields?.[key]?base[key+'_source']:extra[key+'_source']]));
 const alternatives=[];
 const retainAlternatives=(field,label,first,second)=>{
  for(const [preview,value,source_type] of [[base,first,'html'],[extra,second,'product_json']]){
   const source_url=preview.source_url||preview.source_facts?.find(fact=>fact?.source_url)?.source_url;
   alternatives.push({label,value:typeof value==='string'?value:JSON.stringify(value),field,source_type,
    ...(source_url?{source_url}:{}),conflicting:true});
  }
 };
 const mixedProcess=base.fields?.process==='Other/Unknown'?base:
  extra.fields?.process==='Other/Unknown'?extra:null;
 for(const key of ['origin','roast_level','process','variety','producer','release_label','elevation_m']){
  if(key==='process'&&compatibleProcess)continue;
  if(key==='roast_level'&&measuredWinner){
   fields.roast_level=measuredWinner.fields.roast_level;
   conflicts.delete('roast_level');
   continue;
  }
  const equivalent=key==='variety'?equivalentCoffeeVarieties(base.fields?.[key],extra.fields?.[key]):
   key==='elevation_m'?equivalentCoffeeElevations(nativeElevation(base),nativeElevation(extra)):norm(base.fields?.[key])===norm(extra.fields?.[key]);
  if(base.fields?.[key]&&extra.fields?.[key]&&equivalent){
   if(key==='producer'&&(base.producer_source!=='narrative'||extra.producer_source!=='narrative'))producerSource=undefined;
   if(['process','variety'].includes(key)&&(base[key+'_source']!=='narrative'||extra[key+'_source']!=='narrative'))narrativeSources[key]=undefined;
   if(key==='elevation_m'){
    elevationSource=compatibleCoffeeElevations(nativeElevation(base),nativeElevation(extra));
    fields.elevation_m=parseCoffeeElevation(elevationSource).display;
   }
  }
  if(base.fields?.[key]&&extra.fields?.[key]&&!equivalent){
   // A documented mixture is broader than a one-method metadata summary.
   // As in the HTML parser, preserve it while keeping prior conflicts final.
   if(key==='process'&&mixedProcess){fields.process='Other/Unknown';narrativeSources.process=mixedProcess.process_source;continue;}
   const specificVariety=key==='variety'?compatibleGenericCoffeeVarieties(base.fields.variety,extra.fields.variety):null;
   if(specificVariety){
    fields.variety=specificVariety;
    narrativeSources.variety=specificVariety===base.fields.variety?base.variety_source:extra.variety_source;
    continue;
   }
   // Prose is a fallback inside each source. Carry that priority across
   // the same product endpoint, while preserving both readings for review.
   if(key==='producer'&&((base.producer_source==='narrative')!==(extra.producer_source==='narrative'))){
    retainAlternatives(key,'Producer source readings',base.fields[key],extra.fields[key]);
    fields.producer=base.producer_source==='narrative'?extra.fields.producer:base.fields.producer;
    producerSource=undefined;continue;
   }
   if(['process','variety'].includes(key)&&((base[key+'_source']==='narrative')!==(extra[key+'_source']==='narrative'))){
    retainAlternatives(key,key.replaceAll('_',' '),base.fields[key],extra.fields[key]);
    fields[key]=base[key+'_source']==='narrative'?extra.fields[key]:base.fields[key];
    narrativeSources[key]=undefined;continue;
   }
   // "Gedeb, Ethiopia" and "Ethiopia" are compatible levels of geographic
   // precision, not contradictory countries. Keep the more specific sourced
   // origin; genuinely divergent blends/harvests remain conflicts.
   const origin=key==='origin'?compatibleCoffeeOrigins(base.fields[key],extra.fields[key]):null;
   if(origin){fields.origin=origin;continue;}
   const elevation=key==='elevation_m'?compatibleCoffeeElevations(nativeElevation(base),nativeElevation(extra)):null;
   if(elevation){fields.elevation_m=parseCoffeeElevation(elevation).display;elevationSource=elevation;continue;}
   retainAlternatives(key,key.replaceAll('_',' '),base.fields[key],extra.fields[key]);
   delete fields[key];conflicts.add(key);
  }
 }

 // Only dated/SEO-identified LOW-RANK source evidence can yield to exact
 // current Product specifications. Other current selected-product details
 // (including tags, variants and narrative "current offering") keep their
 // genuine contradiction and member-review choices.
 const olderSeoOnly=(key,value)=>{
  const rows=(base.source_facts||[]).filter(f=>f.field===key&&norm(f.value)===norm(value));
  return rows.length>0&&rows.every(f=>/^(?:seo|page_meta|html_meta|archived_metadata)$/i.test(String(f.source_type||''))||
   /\b(?:og:description|meta description|archived|historical seo)\b/i.test(String(f.label||'')));
 };
 for(const key of extra.current_product_spec_fields||[]){
  if(!['origin','roast_level','tasting_notes','process','variety'].includes(key)||!extra.fields?.[key]||
   extra.conflicts?.includes(key)||base.conflicts?.includes(key))continue;
  if(!base.fields?.[key]||norm(base.fields[key])===norm(extra.fields[key])||olderSeoOnly(key,base.fields[key])){
   fields[key]=extra.fields[key];conflicts.delete(key);
  }
 }
 for(const key of conflicts)delete fields[key];
 const recipe=enrichEspressoRecipe(base.roaster_recipe,extra.roaster_recipe);
 if(conflictingRecipes(base.roaster_recipe,extra.roaster_recipe))
  retainAlternatives('roaster_recipe','Published espresso recipe',base.roaster_recipe,extra.roaster_recipe);
 for(const [key,value] of Object.entries(base.roaster_details||{})){
  const other=extra.roaster_details?.[key];
  if(typeof value==='string'&&typeof other==='string'&&value.trim()&&other.trim()&&norm(value)!==norm(other))
   retainAlternatives(key,key.replaceAll('_',' '),value,other);
 }
 const source_facts=mergeCoffeeSourceFacts(alternatives,base.source_facts,extra.source_facts);
 const conflict_options={};
 for(const key of conflicts){
  const rows=[];
  const add=row=>{
   const value=String(row?.value||'').trim();
   if(!value||value.length>220||rows.some(other=>other.value.toLowerCase()===value.toLowerCase())||rows.length>=8)return;
   rows.push({value,label:String(row?.label||key).slice(0,100)});
  };
  for(const part of [base,extra]){
   for(const row of part.conflict_options?.[key]||[])add(row);
   if(typeof part.fields?.[key]==='string')add({value:part.fields[key],label:'Selected product '+(part===base?'page':'JSON')});
  }
  for(const fact of alternatives)if(fact.field===key)add(fact);
  if(rows.length)conflict_options[key]=rows;
 }
 const merged={...base,fields,available:Object.keys(fields),
  ...(extra.current_product_spec_fields?.length?{current_product_spec_fields:extra.current_product_spec_fields}:{}),
  ...(extra.roast_variants?.length>1?{roast_variants:extra.roast_variants}:{}),
  ...(base.origin_confirmation_required||extra.origin_confirmation_required?{origin_confirmation_required:true}:{}),
  roaster_details:{...extra.roaster_details,...base.roaster_details},
  source_facts,
  ...(base.source_facts_truncated||extra.source_facts_truncated||source_facts.truncated?{source_facts_truncated:true}:{}),
  ...(conflicts.size?{conflicts:[...conflicts].sort(),conflict_options}:{}),
  ...(recipe?{roaster_recipe:recipe}:{})};
 mergeCoffeeProcessingClaims(fields,[base,extra]);
 if(!conflicts.size)delete merged.conflicts;
 if(fields.producer&&producerSource==='narrative')merged.producer_source='narrative';
 else delete merged.producer_source;
 if(fields.elevation_m&&elevationSource)merged.elevation_source=elevationSource;
 else delete merged.elevation_source;
 for(const key of ['process','variety']){
  if(fields[key]&&narrativeSources[key]==='narrative')merged[key+'_source']='narrative';
  else delete merged[key+'_source'];
 }
 if(mixedProcess&&!conflicts.has('process')){
  for(const key of ['processing_detail','blend_components']){
   const detail=mixedProcess.roaster_details?.[key];
   if(typeof detail==='string'&&detail.trim())merged.roaster_details[key]=detail;
  }
 }
 if(conflicts.has('roast_level')){
  // A field rejected by either source must not retain a positive provenance
  // label or a hint suggesting that the rejected roast can still be applied.
  delete merged.roast_source;
  merged.roast_hint='Conflicting source roast details were left blank. Check the roaster’s current label.';
 }else if(fields.roast_level&&!String(base.fields?.roast_level||'').trim()){
  // Evidence must travel with the selected value. In particular, an endpoint
  // Agtron suggestion is still provisional when the HTML had no roast value.
  for(const key of ['roast_hint','roast_source']){
   if(typeof extra[key]==='string'&&extra[key].trim())merged[key]=extra[key];
   else delete merged[key];
  }
 }
 if(measuredWinner&&fields.roast_level&&!conflicts.has('roast_level')){
  merged.roast_source='agtron_ground_measurement';
  merged.roast_hint=measuredWinner.roast_hint||
   'The selected product has an explicitly scaled ground-coffee Agtron measurement.';
 }
 if(extra.roast_variants?.length>1){
  // There is no current selected roast until the member chooses. Preserve
  // independent contradictory direct facts, but not the two options alone.
  const variantValues=key=>extra.roast_variants.map(v=>v.fields?.[key]).filter(Boolean).map(norm);
  for(const key of ['roast_level','tasting_notes']){
   const options=base.conflict_options?.[key]||[];
   const onlyOptions=!base.conflicts?.includes(key)||
    (options.length>0&&options.every(o=>variantValues(key).includes(norm(o.value))));
   if(!extra.conflicts?.includes(key)&&onlyOptions){
    delete merged.fields[key];conflicts.delete(key);
    if(merged.conflict_options)delete merged.conflict_options[key];
   }
  }
  merged.available=Object.keys(merged.fields);
  if(conflicts.size)merged.conflicts=[...conflicts].sort();
  else{delete merged.conflicts;delete merged.conflict_options;}
 }
 return merged;
}
// Backwards-compatible name for existing extractor consumers/tests.
export const mergeShopifyPreview=mergePublicProductPreview;
export async function extractShopifyProduct(raw,{
 readJson=fetchPublicCoffeeJson,extract=extractPublicCoffeeFacts,deadlineAt=null
}={}){
 const request=shopifyProductRequest(raw);if(!request)return null;
 try{
  const response=await readJson(request.url,{shopifyProduct:true,deadlineAt});
  if(!response?.ok||typeof response.json!=='string'||Buffer.byteLength(response.json)>MAX_HTML_BYTES)return null;
  return extractShopifyAjaxData(JSON.parse(response.json),request,{extract});
 }catch{return null;}
}
