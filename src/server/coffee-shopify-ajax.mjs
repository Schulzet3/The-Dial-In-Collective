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
 return {...result,source_facts,...(result.source_facts_truncated||originalFacts?.truncated||source_facts.truncated?{source_facts_truncated:true}:{})};
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
