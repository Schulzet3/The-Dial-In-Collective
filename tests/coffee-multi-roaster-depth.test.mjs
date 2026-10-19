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
 assert.equal(r.fields.origin,undefined);
 assert.equal(r.fields.process,undefined);
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
 assert.equal(r.fields.origin,'Kenya');
 assert.equal(r.fields.release_label,'December 2025');
 assert.equal(r.fields.process,'Washed');
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
 assert.equal(r.fields.process,undefined);
 assert.equal(r.fields.origin,undefined);
 assert.equal(r.fields.roast_level,'Medium');
});
