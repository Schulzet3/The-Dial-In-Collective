// Controlled one-shot public product URL smoke check. No member credentials,
// Supabase preview quota, raw HTML persistence, production writes or publishing.
// Uses the SAME connection-time DNS-pinned, bounded HTTPS guard as previews.
import {safeCoffeeUrl,fetchPublicCoffeeHtml} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

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
  const result=extractPublicCoffeeFacts(fetched.html,{source_url:fetched.source_url});
  if(!result.ok)return {roaster,status:result.reason,bytes:Buffer.byteLength(fetched.html)};
  // Digest only, never the page body. Facts below are public source data.
  const keys=Object.keys(result.fields||{});
  const {name,roaster:foundRoaster,origin,roast_level,process,variety,producer,elevation_m,tasting_notes,release_label}=result.fields;
  return {roaster,status:'parsed',bytes:Buffer.byteLength(fetched.html),
   source_sha256:createHash('sha256').update(fetched.html).digest('hex'),
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
 note:'Two Queen City product links represent the same coffee. Current anonymous HTTPS source checks are distinct from authenticated browser acceptance. No user quota was consumed.'}));

// This deliberately opt-in live acceptance reports drift instead of a green
// run that merely printed an error. The broader roaster inventory stays visible.
const queen=results.find(x=>x.roaster==='Queen City Banko Gotiti Washed');
const canonical=results.find(x=>x.roaster==='Queen City canonical identity control');
const home=results.find(x=>x.roaster==='Queen City homepage negative control');
assert.equal(queen?.status,'parsed','Exact owner-provided variant failed to parse');
assert.equal(canonical?.status,'parsed','Canonical Queen City product failed to parse');
assert.equal(queen.producer,'Banko Gotiti CWS');
assert.equal(queen.origin,'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia');
assert.equal(queen.variety,'heirloom');
assert.equal(queen.process,'Washed');
assert.equal(queen.elevation_m,'2170 masl');
assert.equal(queen.tasting_notes,'Peach Brulee & Cantaloupe');
assert.equal(queen.roast_level,undefined,'Do not invent an unpublished roast tier');
assert.equal(queen.release_label,undefined,'Do not use a variant, copyright or sourcing year as a harvest');
assert.match(queen.details.processing_detail,/24- to 48-hour fermentation/);
assert.match(queen.details.drying_method,/raised African drying beds/);
assert.equal(queen.recipe,null,'Fermentation time is not espresso brew time');
for(const key of ['name','foundRoaster','origin','producer','variety','process','elevation_m','tasting_notes']){
 assert.equal(queen[key],canonical[key],'Variant/canonical mismatch: '+key);
}
assert.equal(home?.status,'ambiguous_or_missing_product','Homepage must not invent a product');
console.log('[DIC QUEEN CITY ACCEPTANCE] PASS: exact variant and canonical identity, eight factual fields, source-only processing details, absent unsupported values, homepage negative control.');
