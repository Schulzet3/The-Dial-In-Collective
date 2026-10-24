import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductEspressoReference} from '../src/server/coffee-espresso-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeSourceReviewSnapshot,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const source_url='https://roaster.example/products/current';
const page=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const control=(method,label)=>'<button class="toggle-button" data-brew-method="'+method+'">'+label+'</button>';
const card=(method,label,value)=>'<div class="item-box-container '+method+'"><div class="item-box-content"><h3>'+label+'</h3><div class="description"><p>'+value+'</p></div></div></div>';
const cards=(extra='',controls=control('pour_over','Pour Over')+control('espresso','Espresso'))=>page(
 '<div class="feature-text-paired"><h2>How to Brew</h2><div class="toggle-container">'+controls+'</div>'+
 card('pour_over','Grind','25 grams of medium ground coffee')+card('pour_over','Water','400 grams of 201°F water')+
 card('pour_over','Brew','Pour 50 grams of water. Finish at 3:10.')+
 card('espresso','Dose','18 grams of finely ground coffee')+card('espresso','Yield','40 grams of espresso')+
 card('espresso','Brew','27 seconds')+extra+'</div>');

test('Foster-style standalone espresso labels preserve reversed dose/output and full shot time range',()=>{
 // Reduced exact published Medina brew-guide wording from the frozen source.
 const html=page('<p><strong>Kalita Wave 185 — Pour Over</strong></p><p>21 g coffee / 355 g water; 205°F; 3:00–3:20.</p>'+
  '<p><strong>Espresso</strong></p><p>18 g coffee in / 38 g espresso out • Target time: 28–30 seconds.</p>'+
  '<p>Dose 18 g into a dry, clean basket. Brew to 38 g beverage weight in 28–30 seconds.</p>');
 const expected={dose_g:18,yield_g:38,time_s_min:28,time_s_max:30,method:'Espresso'};
 assert.deepEqual(extractProductEspressoReference(html),expected);
 assert.deepEqual(extractPublicCoffeeFacts(html,{source_url}).roaster_recipe,expected);
});

test('Tenfold-style suffix measurements and a separate duration line retain an espresso recipe',()=>{
 const html=page('<h2>Brew Recipes</h2><p class="subheading">Pour Over</p><p>30g dose<br>450g water<br>3 minutes 15 seconds brew time</p>'+
  '<p class="subheading">ESpresso</p><div><p>18g dose<br>40g yield<br>26 seconds<br>fine grind</p></div>');
 assert.deepEqual(extractProductEspressoReference(html),{dose_g:18,yield_g:40,time_s_min:26,time_s_max:26,method:'Espresso'});
});

test('reversed unit-bearing measurements preserve both ends of published ranges',()=>{
 const html=page('<p><b>Espresso</b></p><p>18–20 grams coffee in / 36 grams to 40 grams espresso out</p><p>25–30 secs</p>');
 assert.deepEqual(extractProductEspressoReference(html),{dose_g:18,dose_g_max:20,yield_g_min:36,yield_g_max:40,time_s_min:25,time_s_max:30,method:'Espresso'});
});

test('forward measurement labels in separate cards retain their original value association',()=>{
 const html=page('<h3>Espresso</h3><p><span>COFFEE IN</span><span>18g</span></p>'+
  '<p><span>ESPRESSO OUT</span><span>36g</span></p><p><span>BREW TIME</span><span>22-24s</span></p>');
 assert.deepEqual(extractProductEspressoReference(html),{dose_g:18,yield_g:36,time_s_min:22,time_s_max:24});
 const inline=page('<h3>Espresso</h3><p>COFFEE IN 18g ESPRESSO OUT 36g BREW TIME 22-24s</p>');
 assert.deepEqual(extractProductEspressoReference(inline),{dose_g:18,yield_g:36,time_s_min:22,time_s_max:24});
});

for(const other of ['Filter','V60','AeroPress','French Press','Pour Over'])test('a standalone '+other+' boundary cannot lend espresso yield or time',()=>{
 const html=page('<p><strong>Espresso</strong></p><p>18g dose</p><p><strong>'+other+'</strong></p><p>40g yield<br>26 seconds</p>');
 assert.equal(extractProductEspressoReference(html),null);
});

test('named method recipes and inline method labels end a standalone espresso section',()=>{
 for(const label of ['Filter Recipe','V60 Guide','Pour Over Brewing Guide','Aeropress Recommendations']){
  const missing=page('<p>Espresso</p><p>18g dose</p><p><strong>'+label+'</strong></p><p>Yield: 40g<br>Time: 26 seconds</p>');
  assert.equal(extractProductEspressoReference(missing),null,label);
  const complete=page('<p>Espresso</p><p>18g dose<br>40g yield<br>26 seconds</p><p><strong>'+label+'</strong></p><p>Yield: 50g<br>Time: 45 seconds</p>');
  assert.deepEqual(extractProductEspressoReference(complete),{dose_g:18,yield_g:40,time_s_min:26,time_s_max:26,method:'Espresso'},label);
 }
 assert.equal(extractProductEspressoReference(page('<p>Espresso</p><p>18g dose</p><p>Filter recipe: Yield: 40g; Time: 26 seconds</p>')),null);
});

test('espresso mentions in ordinary prose do not open a measured recipe section',()=>{
 assert.equal(extractProductEspressoReference(page('<p>This coffee is great for Espresso.</p><p>18g dose<br>40g yield<br>26 seconds</p>')),null);
});

test('pressure-stage or waiting durations cannot become a total shot time',()=>{
 for(const instruction of ['Pre-infusion','Wait','Waiting','Pressure stage','9 bar','Hold at 3 bars','Hold','Resting between stages']){
  const html=page('<p>Espresso</p><p>18g dose<br>40g yield</p><p>'+instruction+'</p><p>26 seconds</p>');
  const result=extractProductEspressoReference(html);
  assert.ok(result);assert.equal(result.time_s_min,undefined,instruction);assert.equal(result.time_s_max,undefined,instruction);
 }
});

test('missing units and contradictory reversed or bare measurements fail closed',()=>{
 for(const body of ['18 dose / 40 yield','18g dose / 40g yield / 20g dose',
  '18g dose / 40g yield<br>25 seconds<br>30 seconds','20–18g dose / 40g yield']){
  assert.equal(extractProductEspressoReference(page('<p>Espresso</p><p>'+body+'</p>')),null,body);
 }
});

test('Methodical-style method controls bind only the espresso measurement cards',()=>{
 const expected={dose_g:18,yield_g:40,time_s_min:27,time_s_max:27,method:'Espresso'};
 assert.deepEqual(extractProductEspressoReference(cards()),expected);
 assert.deepEqual(extractPublicCoffeeFacts(cards(),{source_url}).roaster_recipe,expected);
 assert.equal(expected.temperature,undefined);
});

test('an explicit pull-shot instruction in a Brew card is a total published duration',()=>{
 assert.deepEqual(extractProductEspressoReference(cards().replace('27 seconds','Pull shot for 29 seconds')),
  {dose_g:18,yield_g:40,time_s_min:29,time_s_max:29,method:'Espresso'});
});

test('method cards cannot borrow a filter measurement or form one recipe from different containers',()=>{
 assert.equal(extractProductEspressoReference(cards().replace('Yield</h3>','Water</h3>')),null);
 assert.equal(extractProductEspressoReference(cards().replace('item-box-container espresso','item-box-container pour_over')),null);
 const one='<div><div>'+control('espresso','Espresso')+'</div>'+card('espresso','Dose','18g')+'</div>';
 const two='<div><div>'+control('espresso','Espresso')+'</div>'+card('espresso','Yield','40g')+'</div>';
 assert.equal(extractProductEspressoReference(page(one+two)),null);
});

test('duplicate or conflicting method declarations and measurements fail closed',()=>{
 for(const html of [
  cards(card('espresso','Dose','20g')),
  cards('',control('espresso','Espresso')+control('espresso','Pour Over')),
  cards('',control('espresso','Espresso')+control('pour_over','Espresso')),
  cards().replace('data-brew-method="espresso"','data-brew-method="espresso" data-brew-method="pour_over"'),
  cards().replace('item-box-container espresso','item-box-container espresso pour_over'),
  cards().replace('27 seconds','9 Bar: 26s; Pre-infusion: 3s')
 ])assert.equal(extractProductEspressoReference(html),null);
});

test('quoted attribute contents cannot forge brew-method or guide identity',()=>{
 assert.equal(extractProductEspressoReference(cards().replace('data-brew-method="espresso"',"title='data-brew-method=\"espresso\"'")),null);
 const body='<div class="guide-body" data-guide="a"><div class="guide-text"><p>Coffee: 18g</p><p>Yield: 40g</p><p>Time: 27s</p></div></div>';
 assert.equal(extractProductEspressoReference(page('<button title=\'data-guide="a"\'>Espresso</button>'+body)),null);
 for(const name of ['123','@click']){
  assert.equal(extractProductEspressoReference(cards().replace('data-brew-method="espresso"',name+'=" data-brew-method=\'espresso\' "')),null,name);
  assert.equal(extractProductEspressoReference(cards().replaceAll('class="item-box-container espresso"',name+'=" class=\'item-box-container espresso\' "')),null,name);
  assert.equal(extractProductEspressoReference(page('<button '+name+'=" data-guide=\'a\' ">Espresso</button>'+body)),null,name);
 }
});

test('unrelated or hidden method cards cannot supply a source recipe',()=>{
 const contents=cards().replace(/^<main><h1>Current Coffee<\/h1>/,'').replace(/<\/main>$/,'');
 for(const html of [page('<nav>'+contents+'</nav>'),page('<div class="related-products">'+contents+'</div>'),cards().replace('feature-text-paired','related-products')])
  assert.equal(extractProductEspressoReference(html),null);
 assert.equal(extractProductEspressoReference(cards().replace('<div class="description"><p>40 grams','<div hidden class="description"><p>40 grams')),null);
});

test('new layout references export exactly and never populate dose/yield form fields',()=>{
 const output=extractPublicCoffeeFacts(cards(),{source_url});
 const exported=coffeeSourceReviewSnapshot({...output,source_url});
 assert.deepEqual(exported.roaster_espresso_reference,output.roaster_recipe);
 const fields={name:{value:'',dispatchEvent(){}},dose_g:{value:'20'},yield_g:{value:'45'}};
 applyCoffeeUrlFields({elements:{namedItem:key=>fields[key]||null}},output);
 assert.equal(fields.dose_g.value,'20');assert.equal(fields.yield_g.value,'45');
});
