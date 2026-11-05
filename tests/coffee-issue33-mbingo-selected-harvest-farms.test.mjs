// Issue #33 original603 #217. Synthetic adversarial fixture, not a live URL replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublishedNarrativeRestored} from './helpers/release-published-restoration.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://mbingomountaincoffee.com/products/ethiopia-guji-g3-organic-dambi-uddo-natural';
const title='ETHIOPIA GUJI ORGANIC DAMBI UDDO NATURAL';
const harvest='The meticulous process of harvesting involves hand-picking ripe, red coffee cherries across approximately 450 smallholder farms. These cherries are then delivered to the Dambi Uddo Station, where they undergo a critical floating process to remove any underweight or damaged cherries.';
const page=(name=title,body=harvest,head='',tail='')=>'<html><head><meta property="og:type" content="product">'+head+'</head><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description"><p>'+body+'</p><p>PROCESS: Natural</p><p>CUPPING NOTES: Strawberry, Dried Fruit, Rose, Green Tea</p></div></article></main>'+tail+'</body></html>';
const parse=(name,body,head,tail)=>extractPublicCoffeeFacts(page(name,body,head,tail),{source_url:url});
test('#217 current selected harvesting credits the 450 smallholder farms, not the receiving station',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.fields.name,title);
 if(isPublishedNarrativeRestored()){
  assert.equal(r.fields.producer,undefined,'exact published baseline must not invent grower credit');
 }else assert.equal(r.fields.producer,'approximately 450 smallholder farms',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Natural');assert.ok(!r.conflicts?.includes('producer'));
});
test('#217 different receiving station or selected H1 cannot donate another farm group',()=>{
 const a=parse(title,harvest.replace('Dambi Uddo Station','Other Mill Station'));
 assert.equal(a.ok,true);assert.equal(a.fields.producer,undefined,JSON.stringify(a.fields));
 const b=parse('ETHIOPIA GUJI OTHER LOT NATURAL',harvest);
 assert.equal(b.ok,true);assert.equal(b.fields.producer,undefined,JSON.stringify(b.fields));
});
test('#217 prior/hypothetical/SEO/related prose cannot donate a producer',()=>{
 for(const prefix of ['Previously, ','Hypothetically, ']){
  const r=parse(title,prefix+harvest);assert.equal(r.ok,true);assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
 }
 const seo='<title>Old Dambi Uddo Harvest</title><meta property="og:description" content="'+harvest+'">';
 const related='<aside class="related-products"><h2>Other coffee</h2><p>'+harvest+'</p></aside>';
 const r=parse(title,'This coffee is naturally processed.',seo,related);
 assert.equal(r.ok,true);assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
});
test('#217 a blend component farm group cannot become the whole blend producer',()=>{
 const r=parse(title+' BLEND',harvest+' This blend also includes coffee from another producer.');
 assert.equal(r.ok,true);assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
});
test('#217 conflicting current harvest-group counts cannot be silently selected',()=>{
 const r=parse(title,harvest+'</p><p>'+harvest.replace('450 smallholder farms','320 smallholder farms'));
 assert.equal(r.ok,true);assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
});
