// Controlled one-shot public product URL smoke check. Includes a real late-story
// PERC Mara Estate check beyond the short 60 KB display-token scan. No member credentials,
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
 ['Onyx Mullugeta archive','https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['PERC Kenya Mara Estate','https://perccoffee.com/products/kenya-mara-estate'],
 ['PERC Nestor Lasso Ombligon','https://perccoffee.com/products/colombia-nestor-lasso-ombligon-1'],
 ['PERC Outpost Coffee','https://perccoffee.com/products/outpost-coffee'],
 ['Picky Chemist Gesha Village','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['SEY Chorso Bule','https://www.seycoffee.com/collections/coffee/products/2026-chorso-bule-highest-elevation-project-ethiopia'],
 ['SEY Yaye Arbegona','https://www.seycoffee.com/collections/coffee/products/2026-yaye-arbegona-ethiopia'],
 ['SEY Kedida Gubata','https://www.seycoffee.com/collections/coffee/products/2026-kedida-gubata-ethiopia'],
 ['Queen City Banko Gotiti Natural','https://queencitycollectivecoffee.com/products/banko-gotiti-natural-ethiopia'],
 ['Queen City Sonia Bolanos','https://queencitycollectivecoffee.com/products/sonia-bolanos-colombia'],
 ['Queen City Belafonte','https://queencitycollectivecoffee.com/products/belafonte'],
 ['Sweet Bloom Wuri','https://sweetbloomcoffee.com/products/wuri'],
 ['Sweet Bloom Uraga','https://sweetbloomcoffee.com/products/uraga'],
 ['Sweet Bloom Felix Zaragoza','https://sweetbloomcoffee.com/products/felix-zaragoza'],
 ['Black & White Los Altos','https://www.blackwhiteroasters.com/products/r-los-altos-washed'],
 ['Little Wolf Tegu','https://littlewolf.coffee/products/tegu'],
 ['Heart Phono','https://www.heartroasters.com/products/phono'],
 ['Heart Ethiopia Halo','https://www.heartroasters.com/products/ethiopia-halo'],
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
   available:keys,conflicts:result.conflicts||[],name,foundRoaster,origin,roast_level,process,variety,producer,
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
const proud=results.find(x=>x.roaster==='Proud Mary Ovidio Gomez');
const mara=results.find(x=>x.roaster==='PERC Kenya Mara Estate');
const franky=results.find(x=>x.roaster==='PERC Franky Hoyos');
const outpost=results.find(x=>x.roaster==='PERC Outpost Coffee');
const onyx=results.find(x=>x.roaster==='Onyx Mullugeta Muntasha');
const sweetWuri=results.find(x=>x.roaster==='Sweet Bloom Wuri');
const sweetUraga=results.find(x=>x.roaster==='Sweet Bloom Uraga');
const heart=results.find(x=>x.roaster==='Heart Phono');
const blackWhite=results.find(x=>x.roaster==='Black & White Los Altos');
const seyYaye=results.find(x=>x.roaster==='SEY Yaye Arbegona');
const queenNatural=results.find(x=>x.roaster==='Queen City Banko Gotiti Natural');
assert.equal(mara?.status,'parsed','PERC exact owner-reported product failed to parse');
assert.equal(mara.producer,'Mara Estate','Mara Estate must be corroborated by its on-product story');
assert.equal(mara.process,'Anaerobic','Adv Natural and 96-hour sealed fermentation must not collapse to Natural');
assert.equal(mara.details.agtron,'78.4','Keep exact PERC numeric roast reading');
assert.equal(mara.roast_level,'Light','Agtron 78.4 must map provisionally to Light assuming ground Gourmet');
assert.match(mara.roast_hint||'',/Provisional/,'PERC does not state Gourmet/Commercial scale or sample form');
assert.match(mara.details.processing_detail||'',/96-hour/,'Preserve distinct anaerobic fermentation timing');
assert.match(mara.tasting_notes||'',/strawberry.*guava.*honeydew.*sweet cream/i,'PERC Mara story tasting notes must be extracted');
assert.match(franky?.tasting_notes||'',/orange cake.*marmalade.*bubblegum/i,'PERC Franky own-story tasting notes');
assert.equal(franky?.producer,'Franky Hoyos','PERC source names Franky grower');
assert.equal(outpost?.producer,'Jhon Rodriguez','PERC source names Jhon grower');
assert.match(outpost?.tasting_notes||'',/milk chocolate.*cherry syrup.*graham cracker.*marshmallow/i);
assert.match(onyx?.tasting_notes||'',/strawberry.*honeysuckle.*pink lemonade.*peach/i,'Onyx selected product tasting notes');
assert.equal(onyx?.elevation_m,'2150 MASL','Onyx matched elevation stat');
assert.match(sweetWuri?.tasting_notes||'',/citra hops.*mandarin.*sugarcane/i,'Sweet Bloom Wuri named flavor elements');
assert.match(sweetUraga?.tasting_notes||'',/guava.*raspberry.*milk chocolate/i,'Sweet Bloom Uraga named flavor elements');
assert.ok(!/^since\s+\d{4}$/i.test(sweetWuri?.producer||''),'Sweet Bloom relationship year is not producer');
assert.ok(!/^since\s+\d{4}$/i.test(sweetUraga?.producer||''),'Sweet Bloom relationship year is not producer');
assert.match(heart?.tasting_notes||'',/fig.*caramel.*cream/i,'Heart product metadata tasting notes');
assert.match(blackWhite?.tasting_notes||'',/apricots.*pecan.*milk chocolate/i,'Black & White named cup description');
assert.match(seyYaye?.tasting_notes||'',/watermelon.*florality.*berries/i,'Second SEY coffee tasting notes regression');
if(queenNatural?.status==='parsed'){
 assert.match(queenNatural.tasting_notes||'',/Black Cherry.*Haribo Goldbears/i,'Second Queen City release notes');
 assert.equal(queenNatural.process,'Natural');
}
assert.equal(mara.recipe?.dose_g,16);
assert.equal(mara.recipe?.yield_g,40);
assert.equal(mara.recipe?.time_s_min,26);

assert.equal(proud?.producer,'Ovidio Gomez','Proud Mary late product widgets must remain in scope');
assert.equal(proud?.variety,'Catuai','Proud Mary variety must survive decorative markup');
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
console.log('[DIC MULTI-ROASTER FLAVOR ACCEPTANCE] PASS: independently sourced tasting notes on PERC, Sweet Bloom, SEY, Onyx, Heart, Black & White; Sweet Bloom relationship years are not producers. Queen City Natural may be independently unavailable.');
console.log('[DIC PERC MARA ACCEPTANCE] PASS: corroborated estate, anaerobic natural fermentation, exact 78.4 numeric and provisional Light, original PERC espresso recipe.');
console.log('[DIC QUEEN CITY ACCEPTANCE] PASS: exact variant and canonical identity, eight factual fields, source-only processing details, absent unsupported values, homepage negative control.');
