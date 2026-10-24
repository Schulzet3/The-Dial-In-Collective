import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductEspressoReference} from '../src/server/coffee-espresso-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {extractWooStoreData,wooProductRequest} from '../src/server/coffee-woocommerce-store.mjs';
import {isCoffeeProductDetailUrl} from '../src/server/coffee-url-guard.mjs';
import {MAX_SOURCE_FACTS} from '../src/server/coffee-source-facts.mjs';

const source='https://roaster.example.com/products/current-coffee';
const page=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const extract=body=>extractPublicCoffeeFacts(page(body),{source_url:source});
const preview=extra=>({ok:true,fields:{name:'Current Coffee'},...extra});

test('ordinary espresso recipe headings preserve shared-unit ranges without punctuation requirements',()=>{
 for(const heading of ['Espresso Recipe','Espresso Recommendations:','Espresso Guide']){
  const body='<h2>'+heading+'</h2><p>Dose: 18–20g Yield: 36–40g Time: 25–30 seconds</p>';
  const expected={dose_g:18,dose_g_max:20,yield_g_min:36,yield_g_max:40,time_s_min:25,time_s_max:30,method:'Espresso'};
  assert.deepEqual(extractProductEspressoReference(page(body)),expected,heading);
  assert.deepEqual(extract(body).roaster_recipe,expected,heading);
 }
});

test('the public extractor cannot collapse an explicit time range through an older parser',()=>{
 const body='<h2>Espresso Recommendations:</h2><p>Dose: 18g Yield: 36g Time: 25s–30s</p>';
 assert.equal(extract(body).roaster_recipe?.time_s_min,25);
 assert.equal(extract(body).roaster_recipe?.time_s_max,30);
});

test('nearby filter headings cannot complete an incomplete espresso recipe',()=>{
 for(const title of ['Espresso','Espresso Recommendations:']){
  for(const other of ['Filter','V60','AeroPress','French Press']){
   const body='<h2>'+title+'</h2><p>Dose: 18g</p><h3>'+other+'</h3><p>Yield: 45g Output: 45g Time: 30s</p>';
   assert.equal(extractProductEspressoReference(page(body)),null,title+' / '+other);
   assert.equal(extract(body).roaster_recipe,undefined,title+' / '+other);
  }
 }
});

test('conflicting measurements or independent espresso sections cannot manufacture one recipe',()=>{
 for(const body of [
  '<h2>Espresso Recommendations:</h2><p>Dose: 18g Yield: 36g Time: 25s Time: 30s</p>',
  '<h2>Espresso Recommendations:</h2><p>Dose: 18g Yield: 36g Time: 25s</p>'+
   '<h2>Espresso Recommendations:</h2><p>Dose: 20g Yield: 40g Time: 30s</p>'
 ]){
  assert.equal(extractProductEspressoReference(page(body)),null);
  assert.equal(extract(body).roaster_recipe,undefined);
 }
});

test('named equipment recipes retain minute-second time and stop before the next brew method',()=>{
 const body='<h2>Breville Espresso</h2><h6>DOSE: 16g</h6><h6>YIELD: 40g</h6>'+
  '<h6>TEMP: 205° F</h6><h6>TIME: 0:26</h6><h2>Hario V60</h2><p>Dose: 20g Yield: 320g Time: 3:00</p>';
 assert.deepEqual(extractProductEspressoReference(page(body)),{
  dose_g:16,yield_g:40,time_s_min:26,time_s_max:26,method:'Breville Espresso',temperature:'205°F'
 });
});

test('clock-format espresso ranges and temperature ranges are never reduced to their first value',()=>{
 const body='<h2>Espresso Guide</h2><p>Dose: 18g Yield: 36g Time: 0:25–0:30 Temp: 94°C–96°C</p>';
 const recipe=extractProductEspressoReference(page(body));
 assert.equal(recipe.time_s_min,25);assert.equal(recipe.time_s_max,30);
 assert.equal(recipe.temperature,undefined);assert.equal(recipe.temperature_reference,'94°C–96°C');
 assert.equal(extractProductEspressoReference(page(body.replace('0:30','0:80'))),null);
});

test('explicit same-method anaerobic-natural blend components retain their single process',()=>{
 for(const treatment of ['Anaerobic Natural','Natural Anaerobic','Natural Anaeróbico']){
  const body='<p>Process: '+treatment+'</p><h2>Components:</h2><p>50% Ethiopia - '+treatment+
   '</p><p>50% Colombia - '+treatment+'</p>';
  const blend=extractCoffeeBlendEvidence(page(body));
  assert.deepEqual(blend.processes,['Anaerobic']);assert.equal(blend.multi_process,false);
  assert.equal(blend.complete_process,true);assert.equal(extract(body).fields.process,'Anaerobic');
  assert.match(blend.display,new RegExp(treatment));
 }
});

test('a genuinely different blend component still makes the process Other/Unknown',()=>{
 const body='<h2>Components:</h2><p>50% Ethiopia - Anaerobic Natural</p><p>50% Colombia - Washed</p>';
 assert.deepEqual(extractCoffeeBlendEvidence(page(body)).processes,['Anaerobic','Washed']);
 assert.equal(extract(body).fields.process,'Other/Unknown');
});

test('matching partial espresso measurements gain independently published time and temperature',()=>{
 const partial={dose_g:20,yield_g:47,method:'Espresso'};
 const complete={...partial,time_s_min:25,time_s_max:30,temperature:'94°C'};
 const merged=mergePublicProductPreview(preview({roaster_recipe:partial}),preview({roaster_recipe:complete}));
 assert.deepEqual(merged.roaster_recipe,complete);
 assert.deepEqual(partial,{dose_g:20,yield_g:47,method:'Espresso'});
});

test('partial recipes with incompatible equipment or measurements cannot borrow missing values',()=>{
 const first={dose_g:20,yield_g:47,method:'Breville Espresso'};
 for(const second of [
  {dose_g:20,yield_g:47,time_s_min:25,time_s_max:30,method:'La Marzocco Espresso'},
  {dose_g:18,yield_g:47,time_s_min:25,time_s_max:30,method:'Breville Espresso'}
 ]){
  const merged=mergePublicProductPreview(preview({roaster_recipe:first}),preview({roaster_recipe:second}));
  assert.deepEqual(merged.roaster_recipe,first);
  assert.equal(merged.source_facts.filter(f=>f.field==='roaster_recipe'&&f.conflicting).length,2);
 }
});

test('different recipe measurements stay separate and both remain reviewable',()=>{
 const first={dose_g:18,yield_g:36,time_s_min:25,time_s_max:30,method:'Espresso'};
 const second={dose_g:20,yield_g:47,time_s_min:20,time_s_max:24,method:'Espresso'};
 const merged=mergePublicProductPreview(preview({roaster_recipe:first}),preview({roaster_recipe:second}));
 assert.deepEqual(merged.roaster_recipe,first);
 const alternatives=merged.source_facts?.filter(f=>f.field==='roaster_recipe'&&f.conflicting)||[];
 assert.equal(alternatives.length,2);
 assert.ok(alternatives.some(f=>f.value.includes('18')&&f.value.includes('36')));
 assert.ok(alternatives.some(f=>f.value.includes('20')&&f.value.includes('47')));
});

test('different supplementary source values remain reviewable instead of being erased by merge',()=>{
 const merged=mergePublicProductPreview(preview({roaster_details:{farm:'Finca A',recommended_rest:'7 days'}}),
  preview({roaster_details:{farm:'Finca B',recommended_rest:'21 days'}}));
 assert.equal(merged.roaster_details.farm,'Finca A');
 for(const [key,values] of [['farm',['Finca A','Finca B']],['recommended_rest',['7 days','21 days']]]){
  const facts=merged.source_facts?.filter(f=>f.field===key&&f.conflicting)||[];
  assert.deepEqual(facts.map(f=>f.value),values);
 }
});

test('conflicting endpoint elevations are withheld with both source values retained for review',()=>{
 const merged=mergePublicProductPreview(preview({fields:{name:'Current Coffee',elevation_m:'1900 masl'}}),
  preview({fields:{name:'Current Coffee',elevation_m:'800 masl'}}));
 assert.equal(merged.fields.elevation_m,undefined);assert.ok(merged.conflicts?.includes('elevation_m'));
 assert.deepEqual(merged.source_facts.filter(f=>f.field==='elevation_m'&&f.conflicting).map(f=>f.value),['1900 masl','800 masl']);
 const equivalent=mergePublicProductPreview(preview({fields:{name:'Current Coffee',elevation_m:'1,900 meters'}}),
  preview({fields:{name:'Current Coffee',elevation_m:'1900 MASL'}}));
 assert.equal(equivalent.fields.elevation_m,'1,900 meters');assert.equal(equivalent.conflicts,undefined);
});

test('only bounded nested product paths receive the existing larger HTML retry eligibility',()=>{
 for(const path of ['/product/coffees/world-class/samuel-jr/','/en-us/product/coffees/world-class/samuel-jr/',
  '/coffee/single-origin/ethiopia-lot','/collections/espresso/products/hambela']){
  assert.equal(isCoffeeProductDetailUrl('https://roaster.example.com'+path),true,path);
 }
 for(const path of ['/shop/p/unknown-name','/product-category/coffees/ethiopia-lot',
  '/about/story/world-class/samuel-jr/','/product/a/b/c/d/e/ethiopia-lot','/product/coffees/all']){
  assert.equal(isCoffeeProductDetailUrl('https://roaster.example.com'+path),false,path);
 }
});

test('validated public product adapters retain unfamiliar facts and full descriptions for review',()=>{
 const description=Array.from({length:2200},(_,i)=>'publishedword'+i).join(' ')+' final-source-fact';
 const shopify={handle:'current-coffee',title:'Current Coffee',description,
  tags:['Drying duration: 18 days'],metafields:[{key:'Water activity',value:'0.51 Aw'}]};
 const result=extractShopifyAjaxData(shopify,shopifyProductRequest(source));
 assert.equal(result.ok,true);
 assert.ok(result.source_facts.some(f=>f.label==='Drying duration'&&f.value==='18 days'));
 assert.ok(result.source_facts.some(f=>f.label==='Water activity'&&f.value==='0.51 Aw'));
 assert.ok(result.source_facts.some(f=>f.value.endsWith('final-source-fact')));
 assert.equal(result.source_facts_truncated,undefined);
 assert.equal(extractShopifyAjaxData({...shopify,handle:'other-coffee'},shopifyProductRequest(source)),null);
 const wooSource='https://roaster.example.com/product/coffees/current-coffee';
 const woo={slug:'current-coffee',name:'Current Coffee',permalink:wooSource,
  attributes:[{name:'Screen size',terms:[{name:'17/18'}]}],
  prices:{price:'2450',currency_code:'USD',currency_minor_unit:2}};
 const wooResult=extractWooStoreData(woo,wooProductRequest(wooSource));
 assert.ok(wooResult.source_facts.some(f=>f.label==='Screen size'&&f.value==='17/18'));
 assert.ok(wooResult.source_facts.some(f=>f.label==='price'&&f.value==='24.5 USD'));
 assert.equal(extractWooStoreData({...woo,permalink:source},wooProductRequest(wooSource)),null);
});

test('evidence limits survive product adapters and preview merges as an explicit review notice',()=>{
 const facts=Array.from({length:140},(_,i)=>({key:'Uncommon fact '+i,value:'source value '+i}));
 const result=extractShopifyAjaxData({handle:'current-coffee',title:'Current Coffee',metafields:facts},shopifyProductRequest(source));
 assert.equal(result.source_facts_truncated,true);
 assert.ok(result.source_facts.length<=MAX_SOURCE_FACTS);
 const merged=mergePublicProductPreview(preview({}),JSON.parse(JSON.stringify(result)));
 assert.equal(merged.source_facts_truncated,true);
 const wooSource='https://roaster.example.com/product/current-coffee';
 const woo=extractWooStoreData({slug:'current-coffee',name:'Current Coffee',
  attributes:facts.map(f=>({name:f.key,terms:[{name:f.value}]}))},wooProductRequest(wooSource));
 assert.equal(woo.source_facts_truncated,true);
});
