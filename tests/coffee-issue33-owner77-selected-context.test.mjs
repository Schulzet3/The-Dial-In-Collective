import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts,selectedNamedRoastCuppingEvidence,selectedMicroLotCategory,selectedProducingCommunity} from '../src/server/coffee-page-metadata.mjs';
import {extractSelectedRegionalBlendElevation} from '../src/server/coffee-blend-evidence.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const matrix='<h2>Our Kona Coffees</h2><p><strong>Cupping Notes on Mountain Thunder’s Coffee:</strong><br><br>'+
 'American - Floral, medium body, complex with grapefruit notes.<br>'+
 'Vienna - Nutty along with a sweet fruitiness.<br>'+
 'French - Having a lighter body and featuring a bittersweet chocolatiness.<br>'+
 'Espresso - Smokey with caramel notes.<br>'+
 'Black and Tan - A full body, with fruity orange notes.<br>'+
 'Organic - A smooth light body</p>';
const roastPage=name=>'<main><h1>'+name+'</h1>'+matrix+
 '<section><h2>About our 100% Kona Espresso Roast Coffee</h2>'+
 '<p>Our Espresso Roast Kona Coffee is a dark roast, with noticeable chocolate overtones.</p></section></main>';
test('#44 own selected chocolate overtones outrank lower-ranked general roast guide, whose Espresso line remains reviewable',()=>{
 const r=extractPublicCoffeeFacts(roastPage('100% Kona Espresso Roast Coffee 16oz'),
  {source_url:'https://mountainthunder.com/products/espresso16'});
 assert.equal(r.ok,true);assert.equal(r.fields.tasting_notes,'chocolate');
 assert.ok(!r.conflicts?.includes('tasting_notes'));
 assert.ok(r.source_facts?.some(f=>f.field==='tasting_notes'&&f.section?.includes('Espresso roast only')));
 assert.ok(r.source_facts?.some(f=>f.field==='tasting_notes'&&f.label==='Selected current product literal overtones'));
 assert.doesNotMatch(JSON.stringify(r.fields),/grapefruit|Vienna|French|orange notes/i);
 assert.match(coffeeUrlPreviewMarkup(r),/chocolate/);
});
test('#44 selected Espresso cupping fallback is preserved when chosen product has no literal overtones',()=>{
 const noDirect=roastPage('100% Kona Espresso Roast Coffee 16oz').replace(
  'with noticeable chocolate overtones','with a smooth aftertaste');
 const r=extractPublicCoffeeFacts(noDirect,{source_url:'https://mountainthunder.com/products/espresso16'});
 assert.equal(r.ok,true);
 assert.equal(r.fields.tasting_notes,'Smokey with caramel notes');
 assert.ok(r.source_facts?.some(f=>f.field==='tasting_notes'&&f.section?.includes('Espresso roast only')));
 assert.match(coffeeUrlPreviewMarkup(r),/Smokey with caramel notes/);
});
test('#44 related Peaberry and generic Kona cannot borrow Espresso roast cupping',()=>{
 for(const name of ['100% Kona Peaberry Coffee 16oz','100% Kona Coffee 16oz','French Press Coffee']){
  const r=extractPublicCoffeeFacts(roastPage(name),{source_url:'https://mountainthunder.com/products/peaberry16'});
  assert.equal(r.fields.tasting_notes,undefined);
  assert.equal(selectedNamedRoastCuppingEvidence(roastPage(name),name),null);
 }
});
test('roast comparison requires at least three different roast rows, no duplicate selected values',()=>{
 const name='100% Kona Espresso Roast Coffee 16oz';
 for(const fragment of [
  '<p>Cupping Notes: Espresso - Smokey with caramel notes.</p>',
  '<p>Our coffee is espresso. Another flavor list is marketing copy.</p>',
  '<p>Cupping Notes<br>Espresso - Smokey with caramel notes.<br>Espresso - Cocoa notes.<br>American - Floral notes.<br>French - Orange notes.</p>',
  '<p>Cupping Notes<br>American - Floral notes.<br>French - Orange notes.<br>Vienna - Nutty notes.</p>'
 ]){
  assert.equal(selectedNamedRoastCuppingEvidence('<main><h1>'+name+'</h1>'+fragment+'</main>',name),null);
 }
});
const description='<p>Our current Guatemala offering is our favorite one. We found two regional lots we love and combined them to make a single origin blend!</p>'+
 '<p>One of the coffees is a fully washed selection from the Lake Atitlan region grown at 1800-2000 meters above sea level. The other is a washed HueHuetenengo grown at 1500-1700 MASL.</p>';
const blendUrl='https://www.bluejazzcoffee.com/products/guatemala-antigua';
test('#12 two explicitly different regional elevation ranges remain separate, blank canonical',()=>{
 const r=extractPublicCoffeeFacts('<main><h1>Guatemala</h1>'+description+'</main>',{source_url:blendUrl});
 assert.equal(r.ok,true);assert.equal(r.fields.elevation_m,undefined);
 assert.match(r.roaster_details.blend_components,/Lake Atitlan: 1800–2000 m \(Washed\)/);
 assert.match(r.roaster_details.blend_components,/HueHuetenengo: 1500–1700 m \(Washed\)/);
 assert.match(r.elevation_review_note,/two regional lots/);
 assert.match(coffeeUrlPreviewMarkup(r),/Elevation review:/);
 assert.ok(r.source_facts?.some(f=>f.field==='component_elevation'&&f.value==='1800–2000 m'));
 assert.match(coffeeSourceReviewSnapshot({...r,source_url:blendUrl}).elevation_review_note,/whole-blend elevation/);
});
test('regional elevations cannot be assigned by generic prose or another coffee offering',()=>{
 for(const [name,text] of [
  ['Kenya',description],['Guatemala','<p>We usually grow at 1500 to 2000 meters.</p>'],
  ['Guatemala',description.replace('current Guatemala offering','current Ethiopia offering')],
  ['Guatemala',description.replace('two regional lots','one regional lot')],
  ['Guatemala',description.replace('1500-1700','1500-6500')]
 ]){
  assert.equal(extractSelectedRegionalBlendElevation('<main><h1>'+name+'</h1>'+text+'</main>',{name}),null);
 }
});
const lotUrl='https://iwanacoffee.com/product/maragogipe-washed-process';
const lotPage=(name,cat='product_cat-micro-lots')=>
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url:lotUrl,brand:{'@type':'Brand',name:'Iwana Coffee'}})+'</script>'+
 '<main><h1>'+name+'</h1><div data-elementor-type="product" class="elementor product type-product status-publish '+cat+'">'+
 '<h2>'+name+'</h2><p>Notes: apple, black tea</p></div></main>';
test('#32 #33 #34 exact selected taxonomy produces Micro-Lot but never invented release date',()=>{
 for(const name of ['Maragogipe – Washed Process','PINK BOURBON – Washed Process','TABi – Natural Process']){
  const r=extractPublicCoffeeFacts(lotPage(name),{source_url:lotUrl});
  assert.equal(r.ok,true);assert.equal(r.fields.release_label,'Micro-Lot');
  assert.equal(r.fields.producer,undefined);
 }
});
test('unrelated product category and navigation cannot assign selected Micro-Lot',()=>{
 assert.equal(selectedMicroLotCategory('<main><h1>Other</h1>'+lotPage('Different Coffee')+'</main>','Other'),false);
 assert.equal(selectedMicroLotCategory(lotPage('Other','product_cat-dark-roast'),'Other'),false);
 assert.equal(selectedMicroLotCategory('<div class="product_cat-micro-lots">Coffee</div>','Other'),false);
});
const community='<main><h1>Ghost Roast</h1><section class="product__description">'+
 '<p><strong>COMMUNITY:</strong> Koba</p><p><strong>LOCATION:</strong> Uraga, Guji, Ethiopia</p>'+
 '<p><strong>PROCESS:</strong> Natural</p></section></main>';
test('#46 explicitly selected producing community is credited as a group, not a farmer',()=>{
 const r=extractPublicCoffeeFacts(community,{source_url:'https://nightswimcoffee.com/products/ghost-roast'});
 assert.equal(r.ok,true);assert.equal(r.fields.producer,'Koba');
 assert.match(r.producer_review_note,/community.*not an individually named farmer/);
 assert.match(r.roaster_details.named_producer,/producing community/);
 assert.ok(r.source_facts?.some(f=>f.label==='Community'&&f.value==='Koba'));
});
test('unlabeled or incomplete community cannot be promoted to producer',()=>{
 for(const fragment of ['<p>COMMUNITY: Koba</p>','<p>COMMUNITY: Koba</p><p>LOCATION: Ethiopia</p>',
  '<p>Our community is Koba.</p><p>LOCATION: Ethiopia</p><p>PROCESS: Natural</p>']){
  assert.equal(selectedProducingCommunity('<main><h1>Ghost Roast</h1>'+fragment+'</main>'),null);
 }
});
