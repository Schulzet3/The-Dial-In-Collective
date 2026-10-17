// Controlled one-shot public product URL smoke check, no credentials, accounts,
// screenshots, backend API keys or Supabase preview quota. Uses the SAME
// connection-time DNS-pinned, bounded HTTPS guard as production previews.
// This is not a product release or proof that CDN rendering is unchanged.
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {createHash} from 'node:crypto';

const targets=[
 ['Proud Mary Ovidio Gomez','https://proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural'],
 ['Queen City Banko Gotiti Washed','https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia?variant=52819513737447'],
 ['Queen City canonical identity control','https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia'],
 ['Queen City homepage negative control','https://queencitycollectivecoffee.com/'],
 ['Onyx Mullugeta Muntasha','https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26?variant=43228176810082'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['Picky Chemist Gesha Village','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['SEY Chorso Bule','https://www.seycoffee.com/collections/coffee/products/2026-chorso-bule-highest-elevation-project-ethiopia'],
 ['Black & White Los Altos','https://www.blackwhiteroasters.com/products/r-los-altos-washed'],
 ['Little Wolf Tegu','https://littlewolf.coffee/products/tegu'],
 ['Heart Phono','https://www.heartroasters.com/products/phono']
];
const summarize=async ([roaster,url])=>{
 if(!safeCoffeeUrl(url))return {roaster,status:'invalid_target'};
 try{
  const fetched=await fetchPublicCoffeeHtml(url);
  if(!fetched.ok)return {roaster,status:fetched.reason};
  // Temporary bounded public-source diagnostics for the owner's exact variant.
  // Removed after structural inspection; no whole page or private data is stored.
  if(roaster==='Queen City Banko Gotiti Washed'){
   const visible=fetched.html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
   const facts=[...visible.matchAll(/<p\b[^>]*>([\s\S]{1,1800}?)<\/p>/gi)]
    .filter(m=>/CWS|Reminds us of|processed heirloom/i.test(m[1])).slice(0,4).map(m=>m[0].slice(0,1800));
   console.log('[DIC QUEEN CITY SOURCE] '+JSON.stringify({url,bytes:Buffer.byteLength(fetched.html),sha256:createHash('sha256').update(fetched.html).digest('hex'),fact_markup: facts}));
  }
  const result=extractPublicCoffeeFacts(fetched.html,{source_url:fetched.source_url});
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
console.log('[DIC ROASTER SUMMARY] '+JSON.stringify({total:results.length,
 parsed:results.filter(x=>x.status==='parsed').length,
 blocked:results.filter(x=>x.status!=='parsed').map(x=>({roaster:x.roaster,status:x.status})),
 note:'One current unprivileged public HTTPS read per target; dynamic JS/browser-only markup and anti-bot restrictions may differ from browser render. No user quota was consumed.'}));
