import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const html=(name,site,body)=>'<html><head><meta property="og:type" content="product"><meta property="og:title" content="'+name+'"><meta property="og:site_name" content="'+site+'"></head><body><nav><p>Producer: Wrong</p></nav><main><h1>'+name+'</h1>'+body+'<h2>You may also like</h2><p>Origin: Kenya</p></main><footer>Tasting Notes: Fake</footer></body></html>';
function parse(host,path,name,site,body){return extractPublicCoffeeFacts(html(name,site,body),{source_url:'https://'+host+'/'+path});}
test('Corvus blended espresso retains components, dose tolerance, output/time range without invented single country',()=>{
 const r=parse('www.corvuscoffee.com','products/dead-reckoning-blend','Dead Reckoning','Corvus Coffee',
  '<p>Our favorite multi-origin espresso blend with Guatemalan and Ethiopian components.</p>'+
  '<p>Components:</p><p>40% Ethiopia - Ayla Bombe - Natural<br>20% Colombia - Castellana - Washed<br>20% Peru - La Chota - Washed<br>20% Ethiopia - Shakiso Hadeso - Washed</p>'+
  '<p>Tasting Notes: Dark Chocolate, Red Berries</p>'+
  '<p>Espresso Parameter Recommendation:</p><p>Dose: 18g +/- 0.2g<br>Output: 40g-48g<br>Time: 24s-32s<br>Water temp: Just off boil (around 200° in Colorado)</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Ethiopia, Colombia, Peru');
 assert.equal(r.fields.process,'Other/Unknown');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roaster_details.blend_components,/40% Ethiopia.*20% Colombia.*20% Peru/);
 assert.equal(r.fields.tasting_notes,'Dark Chocolate, Red Berries');
 assert.equal(r.roaster_recipe.dose_g,18);
 assert.equal(r.roaster_recipe.dose_tolerance_g,0.2);
 assert.equal(r.roaster_recipe.yield_g,undefined);
 assert.equal(r.roaster_recipe.yield_g_min,40);
 assert.equal(r.roaster_recipe.yield_g_max,48);
 assert.equal(r.roaster_recipe.time_s_min,24);
 assert.equal(r.roaster_recipe.time_s_max,32);
 assert.equal(r.roaster_recipe.temperature,undefined);
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/40–48 g out/);
 assert.match(markup,/24–32 s/);
 assert.match(markup,/18 ± 0\.2 g in/);
 assert.match(markup,/Blend Components/);
});
test('Tim Wendelboe storefront Cultivar, Flavour Notes and Harvest Date labels are recognized',()=>{
 const r=parse('timwendelboe.no','products/gachatha','Gachatha','Tim Wendelboe Coffee',
  '<h3>About this coffee</h3><p>Cultivar: SL28, SL34, Ruiru 11, Batian</p>'+
  '<p>Flavour notes: Blackcurrants, blackberries & raisins</p><p>Producer: Several smallholders farmers</p>'+
  '<p>Country: Kenya</p><p>Region: Nyeri</p><p>Harvest date: December 2025</p>'+
  '<p>Process: Washed</p>');
 assert.equal(r.fields.variety,'SL28, SL34, Ruiru 11, Batian');
 assert.equal(r.fields.tasting_notes,'Blackcurrants, blackberries & raisins');
 assert.equal(r.fields.producer,'Several smallholders farmers');
 assert.equal(r.fields.origin,'Nyeri, Kenya');
 assert.equal(r.fields.release_label,'December 2025');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.roaster_details?.named_producer,undefined,'Producer groups must not be misread as named humans');
 assert.equal(r.roaster_details?.processing_detail,undefined,'General picking/sorting is not a process method');
});
test('Explicit Spanish coffee labels and processing values work without accent loss',()=>{
 const r=parse('roastlatin.example.com','products/finca-sol','Finca Sol','Coffee Roasters',
  '<p>País: Colombia</p><p>Productor: Rosa Martínez</p><p>Variedad: Caturra</p>'+
  '<p>Proceso: Lavado</p><p>Altitud: 1,850 msnm</p>'+
  '<p>Notas de cata: Cítricos, chocolate, caramelo</p><p>Cosecha: 2026</p>');
 assert.equal(r.fields.origin,'Colombia');
 assert.equal(r.fields.producer,'Rosa Martínez');
 assert.equal(r.fields.variety,'Caturra');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.elevation_m,'1,850 msnm');
 assert.equal(r.fields.tasting_notes,'Cítricos, chocolate, caramelo');
 assert.equal(r.fields.release_label,'2026');
});
test('Narrative growth altitude and explicitly credited grower are product-bound, without roast guess',()=>{
 const r=parse('coffeefarm.example.org','products/estate-2026','Estate 2026','Coffee Farm',
  '<h3>Finca Altura, Colombia</h3><p>This coffee is grown at 2100–2250 meters above sea level and produced by Rosa Martínez.</p>');
 assert.equal(r.fields.producer,'Finca Altura');
 assert.equal(r.roaster_details.named_producer,'Rosa Martínez');
 assert.equal(r.fields.origin,'Colombia');
 assert.equal(r.fields.elevation_m,'2100–2250 masl');
 assert.equal(r.fields.roast_level,undefined);
});
test('Generic processing education, off-page cards and filter directions cannot create a roaster espresso recipe',()=>{
 const r=parse('example-roaster.com','products/new-lot','New Lot','Example Coffee',
  '<h2>What is carbonic maceration?</h2><p>Learn about carbonic maceration in general, not this lot.</p>'+
  '<h3>V60 Brew Recommendations:</h3><p>Dose: 20g</p><p>Output: 320g</p><p>Time: 3:00</p>'+
  '<h2>You may also like</h2><p>Espresso Parameter Recommendation: Dose: 18g Output: 40g Time: 25s</p>');
 assert.equal(r.fields.process,undefined);
 assert.equal(r.roaster_recipe,undefined);
 assert.equal(r.roaster_details?.named_producer,undefined);
});
test('Unverified multi-process roaster blends preserve exact parts without fake process',()=>{
 const r=parse('some-roaster.com','products/blend','Seasonal Blend','Some Roaster',
  '<p>Components:</p><ul><li>60% Brazil - Bourbon - Natural</li><li>40% Guatemala - Caturra - Washed</li></ul>'+
  '<p>Roast: Medium</p>');
 assert.match(r.roaster_details.blend_components,/60% Brazil.*40% Guatemala/);
 assert.equal(r.fields.process,'Other/Unknown');
 assert.equal(r.roaster_details.processing_detail,'Natural, Washed');
 assert.equal(r.fields.origin,'Brazil, Guatemala');
 assert.equal(r.fields.roast_level,'Medium');
});

test('Blend preserves two explicit farms and multiple origins with stable deduplication',()=>{
 const r=parse('another-roaster.test-site.com','products/duo-farm','Dual Farm Blend','Another Roaster',
  '<h2>Product Composition</h2><p>Components:</p>'+
  '<ul><li>35% Panama - Finca Deborah - Natural</li>'+
  '<li>25% Panama - Finca Deborah - Washed</li>'+
  '<li>40% Colombia - Hacienda La Esperanza - Washed</li></ul>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Panama, Colombia');
 assert.equal(r.fields.producer,'Finca Deborah, Hacienda La Esperanza');
 assert.equal(r.fields.process,'Other/Unknown');
 assert.equal(r.roaster_details.processing_detail,'Natural, Washed');
 assert.equal(r.roaster_details.blend_components.split('Finca Deborah').length-1,2,
  'The exact components remain intact even though aggregate producer is unique');
});
test('Explicit producer labels in components do not collapse into a single producer',()=>{
 const r=parse('another-roaster.test-site.com','products/roaster-team','Team Blend','Another Roaster',
  '<p>Components:</p><p>55% Peru - Producer: Alicia Torres - Washed<br>'+
  '45% Ecuador - Producer: Juan Vega - Natural</p>');
 assert.equal(r.fields.origin,'Peru, Ecuador');
 assert.equal(r.fields.producer,'Alicia Torres, Juan Vega');
 assert.equal(r.fields.process,'Other/Unknown');
});
test('One known processing method with another component unspecified does not invent a shared method',()=>{
 const r=parse('another-roaster.test-site.com','products/partial','Partial Blend','Another Roaster',
  '<p>Components:</p><p>60% Kenya - Factory B<br>40% Ethiopia - Station A - Washed</p>');
 assert.equal(r.fields.origin,'Kenya, Ethiopia');
 assert.equal(r.fields.process,undefined,'A single listed method does not establish the others');
 assert.equal(r.fields.producer,undefined,'Unlabeled station names do not become producer facts');
});
test('Explicit paired methods select Other/Unknown, while anaerobic natural stays Anaerobic',()=>{
 const mixed=parse('another-roaster.test-site.com','products/mixed','Mixed Coffee','Another Roaster',
  '<p>Process: Washed & Natural</p>');
 const single=parse('another-roaster.test-site.com','products/single','Single Coffee','Another Roaster',
  '<p>Process: Anaerobic Natural</p>');
 assert.equal(mixed.fields.process,'Other/Unknown');
 assert.equal(single.fields.process,'Anaerobic');
});
test('Multi-origin/multi-producer displayed facts escape malicious input, never HTML',()=>{
 const r=parse('another-roaster.test-site.com','products/multi','Multi','Another Roaster',
  '<p>Components:</p><p>50% Kenya - Farm: Finca High - Washed<br>'+
  '50% Peru - Farm: Finca Low - Natural</p>');
 const visible=coffeeUrlPreviewMarkup({...r,fields:{...r.fields,producer:'Finca A <img src=x onerror=alert(1)>, Finca B'}});
 assert.doesNotMatch(visible,/<img\s+src=x/i);
 assert.match(visible,/&lt;img/);
});

test('Inline roaster Components percentage lists support plus and semicolon separators',()=>{
 const plus=parse('roaster.test-site.com','products/inline','Inline Blend','Roaster',
  '<p>Components: 60% Kenya - Finca River - Natural + 40% Peru - Finca Forest - Washed</p>');
 assert.equal(plus.fields.origin,'Kenya, Peru');
 assert.equal(plus.fields.producer,'Finca River, Finca Forest');
 assert.equal(plus.fields.process,'Other/Unknown');
 const semi=parse('roaster.test-site.com','products/inline-semicolon','Inline Semicolon','Roaster',
  '<p>Components: 70% Brazil - Natural; 30% Ethiopia - Washed</p>');
 assert.equal(semi.fields.origin,'Brazil, Ethiopia');
 assert.equal(semi.fields.process,'Other/Unknown');
});
test('Incomplete percentage list cannot establish an entire blend composition',()=>{
 const r=parse('roaster.test-site.com','products/incomplete','Incomplete Blend','Roaster',
  '<p>Components: 60% Brazil - Natural + 20% Ethiopia - Washed</p>');
 assert.equal(r.fields.origin,undefined);
 assert.equal(r.fields.process,undefined);
 assert.equal(r.roaster_details?.blend_components,undefined);
});
