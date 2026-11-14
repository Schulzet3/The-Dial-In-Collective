import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Source-backed Issue #33 #272: Quills' selected product calls Reforest
// Project an initiative that plants trees on other producers' farms.
// Its "Producer" marketing label does NOT identify a grower of this lot.
const url='https://quillscoffee.com/products/colombia-guamo';
const template=(producer,story='',related='')=>
 '<!doctype html><html><head><meta property="og:type" content="product">'+
 '<meta property="og:title" content="Colombia | Natural Guamo">'+
 '<meta property="og:site_name" content="Quills Coffee">'+
 '<script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'Product',name:'Colombia | Natural Guamo',
  brand:{'@type':'Brand',name:'Quills Coffee'},url
 })+'</script></head><body><main><article class="product"><h1>Colombia | Natural Guamo</h1>'+
 '<div class="product-description"><p>Guamo is a Caturra from Colombia produced with a carefully controlled natural process.</p>'+
 '<p>'+story+'</p><p>We are tasting papaya, guava, &amp; hibiscus.</p>'+
 '<p>Region: Caldas</p><p>Producer: '+producer+'</p>'+
 '<p>Varietal: Caturra</p><p>Process: 96-hour Natural</p>'+
 '<p>Fermentation: 36-Hour anaerobic</p>'+
 '<p>Elevation: 1,800 Meters Above Sea Level (MASL)</p></div>'+
 '</article></main>'+related+'<footer>Another coffee: Honey, Ethiopia, Example Farm</footer></body></html>';
const initiative=[
 "Guamo is part of Forest Coffee's Reforest Project, an initiative created in response to climate change on Colombian coffee farming.",
 "The project began by planting 200 trees across the farms of 30 coffee producers near El Vergel Estate.",
 "The initiative aims to plant 17,000 native trees in northern Tolima and southern Caldas."
].join(' ');
const parse=(producer,story=initiative,related='')=>extractPublicCoffeeFacts(template(producer,story,related),{source_url:url});

test('#272 reproducer: selected non-growing reforestation initiative cannot autofill a coffee producer',()=>{
 const p=parse('Reforest Project');
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 assert.equal(p.fields?.name,'Colombia | Natural Guamo');
 assert.equal(p.fields?.producer,undefined,JSON.stringify(p).slice(0,3000));
 assert.ok((p.source_facts||[]).some(x=>String(x.value||'').includes('Reforest Project')),
  'retain seller literal for member review, not canonical producer');
});
test('real named selected producing farm remains a producer despite separate environmental project support',()=>{
 const p=parse('Finca La Fortuna',initiative+' The selected coffee is grown at Finca La Fortuna.');
 assert.equal(p.fields?.producer,'Finca La Fortuna',JSON.stringify(p).slice(0,2000));
});
test('an initiative that actually grows this coffee is not automatically discarded merely for its name',()=>{
 const p=parse('Coffee Roots Project',
  'Coffee Roots Project is a cooperative of farmers that grows and supplies the selected Guamo coffee, with its own farms in Caldas.');
 assert.equal(p.fields?.producer,'Coffee Roots Project',JSON.stringify(p).slice(0,2200));
});
test('an unrelated reforestation project in aside is not negative evidence against an actual current producer',()=>{
 const p=parse('Finca La Fortuna','Grown at Finca La Fortuna.',
  '<aside>'+initiative+'</aside>');
 assert.equal(p.fields?.producer,'Finca La Fortuna',JSON.stringify(p).slice(0,2000));
});
test('no identity from stale SEO or historical unrelated coffee',()=>{
 const p=parse('Finca La Fortuna','Grown at Finca La Fortuna.');
 assert.equal(p.fields?.name,'Colombia | Natural Guamo');
 assert.ok(!String(p.fields?.tasting_notes||'').includes('Another coffee'),JSON.stringify(p).slice(0,1500));
});
