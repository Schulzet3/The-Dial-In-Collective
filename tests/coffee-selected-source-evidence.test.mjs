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

test('owner Oct27 Brewpoint listed Brazil and Medium win old SEO',()=>{
 const req=shopifyProductRequest('https://examplecoffee.org/products/current-lot');
 const r=extractShopifyAjaxData({title:'The Alchemist: Decaf Medium Roast',handle:'current-lot',description:'<p>Origin: Brazil (Mountain Water Processed)</p><p>Roast: Medium</p><p>Tasting Notes: Chocolate, Graham Cracker</p>'},req);
 assert.equal(r.fields.origin,'Brazil (Mountain Water Processed)');
 assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.fields.tasting_notes,'Chocolate, Graham Cracker');
});
