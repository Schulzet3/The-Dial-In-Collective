import {equivalentCoffeeVarieties} from './coffee-fact-compatibility.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

// Public Shopify Ajax Product API, not merchant/Admin APIs. All reads use the
// same bounded connection-time DNS-pinned HTTPS transport as product previews.
// A response must identify the exact handle on the supplied product URL.
import {safeCoffeeUrl,fetchPublicCoffeeJson,MAX_HTML_BYTES} from './coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from './coffee-page-metadata.mjs';

const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,'');
export function shopifyProductRequest(raw){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 // Locale prefix is optional; collections can refer to the same product.
 const m=url.pathname.match(/^\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?(?:collections\/[a-z0-9][a-z0-9-]*\/)?products\/([a-z0-9][a-z0-9-]{0,155})\/?$/i);
 if(!m)return null;
 const path='/'+(m[1]?m[1]+'/':'')+'products/'+m[2]+'.js';
 const endpoint=new URL(path,url.origin).toString();
 if(!safeCoffeeUrl(endpoint))return null;
 return {url:endpoint,handle:m[2].toLowerCase(),sourceUrl:url.toString()};
}
export function extractShopifyAjaxData(data,request,{extract=extractPublicCoffeeFacts}={}){
 if(!request||!data||Array.isArray(data)||typeof data!=='object'||
    typeof data.title!=='string'||!data.title.trim()||data.title.length>200||
    typeof data.handle!=='string'||data.handle.toLowerCase()!==request.handle)return null;
 const description=typeof data.description==='string'&&data.description.length<=20000?data.description:'';
 const tags=Array.isArray(data.tags)?data.tags.slice(0,70).filter(v=>typeof v==='string'&&v.length<=150):
  typeof data.tags==='string'?data.tags.split(',').slice(0,70).map(s=>s.trim()):[];
 const product={'@context':'https://schema.org','@type':'Product',
  name:data.title,url:request.sourceUrl,description,
  ...(typeof data.vendor==='string'&&data.vendor.length<150?{brand:{'@type':'Brand',name:data.vendor}}:{}),
  tags};
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
 return result;
}
function originParts(value){
 return String(value||'').split(/\s*(?:,|\/|;|&|\band\b)\s*/i)
  .map(part=>norm(part)).filter(Boolean);
}
function compatibleOrigins(a,b){
 const first=originParts(a),second=originParts(b);
 if(!first.length||!second.length)return null;
 const subset=(small,large)=>small.every(segment=>large.includes(segment));
 if(!subset(first,second)&&!subset(second,first))return null;
 return first.length>=second.length?a:b;
}
function enrichEspressoRecipe(base,extra){
 if(!base)return extra;
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
export function mergePublicProductPreview(base,extra){
 if(!extra?.ok)return base;
 if(!base?.ok)return extra;
 if(norm(base.fields?.name)!==norm(extra.fields?.name))return base;
 const fields={...extra.fields};
 // Empty source fields must not erase supported facts from the other read.
 for(const [key,value] of Object.entries(base.fields||{}))
  if(typeof value==='string'?value.trim():value!=null)fields[key]=value;
 const conflicts=new Set([...(base.conflicts||[]),...(extra.conflicts||[])]);
 const mixedProcess=base.fields?.process==='Other/Unknown'?base:
  extra.fields?.process==='Other/Unknown'?extra:null;
 for(const key of ['origin','roast_level','process','variety','producer','release_label']){
  if(base.fields?.[key]&&extra.fields?.[key]&&(key==='variety'?!equivalentCoffeeVarieties(base.fields[key],extra.fields[key]):norm(base.fields[key])!==norm(extra.fields[key]))){
   // A documented mixture is broader than a one-method metadata summary.
   // As in the HTML parser, preserve it while keeping prior conflicts final.
   if(key==='process'&&mixedProcess){fields.process='Other/Unknown';continue;}
   // "Gedeb, Ethiopia" and "Ethiopia" are compatible levels of geographic
   // precision, not contradictory countries. Keep the more specific sourced
   // origin; genuinely divergent blends/harvests remain conflicts.
   const origin=key==='origin'?compatibleOrigins(base.fields[key],extra.fields[key]):null;
   if(origin){fields.origin=origin;continue;}
   delete fields[key];conflicts.add(key);
  }
 }
 for(const key of conflicts)delete fields[key];
 const recipe=enrichEspressoRecipe(base.roaster_recipe,extra.roaster_recipe);
 const merged={...base,fields,available:Object.keys(fields),
  roaster_details:{...extra.roaster_details,...base.roaster_details},
  ...(conflicts.size?{conflicts:[...conflicts].sort()}:{}),
  ...(recipe?{roaster_recipe:recipe}:{})};
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
