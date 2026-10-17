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
// Print short public evidence snippets for diagnostics only. No raw HTML,
// response headers, JavaScript bundles or login/session data are retained.
function diagnosticSummary(html){
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ');
 const headings=[...visible.matchAll(/<h1\b[^>]{0,300}>([\s\S]{0,300}?)<\/h1>/gi)]
  .slice(0,4).map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,150));
 const snippets={};
 for(const term of ['producer','variety','roast level','agtron','ratio','tasting notes','elevation','altitude','processing','espresso']){
  const matches=[...visible.matchAll(new RegExp(term,'gi'))].slice(0,8);
  snippets[term]=matches.slice(0,2).map(m=>visible.slice(Math.max(0,m.index-85),m.index+270)
   .replace(/\s+/g,' ').slice(0,355));
 }
 const og=[...html.matchAll(/<meta\b[^>]{0,800}>/gi)]
  .map(m=>m[0]).filter(x=>/og:title|og:type|og:site_name/i.test(x)).slice(0,5)
  .map(x=>x.replace(/\s+/g,' ').slice(0,330));
 const productRecords=[];
 for(const m of html.matchAll(/<script\b([^>]{0,1000})>([\s\S]*?)<\/script>/gi)){
  if(!/application\/ld\+json/i.test(m[1])||m[2].length>180000)continue;
  let raw;try{raw=JSON.parse(m[2])}catch{continue}
  const walk=(x,depth=0)=>{
   if(depth>5||productRecords.length>12||!x||typeof x!=='object')return;
   if(Array.isArray(x)){for(const y of x.slice(0,15))walk(y,depth+1);return;}
   if(/product/i.test(String(x['@type']||''))&&typeof x.name==='string')
    productRecords.push({name:x.name.slice(0,85),url:String(x.url||'').slice(0,170)});
   for(const k of ['@graph','mainEntity','hasVariant'])if(x[k])walk(x[k],depth+1);
  };
  walk(raw);
 }
 return {headings,og,product_records:productRecords,snippets};
}
const summarize=async ([roaster,url])=>{
 if(!safeCoffeeUrl(url))return {roaster,status:'invalid_target'};
 try{
  const fetched=await fetchPublicCoffeeHtml(url);
  if(!fetched.ok)return {roaster,status:fetched.reason};
  const result=extractPublicCoffeeFacts(fetched.html,{source_url:fetched.source_url});
  if(!result.ok)return {roaster,status:result.reason,bytes:Buffer.byteLength(fetched.html),
    diagnostics:diagnosticSummary(fetched.html)};
  // Summarize only extracted public coffee facts, never cache raw HTML.
  const keys=Object.keys(result.fields||{});
  const {name,roaster:foundRoaster,origin,roast_level,process,variety,producer,elevation_m,tasting_notes,release_label}=result.fields;
  return {roaster,status:'parsed',bytes:Buffer.byteLength(fetched.html),
   ...((keys.length<7||!result.fields.process||!result.fields.variety)?{diagnostics:diagnosticSummary(fetched.html)}:{}),
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
console.log('[DIC ROASTER SUMMARY] '+JSON.stringify({total:results.length,
 parsed:results.filter(x=>x.status==='parsed').length,
 blocked:results.filter(x=>x.status!=='parsed').map(x=>({roaster:x.roaster,status:x.status})),
 note:'One current unprivileged public HTTPS read per site; dynamic JS/browser-only markup and anti-bot restrictions may differ from browser render. No user quota was consumed.'}));
