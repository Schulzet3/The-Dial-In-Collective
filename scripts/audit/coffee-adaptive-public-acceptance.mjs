// Unprivileged public product HTML acceptance for the ACTUAL adaptive URL
// fetch and parser, no Supabase credentials, JWTs, member quota, browser JS,
// database mutation, raw HTML retention or production deployment.
import assert from 'node:assert/strict';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,isCoffeeProductDetailUrl,
 MAX_HTML_BYTES,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractEcwidProduct,ecwidProductRequest,extractEcwidSnapshotData} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {fetchPublicCoffeeJson} from '../../src/server/coffee-url-guard.mjs';

const targets=[
 ['Picky Chemist Gesha','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['PERC Kenya Mara','https://perccoffee.com/products/kenya-mara-estate'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['Corvus Echo Gesha','https://www.corvuscoffee.com/products/echo-gesha'],
 ['Corvus Dead Reckoning','https://www.corvuscoffee.com/products/dead-reckoning-blend'],
 ['SEY Yaye Arbegona','https://www.seycoffee.com/collections/coffee/products/2026-yaye-arbegona-ethiopia'],
 ['Onyx Mullugeta','https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26?variant=43228176810082'],
 ['Sweet Bloom Wuri','https://sweetbloomcoffee.com/products/wuri'],
 ['Heart Phono','https://www.heartroasters.com/products/phono'],
 ['Little Wolf Tegu','https://littlewolf.coffee/products/tegu'],
 ['Black White Los Altos','https://www.blackwhiteroasters.com/products/r-los-altos-washed'],
 ['Proud Mary Ovidio','https://proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural'],
 ['Tim Wendelboe Gachatha','https://timwendelboe.no/products/gachatha'],
 ['Park City Ethiopia','https://pcroaster.com/product/ethiopia-single-origin/'],
 ['Queen City Banko','https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia'],
 ['Queen City homepage negative control','https://queencitycollectivecoffee.com/']
];
const safeSummary=(x,name,retryReason,byteCount)=>({
 name,status:x?.ok?'parsed':x?.reason||retryReason||'source_unavailable',
 retried:retryReason==='page_too_large',
 bytes:byteCount,
 fields:Object.keys(x?.fields||{}),
 conflicts:x?.conflicts||[],
 recipePublished:Boolean(x?.roaster_recipe),
 detailsCount:Object.keys(x?.roaster_details||{}).length
});
const results=[];
for(let i=0;i<targets.length;i+=2){
 const batch=await Promise.all(targets.slice(i,i+2).map(async([name,url])=>{
  let page,initial,retried=false;
  try{
   const deadlineAt=Date.now()+15_000;
   initial=await fetchPublicCoffeeHtml(url,{deadlineAt});
   page=initial;
   if(initial.reason==='page_too_large'&&isCoffeeProductDetailUrl(url)&&
      isCoffeeProductDetailUrl(initial.source_url||url)){
    retried=true;
    page=await fetchPublicCoffeeProductRetry(initial.source_url||url,{deadlineAt});
   }
   if(!page?.ok)return {name,status:page?.reason||'unavailable',retried};
   const effectiveUrl=page.source_url||url;
   const original=extractPublicCoffeeFacts(page.html,{source_url:effectiveUrl});
   const clean=compactCoffeeProductHtml(page.html);
   assert.ok(clean, 'Bounded read should always permit compacting: '+name);
   const slim=extractPublicCoffeeFacts(clean,{source_url:effectiveUrl});
   // Full result equality (not just field-count parity): protects flavors,
   // origin, roasts, recipes, conflicts, narrative and release identity.
   assert.deepEqual(slim,original,'Semantic drift after cleanup: '+name);
   if(name.includes('homepage negative control'))
    assert.equal(original.ok,false,'A shop homepage must NEVER become a selected product');
   if(original.ok){
    assert.equal(typeof original.fields.name,'string');
    assert.ok(original.fields.name.length>2);
   }
   return {...safeSummary(original,name,retried?'page_too_large':'',Buffer.byteLength(page.html)),
    retried,compactBytes:Buffer.byteLength(clean)};
  }catch(error){
   // A drift assertion deliberately fails the workflow: never mark failed
   // extracted facts as a successful public smoke.
   console.error('[DIC ADAPTIVE TEST FAILURE] '+name+': '+String(error?.message||error));
   throw error;
  }
 }));
 for(const item of batch){results.push(item);console.log('[DIC ADAPTIVE SOURCE] '+JSON.stringify(item));}
}
const mangoURL='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
const mango=await extractEcwidProduct(mangoURL);
if(!mango?.ok){
 const target=ecwidProductRequest(mangoURL);
 const r=target?await fetchPublicCoffeeJson(target.requestUrl):null;
 let snapshotState=null;
 if(r?.ok){
  try{
   const data=JSON.parse(r.json);
   const trial=extractEcwidSnapshotData(data,target);
   snapshotState={title:typeof data?.title==='string'?data.title:null,
    keys:Object.keys(data||{}).slice(0,22),size:Buffer.byteLength(r.json),
    staticSourceMatch:Boolean(trial?.ok),canonicalDeclared:Boolean(data?.canonicalUrl)};
  }catch{snapshotState={reason:'malformed_public_JSON'};}
 }
 console.log('[DIC MANGO DIAGNOSTIC] '+JSON.stringify({
  targetValid:!!target,transport:r?.ok?'ok':r?.reason||'missing',
  snapshot:snapshotState,noSecrets:true
 }));
 throw Error('Mango Tree public Ecwid transport/product mismatch: investigate before deployment');
}
assert.equal(mango.fields?.name,'Mango Tree Blend');
assert.equal(mango.fields?.roast_level,'Medium');
console.log('[DIC ADAPTIVE ECWID] '+JSON.stringify({name:mango.fields?.name,fields:Object.keys(mango.fields||{})}));
const summary={total:results.length,
 readOrParsed:results.filter(x=>x.status==='parsed').length,
 oversizedRecovered:results.filter(x=>x.retried&&x.status==='parsed').map(x=>x.name),
 unavailable:results.filter(x=>!['parsed','ambiguous_or_missing_product'].includes(x.status)),
 negativeControl:results.find(x=>x.name.includes('homepage negative control'))?.status,
 fullResultParityForAllParsed:true,
 initialCapBytes:MAX_HTML_BYTES,
 retryCapBytes:MAX_PRODUCT_RETRY_BYTES,
 supabaseMutations:0,deploys:0};
console.log('[DIC ADAPTIVE SUMMARY] '+JSON.stringify(summary));
assert.equal(summary.negativeControl,'ambiguous_or_missing_product','Homepage negative control must remain rejected');
assert.ok(summary.readOrParsed>=11,'Too many public product sources unavailable; rerun later');
assert.ok(summary.oversizedRecovered.includes('Picky Chemist Gesha'),
 'Expected Picky large-page recovery, or separately investigate upstream page changes');
