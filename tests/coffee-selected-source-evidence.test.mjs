import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedPageCoffeeEvidence,selectedStructuredCoffeeEvidence} from '../src/server/coffee-selected-source-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';

const facts=args=>selectedStructuredCoffeeEvidence(args);
const found=(facts,field)=>facts.filter(f=>f.field===field).map(f=>f.value);
const currentUrl='https://examplecoffee.org/products/current-lot';
const currentRequest=shopifyProductRequest(currentUrl);
const product=(title,tags=[],description='<p>This is the selected current coffee.</p>',handle='current-lot')=>
 extractShopifyAjaxData({title,handle,tags,description},currentRequest);

for(const [title,description,tags,field,expected] of [
 ['42 Series- Ethiopia Dehab’s Diamond','A current selected-coffee description.',[],'release_label','42 Series'],
 ['Young Producers - Yessica & Diego Parra','The exact selected product.',[],'release_label','Young Producers'],
 ['FIRST CLASS - Las Nubes','The exact selected product.',[],'release_label','FIRST CLASS'],
 ['Micro Plane - Alma Negra','The current selected release.',[],'release_label','Micro Plane'],
 ['Top Shelf Series: Colombia Alejandro Ruiz','Current product',['Top Shelf Series'],'release_label','Top Shelf Series'],
 ['La Josefina Sudán Rumé / Natural','Current product from La Josefina',['next level'],'release_label','Next Level'],
 ['Special Reserve Coffee','Special exclusive offering',['limited-batch'],'release_label','Limited batch'],
 ['Peru Fidel Huancas','This limited-release coffee is produced in Peru.',['Limited Release Single Origin'],'release_label','Limited Release'],
 ['Mexico Veracruz','This limited offering comes from the Sampieri family in Mexico.',[],'release_label','Limited offering'],
 ['Ruth Reyes - Naturally Processed','Produced by one of the hard-working local farmers in this area',['Single Farmer'],'producer','Ruth Reyes'],
 ['Honduras Marcala','This medium-light roasted coffee is DIRECTLY TRADED with our friends, The Garcias, in Marcala, Honduras. With the fourth generation of Garcias comes a new drive.',[],'producer','The Garcias'],
 ['Mexico Zongolica','Mexico Zongolica coffee is also called WPZ — "Woman Power Zongolica!" — by the 20 women who grew and produced it.',[],'producer','20 women producers of Woman Power Zongolica'],
 ['Pura Vida','This coffee is sourced from her estate Santa Elena in the highlands and dried slowly on the patios at Finca Santa Elena to fully develop.',[],'producer','Finca Santa Elena'],
 ['Mexico Chiapas Bellavista Medium','We have roasted on the med-dark side of medium for an approachable cup.',[],'roast_level','Medium'],
 ['Mexico Chiapas Bellavista Medium','- nutty and chocolatey, balanced, clean and sweet',[],'tasting_notes','nutty, chocolatey']
])test('published selected-product literal: '+field+' / '+expected,()=>{
 const x=facts({title,description,tags});
 assert.ok(found(x,field).some(y=>y.toLowerCase()===expected.toLowerCase()),JSON.stringify(x));
 assert.ok(x.every(z=>z.quote&&z.role),'the selected source role and quote must survive');
});

test('named current selected-product page SEO gives an exact flavor profile only',()=>{
 const x=selectedPageCoffeeEvidence({html:'<main><h1>Below Zero Ethiopia Natural Coffee</h1></main>',name:'Below Zero Ethiopia Natural Coffee',seoTitle:'Below Zero Ethiopia Natural Coffee | Sparky’s',seoDescription:'Savor the unique floral and chocolatey notes of Below Zero Ethiopia Natural Coffee, grown in the historic Yirgacheffe region.'});
 assert.deepEqual(found(x,'tasting_notes'),['floral, chocolatey']);
});
test('publisher-matched selected SEO identifies an explicitly named current-coffee series',()=>{
 const x=selectedPageCoffeeEvidence({html:'<main><h1>Bressani Family Washed Sidra</h1></main>',name:'Bressani Family Washed Sidra',seoTitle:'Giorgio Bressani Washed Sidra | ICONIK Exceptional Series',seoPublisher:'ICONIK',seoDescription:'Ecuadorian Sidra grown near Lake Atitlán. An ICONIK Exceptional Series coffee.'});
 assert.deepEqual(found(x,'release_label'),['Exceptional Series']);
});
test('ambiguous SEO brand/series splitting must not manufacture a release label',()=>{
 const x=selectedPageCoffeeEvidence({html:'<main><h1>Rosé Roots Natural</h1></main>',name:'Rosé Roots Natural',seoTitle:'Rosé Roots Natural | South Pink Bucket Series',seoPublisher:'South',seoDescription:'A Pink Bucket Series coffee from this selected producer.'});
 assert.deepEqual(found(x,'release_label'),[]);
});
test('current roast story is literal selected-product language, not a roast-color legend',()=>{
 const html='<main><h1>Finca Milan Nitro Caturra</h1><p>On our end, we approached the roast with a lot of restraint. A coffee this thoughtfully processed deserves to be treated as such. We kept development deliberately light.</p></main>';
 assert.deepEqual(found(selectedPageCoffeeEvidence({html,name:'Finca Milan Nitro Caturra'}),'roast_level'),['Light']);
 for(const bad of ['<div class="roast-scale">Light Roast 20% Dark Roast 80%</div>', '<div>We keep light roast and dark roast options for all customers.</div>']){
  assert.deepEqual(found(selectedPageCoffeeEvidence({html:bad,name:'Finca Milan Nitro Caturra'}),'roast_level'),[]);
 }
});

test('product handle mismatch cannot transfer selected title taxonomy to unrelated product',()=>{
 assert.equal(product('42 Series - Different Coffee',[],'<p>Not the selected lot.</p>','unrelated-lot'),null);
});
test('a sole selected product gets release series but no source comes from user navigation text',()=>{
 const selected=product('42 Series - Selected Lot');
 assert.equal(selected.fields.release_label,'42 Series');
 const unrelated=product('Selected Lot',['Coffee','Espresso','42 Series']);
 assert.equal(unrelated.fields.release_label,undefined);
});
test('conflicting explicitly published roast stays withheld; release candidate cannot override',()=>{
 const conflict=extractShopifyAjaxData({title:'Bellavista Medium',handle:'current-lot',tags:['Coffee_Light Roast','medium-roast'],description:'<p>We roast on the light side of medium.</p>'},currentRequest);
 assert.equal(conflict.fields.roast_level,undefined);
 assert.ok(conflict.conflicts?.includes('roast_level'));
});

for(const [title,desc,tags] of [
 ['Special Reserve Coffee','Our limited offerings are exciting to explore.',[]],
 ['Top Shelf Selected Lot','Current coffee.',[]],
 ['Unrelated Coffee','Enjoy our range of micro plane series, elsewhere.',[]],
 ['Ruth Reyes - Naturally Processed','Unrelated person mentioned; no source link.',[]],
 ['Ruth Reyes - Naturally Processed','Produced by one of many smallholders.',[]],
 ['Mexico Zongolica','Women work in the region, many farmers participate.',[]],
 ['Honduras Marcala','This medium-light roasted coffee is DIRECTLY TRADED with our friends, The Garcias. There is no proof of their current farm.',[]],
 ['Mexico Bellavista Medium','We roast light on Monday.',[]],
 ['Belgian Roast Medium','We roasted on the med-dark side of dark.',''],
 ['Special Coffee','Generically this crop is a limited release.',[]]
])test('no uncorroborated named release, producer, roast: '+title+'/'+desc.slice(0,25),()=>{
 const x=facts({title,description:desc,tags:Array.isArray(tags)?tags:[]});
 assert.equal(x.length,0,JSON.stringify(x));
});

test('an unrelated coffee SEO profile cannot be donated to selected coffee',()=>{
 const x=selectedPageCoffeeEvidence({html:'<main><h1>Selected Coffee</h1></main>',name:'Selected Coffee',seoTitle:'Other Coffee',seoDescription:'Savor the unique floral and chocolatey notes of Below Zero Ethiopia Natural Coffee, grown in a region.'});
 assert.deepEqual(found(x,'tasting_notes'),[]);
});
test('generic Yirgacheffe and Harrar educational note descriptions cannot become current tasting notes',()=>{
 const x=selectedPageCoffeeEvidence({html:'<main><h1>Below Zero Ethiopia Natural Coffee</h1><p>Yirgacheffe coffees are floral and can taste chocolatey.</p></main>',name:'Below Zero Ethiopia Natural Coffee',seoDescription:'Yirgacheffe lots generally tend floral or chocolatey.'});
 assert.deepEqual(found(x,'tasting_notes'),[]);
});
test('unselected collection series, unrelated titles and generic marketing do not become release labels',()=>{
 const x=selectedPageCoffeeEvidence({html:'<nav>First Class | Young Producers | Exceptional Series</nav><h1>Our Current Coffee</h1>',name:'Our Current Coffee',seoTitle:'Other Coffee | South 17 Pink Bucket Series',seoDescription:'Our Pink Bucket Series coffee lineup is very popular.'});
 assert.deepEqual(found(x,'release_label'),[]);
});
test('source evidence parser rejects malformed oversized and non-string structured objects',()=>{
 for(const input of [{title:'Current',description:'x'.repeat(160001),tags:[]},{title:[],description:'x',tags:[]},{title:'Current',description:'x',tags:'42 Series'},{title:'Current',description:'x',tags:[{label:'Next Level'}]}]){
  assert.deepEqual(facts(input),[]);
 }
 assert.deepEqual(selectedPageCoffeeEvidence({html:'a'.repeat(2000001),name:'Selected',seoDescription:'Savor the unique floral and chocolatey notes of Selected Coffee, grown in the region.'}),[]);
});
test('duplicate structured facts never create additional contradictory candidates',()=>{
 const x=facts({title:'Young Producers - Yessica & Diego',description:'Current coffee.',tags:['Young Producers','young producers']});
 assert.deepEqual(found(x,'release_label'),['Young Producers']);
});
test('explicit mislabelled drying equipment is not an extracted botanical variety; raw source remains available',()=>{
 const raw='<main><h1>Colombia Decaf</h1><p>Origin: Colombia</p><p>Varietal: Vertical dryers</p><p>Roast: Medium roast</p></main>';
 const r=extractPublicCoffeeFacts(raw,{source_url:currentUrl});
 assert.equal(r.fields.variety,undefined);
 assert.ok((r.source_facts||[]).some(f=>/Vertical dryers/.test(f.value)),'preserve literal source text');
});
test('valid cultivar names retain their extraction despite invalid equipment rejection',()=>{
 const r=extractPublicCoffeeFacts('<main><h1>Current Coffee</h1><p>Varietal: Bourbon, Caturra</p></main>',{source_url:currentUrl});
 assert.equal(r.fields.variety,'Bourbon, Caturra');
});


// Current selected Bonjo product, not the older Guatemala coffee named by its URL.
// Reproduces split label/value markup and the two-sentence product tier story.
const bonjoUrl='https://bonjocoffee.com/products/guatemala-finca-el-rincon-copy';
const bonjoGrade='<section><p><b>Quality Grade:</b> <span>Gold Collection (Strictly Hard Bean)</span></p></section>';
const bonjoStory='<section><h2>Why We Love It</h2>'+
 '<p>Our Gold Collection is reserved for coffees that exceed the standards of our everyday offerings.</p>'+
 '<p>At Bonjo Coffee Roasters, we selected El Poeta for this tier because it exemplifies clarity, balance and sweetness.</p></section>';
const bonjoSelected=(grade=bonjoGrade,story=bonjoStory)=>
 '<main><h1>Costa Rica, El Poeta</h1>'+grade+story+'</main>';

test('Issue33 #13 exact selected Gold Collection recovers from multi-paragraph product text',()=>{
 const html='<html><head><script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:'Costa Rica, El Poeta',url:bonjoUrl,description:'Small family-owned farms in Costa Rica.'
 })+'</script></head><body>'+bonjoSelected()+'</body></html>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:bonjoUrl});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,'Costa Rica, El Poeta');
 assert.equal(parsed.fields.release_label,'Gold Collection');
 assert.ok(!parsed.conflicts?.includes('release_label'));
 const inline=selectedPageCoffeeEvidence({html:bonjoSelected(),name:'Costa Rica, El Poeta'});
 assert.deepEqual(found(inline,'release_label'),['Gold Collection']);
 assert.match(inline.find(f=>f.field==='release_label').quote,/we selected El Poeta for this tier/i);
});

test('Issue33 quality-grade guard rejects uncorroborated tier and other current product',()=>{
 for(const html of [
  bonjoSelected(bonjoGrade,'<p>We offer Gold Collection products in our shop.</p>'),
  bonjoSelected('',bonjoStory),
  bonjoSelected(bonjoGrade,bonjoStory.replace('El Poeta','Costa Rica, Other Coffee')),
  '<main><h1>Costa Rica, El Poeta</h1></main><aside>'+bonjoGrade+bonjoStory+'</aside>'
 ]){
  // A sidebar is not part of the selected product passed by the caller.
  const selected=html.includes('<aside>')?html.split('</main>')[0]+'</main>':html;
  const candidates=selectedPageCoffeeEvidence({html:selected,name:'Costa Rica, El Poeta'});
  assert.deepEqual(found(candidates,'release_label'),[],html);
 }
});


// Issue33 #59: the current Seeds product is Yirgacheffe Habtamu although its
// recycled Shopify URL slug still names a different Guji Getachew coffee.
const seedsUrl='https://seedscoffee.com/products/ethiopia-guji-getachew-copy';
const seedsName='Ethiopia Yirgacheffe Habtamu';
const seedsEnterprise='Habtamu Fekadu Aga (‘Kuri Mountain Coffee’) was founded in 2015 by Aaga Dinsa, the grandson of a coffee farmer in Kuri kebele.';
const seedsCultivation='The farm Aaga Dinsa inherited from his grandfather continues to serve as the center of the export operation with 105 hectares of planting in Kuri kebele and 837 hectares total including the farms of the 144 registered outgrowers that contribute cherry to company washing stations in Wolega, Guji and Jimma.';
const seedsStory='<p>'+seedsEnterprise+'</p><p>'+seedsCultivation+'</p>';

test('Issue33 #59 exact selected grower/export enterprise requires founder, farm, outgrowers and selected coffee identity',()=>{
 const candidates=selectedStructuredCoffeeEvidence({title:seedsName,description:seedsStory,tags:[]});
 assert.deepEqual(found(candidates,'producer'),['Habtamu Fekadu Aga (Kuri Mountain Coffee)']);
 assert.match(candidates.find(f=>f.field==='producer').quote,/outgrowers that contribute cherry/);
 const shopify=extractShopifyAjaxData({
  title:seedsName,handle:'ethiopia-guji-getachew-copy',tags:[],description:seedsStory
 },shopifyProductRequest(seedsUrl));
 assert.equal(shopify?.fields?.producer,'Habtamu Fekadu Aga (Kuri Mountain Coffee)');
 const html='<script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:seedsName,url:seedsUrl,description:seedsStory
 })+'</script><main><h1>'+seedsName+'</h1></main>';
 const result=extractPublicCoffeeFacts(html,{source_url:seedsUrl});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,seedsName);
 assert.equal(result.fields.producer,'Habtamu Fekadu Aga (Kuri Mountain Coffee)');
 assert.ok(!result.conflicts?.includes('producer'));
});

test('Issue33 grower/export enterprise rejects founder-only, another lot and historical source identities',()=>{
 for(const [title,description] of [
  [seedsName,'<p>'+seedsEnterprise+'</p>'],
  [seedsName,'<p>'+seedsCultivation+'</p>'],
  [seedsName,'<p>'+seedsEnterprise+'</p><p>The founder advises a roastery but has no company farm or cherry suppliers.</p>'],
  [seedsName,'<p>'+seedsEnterprise+'</p><p>'+seedsCultivation.replace('contribute cherry','sell packaging')+'</p>'],
  ['Ethiopia Guji Getachew',seedsStory],
  [seedsName,'<p>Last season, '+seedsEnterprise+'</p><p>'+seedsCultivation+'</p>']
 ]){
  const result=selectedStructuredCoffeeEvidence({title,description,tags:[]});
  assert.deepEqual(found(result,'producer'),[],title+' / '+description);
 }
 const offProduct={'@type':'Product',name:seedsName,url:'https://seedscoffee.com/products/other-coffee',description:seedsStory};
 const current={'@type':'Product',name:'Other Coffee',url:seedsUrl,description:'Other selected lot with no specified producer'};
 const result=extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify([current,offProduct])+
  '</script><main><h1>Other Coffee</h1></main>',{source_url:seedsUrl});
 assert.equal(result.fields.producer,undefined);
});


test('Issue33 #59 real flattened selected coffee notes never become part of the producing enterprise name',()=>{
 const withLeadingNotes='<p>Tastes Like: Cherry, Papaya, Lime Candy</p>'+seedsStory;
 const variants=[
  selectedStructuredCoffeeEvidence({title:seedsName,description:withLeadingNotes,tags:[]}),
  selectedStructuredCoffeeEvidence({title:seedsName,description:'Tastes Like: Cherry, Papaya, Lime Candy '+seedsEnterprise+' '+seedsCultivation,tags:[]})
 ];
 for(const facts of variants){
  assert.deepEqual(found(facts,'producer'),['Habtamu Fekadu Aga (Kuri Mountain Coffee)']);
  assert.ok(!JSON.stringify(found(facts,'producer')).includes('Lime Candy'));
 }
 const shopify=extractShopifyAjaxData({title:seedsName,handle:'ethiopia-guji-getachew-copy',tags:[],description:withLeadingNotes},shopifyProductRequest(seedsUrl));
 assert.equal(shopify?.fields?.producer,'Habtamu Fekadu Aga (Kuri Mountain Coffee)');
 const json={'@type':'Product',name:seedsName,url:seedsUrl,description:withLeadingNotes};
 const html='<script type="application/ld+json">'+JSON.stringify(json)+'</script><main><h1>'+seedsName+'</h1><p>Tastes Like: Cherry, Papaya, Lime Candy</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url:seedsUrl});
 assert.equal(result.fields.producer,'Habtamu Fekadu Aga (Kuri Mountain Coffee)');
 assert.ok(!result.conflicts?.includes('producer'));
});
