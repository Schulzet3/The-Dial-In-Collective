// Controlled one-shot public product URL smoke check, no credentials, accounts,
// screenshots, backend API keys or Supabase preview quota. Uses the SAME
// connection-time DNS-pinned, bounded HTTPS guard as production previews.
// This is not a product release or proof that CDN rendering is unchanged.
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const targets=[
 ['Proud Mary Ovidio Gomez','https://proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural'],
 ['Queen City Banko Gotiti','https://queencitycollectivecoffee.com/products/banko-gotiti-natural-ethiopia'],
 ['Queen City homepage negative control','https://queencitycollectivecoffee.com/'],
 ['Onyx Mullugeta Muntasha','https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26?variant=43228176810082'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['Picky Chemist Gesha Village','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['SEY Chorso Bule','https://www.seycoffee.com/collections/coffee/products/2026-chorso-bule-highest-elevation-project-ethiopia'],
 ['Black & White Los Altos','https://www.blackwhiteroasters.com/products/r-los-altos-washed'],
 ['Little Wolf Tegu','https://littlewolf.coffee/products/tegu'],
 ['Heart Phono','https://www.heartroasters.com/products/phono']
];
function publicProductIdentityDiagnostic(html,url,roaster){
 const productNodes=[];
 const scripts=[...html.matchAll(/<script\b([^>]{0,1000})>([\s\S]*?)<\/script\s*>/gi)];
 const jsonInfo=[];
 for(const [,attributes,payload] of scripts){
  if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attributes))continue;
  jsonInfo.push({bytes:payload.length});
  if(payload.length>250000)continue;
  let data;try{data=JSON.parse(payload)}catch{continue}
  const walk=(x,depth=0)=>{
   if(depth>9||productNodes.length>90||!x||typeof x!=='object')return;
   if(Array.isArray(x)){for(const p of x.slice(0,80))walk(p,depth+1);return;}
   const types=Array.isArray(x['@type'])?x['@type']:[x['@type']];
   if(types.some(t=>String(t||'').toLowerCase()==='product')&&typeof x.name==='string')
    productNodes.push({name:x.name.slice(0,110),url:String(x.url||'').slice(0,210)});
   for(const k of ['@graph','mainEntity','itemListElement','hasVariant','isVariantOf','offers'])
    if(x[k])walk(x[k],depth+1);
  };
  walk(data);
 }
 const base=new URL(url),match=u=>{
  try{const x=new URL(u,base);return x.hostname.replace(/^www\./,'')===base.hostname.replace(/^www\./,'')&&
   x.pathname.replace(/\/+$/,'')===base.pathname.replace(/\/+$/,'')}catch{return false}
 };
 const og=(html.match(/<meta\b[^>]*property=["']og:title["'][^>]*>/i)||[])[0]||'';
 const main=productNodes.filter(x=>match(x.url));
 const onyxStatNames=[...new Set([...html.matchAll(/<div\b[^>]*class=["'][^"']*a-stat[^"']*["'][^>]*data-name=["']([^"']+)/gi)].map(x=>x[1]))].slice(0,30);
 return {roaster,og:og.slice(0,200),script_count:jsonInfo.length,json_script_sizes:jsonInfo.map(x=>x.bytes).slice(0,20),
  parsed_product_count:productNodes.length,matched_count:main.length,matched_names:main.map(x=>x.name).slice(0,25),
  first_products:productNodes.slice(0,18),onyxStatNames};
}
const summarize=async ([roaster,url])=>{
 if(!safeCoffeeUrl(url))return {roaster,status:'invalid_target'};
 try{
  const fetched=await fetchPublicCoffeeHtml(url);
  if(!fetched.ok)return {roaster,status:fetched.reason};
  const result=extractPublicCoffeeFacts(fetched.html,{source_url:fetched.source_url});
  if(/PERC|Onyx/.test(roaster))console.log('[DIC PUBLIC PRODUCT DEBUG] '+JSON.stringify(publicProductIdentityDiagnostic(fetched.html,url,roaster)));
  if(!result.ok)return {roaster,status:result.reason,bytes:Buffer.byteLength(fetched.html)};
  // Summarize only extracted public coffee facts, never cache raw HTML.
  const keys=Object.keys(result.fields||{});
  const {name,roaster:foundRoaster,origin,roast_level,process,variety,producer,elevation_m,tasting_notes,release_label}=result.fields;
  return {roaster,status:'parsed',bytes:Buffer.byteLength(fetched.html),
   available:keys,name,foundRoaster,origin,roast_level,process,variety,producer,
   elevation_m,tasting_notes,release_label,details:result.roaster_details||{},
   recipe:result.roaster_recipe||null,roast_hint:result.roast_hint||null};
 }catch(e){return {roaster,status:'probe_exception',exception_type:e?.name||'Error'};}
};
const results=[];
for(let i=0;i<targets.length;i+=2){
 const batch=await Promise.all(targets.slice(i,i+2).map(summarize));
 for(const item of batch){
  results.push(item);
  console.log('[DIC ROASTER SMOKE] '+JSON.stringify(item));
 }
}
// Third read-only public-page check after strict Onyx data scoping and PERC identity deconfliction.
console.log('[DIC ROASTER SUMMARY] '+JSON.stringify({total:results.length,
 parsed:results.filter(x=>x.status==='parsed').length,
 blocked:results.filter(x=>x.status!=='parsed').map(x=>({roaster:x.roaster,status:x.status})),
 note:'One current unprivileged public HTTPS read per site; dynamic JS/browser-only markup and anti-bot restrictions may differ from browser render. No user quota was consumed.'}));
