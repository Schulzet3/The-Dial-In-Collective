import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountryFirstCurrentRegion as select} from '../src/server/coffee-country-first-current-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const title='Ethiopia Yirgacheffe',country='Ethiopia';
const quote='A classic single-origin cup from the birthplace of coffee, our meticulously sourced Ethiopia Yirgacheffe Mamo Kacha is roasted light to highlight its explosive aroma, sweet floral and citrus notes, and distinctively herbal, tea-like body.';
const url='https://shop.ohenryscoffee.com/products/ethiopia-yirgacheffe';
const b=(text=quote)=>[{tag:'h1',text:title},{tag:'p',text,section:'Selected coffee',educational:false}];
const page=text=>'<html><head><meta property="og:type" content="product"></head><body><main class="product"><article><h1>'+title+'</h1><div class="product__description"><p>'+text+'</p></div></article></main></body></html>';

test('current country-first exact H1 plus selected single-origin current description refines regional geography',()=>{
 const r=select({name:title,origin:country,blocks:b()});
 assert.equal(r?.value,'Yirgacheffe, Ethiopia',JSON.stringify(r));
 assert.match(r.quote,/our meticulously sourced Ethiopia Yirgacheffe Mamo Kacha/);
 assert.doesNotMatch(r.value,/Mamo Kacha/);
});
test('actual Add Coffee parser and Source Review preserve selected name, roast and sensory identity',()=>{
 const r=extractPublicCoffeeFacts(page(quote),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.equal(r.fields.origin,'Yirgacheffe, Ethiopia',JSON.stringify(r.fields));
 assert.equal(r.fields.roast_level,'Light');
 assert.match(r.fields.tasting_notes||'',/floral/i);
 assert.ok(!(r.conflicts||[]).includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(r),/Yirgacheffe, Ethiopia/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok((r.source_facts||[]).some(f=>f.field==='origin'&&
  /our meticulously sourced Ethiopia Yirgacheffe/.test(f.value)));
});
test('real selected Shopify rich text with nested spans is current coffee description, not meta-only text',()=>{
 const html='<html><head><meta property="og:type" content="product"></head><body><main class="product"><article>'+
  '<h1>Ethiopia Yirgacheffe</h1><div class="product__description rte">'+
  '<span style="font-weight:400;" data-mce-fragment="1">'+quote+
  '<span data-mce-fragment="1"> Sold as a 1-pound bag.</span></span></div></article></main></body></html>';
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,title);
 assert.equal(r.fields.origin,'Yirgacheffe, Ethiopia',JSON.stringify(r.fields));
 assert.match(coffeeUrlPreviewMarkup(r),/Yirgacheffe, Ethiopia/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok((r.source_facts||[]).some(f=>f.field==='origin'&&
  /our meticulously sourced Ethiopia Yirgacheffe/.test(f.value)));
});
test('nested span source from unrelated review section does not qualify',()=>{
 for(const tag of ['p','span','div']){
  assert.equal(select({name:title,origin:country,blocks:[
   {tag:'h1',text:title},{tag,text:quote,section:'Other coffees'}]}),null);
 }
});

test('same source-bound rule is not roaster, URL or selected region-specific',()=>{
 const p='Our single-origin Colombia Huila Finca Esperanza is roasted light to preserve floral notes.';
 const result=select({name:'Colombia Huila',origin:'Colombia',blocks:[
  {tag:'h1',text:'Colombia Huila'},{tag:'p',text:p,section:'Selected description'}]});
 assert.equal(result?.value,'Huila, Colombia');
});
test('mismatched H1 and country, extra competing H1, cultivar, grade and brand terms fail closed',()=>{
 for(const args of [{name:'Ethiopia Gesha'},{name:'Ethiopia Supremo'},
  {name:'Ethiopia Yirgacheffe Blend'},{name:'Ethiopia Sidama'},
  {origin:'Kenya'},{origin:'Yirgacheffe, Ethiopia'},{origin:''}])
  assert.equal(select({name:title,origin:country,blocks:b(),...args}),null,JSON.stringify(args));
 assert.equal(select({name:title,origin:country,blocks:[...b(),{tag:'h1',text:'Other Coffee'}]}),null);
});
test('current selected descriptive identity must be explicit, not URL, SEO or another product sentence',()=>{
 for(const changed of [
  quote.replace('our meticulously sourced','their meticulously sourced'),
  quote.replace('single-origin cup','specialty coffee'),
  quote.replace('Ethiopia Yirgacheffe Mamo Kacha','Ethiopia Sidama Mamo Kacha'),
  quote.replace('is roasted light','was previously roasted light'),
  'Previously '+quote,
  'Another coffee: '+quote
 ])assert.equal(select({name:title,origin:country,blocks:b(changed)}),null,changed);
 assert.equal(select({name:title,origin:country,blocks:[
  {tag:'h1',text:title},{tag:'p',text:quote,section:'Related products'}]}),null);
 assert.equal(select({name:title,origin:country,blocks:[
  {tag:'h1',text:title},{tag:'p',text:quote,educational:true}]}),null);
 assert.equal(select({name:title,origin:country,blocks:[
  {tag:'h1',text:title},{tag:'p',text:'Our Ethiopia Yirgacheffe is roasted light.',section:'Selected'}]}),null);
});
