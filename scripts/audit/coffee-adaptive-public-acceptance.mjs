// Product identity, unverified labeling and bounded decoding remain release gates.
// Unprivileged public product HTML acceptance for the ACTUAL adaptive URL
// fetch and parser, no Supabase credentials, JWTs, member quota, browser JS,
// database mutation, raw HTML retention or production deployment.
import assert from 'node:assert/strict';
import {fetchPublicCoffeeHtml,fetchPublicCoffeeProductRetry,isCoffeeProductDetailUrl,fetchPublicCoffeeJson,
 MAX_HTML_BYTES,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {extractEcwidProduct,ecwidProductRequest} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {shopifyProductRequest,extractShopifyProduct,mergePublicProductPreview} from '../../src/server/coffee-shopify-ajax.mjs';
import {wooProductRequest,extractWooProduct} from '../../src/server/coffee-woocommerce-store.mjs';

const targets=[
 ['Picky Chemist Gesha','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['PERC Kenya Mara','https://perccoffee.com/products/kenya-mara-estate'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['Corvus Echo Gesha','https://www.corvuscoffee.com/products/echo-gesha'],
 ['Corvus Dead Reckoning','https://www.corvuscoffee.com/products/dead-reckoning-blend'],
 ['SEY Yaye Arbegona','https://www.seycoffee.com/collections/coffee/products/2026-yaye-arbegona-ethiopia'],
 ['SEY Kedida Gubata','https://www.seycoffee.com/collections/coffee/products/2026-kedida-gubata-ethiopia'],
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
// Independently check the actual public product API enrichment on four vendors,
// with no auth tokens and without treating extra API data as canonical proof.
const enrichmentTargets=new Set(['PERC Kenya Mara','Sweet Bloom Wuri','Heart Phono','Park City Ethiopia','SEY Kedida Gubata']);
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
   if(original.ok&&name==='Picky Chemist Gesha'){
    assert.equal(original.fields.release_label,'Lot #26/136',
     'The selected coffee title explicitly publishes its release lot');
    assert.match(original.fields.tasting_notes||'',/bergamote.*citron confit.*pêche jaune/i,
     'The selected French coffee story explicitly names three floral, citrus and peach descriptors');
   }
   let enrichment=null;
   if(original.ok&&enrichmentTargets.has(name)){
    const source=shopifyProductRequest(effectiveUrl)?
     await extractShopifyProduct(effectiveUrl,{deadlineAt:Date.now()+11_000}):
     wooProductRequest(effectiveUrl)?
      await extractWooProduct(effectiveUrl,{deadlineAt:Date.now()+11_000}):null;
    const combined=mergePublicProductPreview(original,source);
    assert.equal(combined.fields?.name,original.fields?.name,
     'An independent public API must never replace the selected HTML product');
    const gained=Object.keys(combined.fields||{}).filter(key=>!original.fields[key]);
    enrichment={publicApiAvailable:Boolean(source?.ok),gained,conflicts:combined.conflicts||[],
     fieldsAfterMerge:Object.keys(combined.fields||{})};
    console.log('[DIC PUBLIC PRODUCT ENRICHMENT] '+JSON.stringify({name,...enrichment}));
   }
   return {...safeSummary(original,name,retried?'page_too_large':'',Buffer.byteLength(page.html)),
    retried,compactBytes:Buffer.byteLength(clean),...(enrichment?{enrichment}:{})};
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
if(mango?.ok){
 assert.equal(mango.fields?.name,'Mango Tree Blend');
 assert.equal(mango.fields?.roast_level,'Medium');
 console.log('[DIC ADAPTIVE ECWID] '+JSON.stringify({name:mango.fields?.name,fields:Object.keys(mango.fields||{})}));
}else{
 const target=ecwidProductRequest(mangoURL);
 const response=target?await fetchPublicCoffeeJson(target.requestUrl):null;
 let missingProduct=false;
 if(response?.ok){
  let snapshot=null;
  try{snapshot=JSON.parse(response.json);}catch{}
  // Vendor returns HTTP 200 but an empty, no-product static page:
  // record it as EXTERNAL evidence absence, never submit a guessed blend.
  missingProduct=snapshot?.title===''&&!/Mango Tree Blend/i.test(String(snapshot?.htmlCode||'')+
   String(snapshot?.jsonLDHtml||'')+String(snapshot?.ogTagsHtml||''));
 }
 console.log('[DIC MANGO LIVE LIMIT] '+JSON.stringify({
  status:response?.ok?'public_product_empty':response?.reason||'source_unavailable',
  productEvidenceAbsent:missingProduct,unverified:true
 }));
 if(response?.ok&&!missingProduct)
  throw Error('Ecwid returned selected Mango product details but extractor failed to parse');
}

const summary={total:results.length,
 readOrParsed:results.filter(x=>x.status==='parsed').length,
 oversizedRecovered:results.filter(x=>x.retried&&x.status==='parsed').map(x=>x.name),
 unavailable:results.filter(x=>!['parsed','ambiguous_or_missing_product'].includes(x.status)),
 negativeControl:results.find(x=>x.name.includes('homepage negative control'))?.status,
 fullResultParityForAllParsed:true,
 initialCapBytes:MAX_HTML_BYTES,
 retryCapBytes:MAX_PRODUCT_RETRY_BYTES,
 corroboratedPublicEndpointChecks:results.filter(x=>x.enrichment).length,
 corroboratedAdditionalFields:results.filter(x=>x.enrichment).flatMap(x=>x.enrichment.gained.map(y=>x.name+':'+y)),
 supabaseMutations:0,deploys:0};
console.log('[DIC ADAPTIVE SUMMARY] '+JSON.stringify(summary));
assert.equal(summary.negativeControl,'ambiguous_or_missing_product','Homepage negative control must remain rejected');
assert.ok(summary.readOrParsed>=11,'Too many public product sources unavailable; rerun later');
assert.ok(summary.oversizedRecovered.includes('Picky Chemist Gesha'),
 'Expected Picky large-page recovery, or separately investigate upstream page changes');
