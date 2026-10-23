// Representative semantic acceptance fixtures based on primary roaster text
// observed 2026-10-23. These are deliberately SYNTHETIC HTML, not claims about
// the vendors' exact markup. The opt-in public live probe captures real pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';

const sweetUrl='https://sweetbloomcoffee.com/products/arbey-cordoba-26';
function page(title,body,{url='https://roaster.example/products/current-coffee',brand='Fixture Roaster',before='',structured=''}={}){
 return {url,html:'<!doctype html><html><head><title>'+title+'</title>'+
  '<meta property="og:type" content="product"><meta property="og:title" content="'+title+'">'+
  '<meta property="og:site_name" content="'+brand+'"><link rel="canonical" href="'+url+'">'+
  structured+'</head><body>'+before+'<main><h1>'+title+'</h1>'+body+'</main></body></html>'};
}
function parse(fixture){
 const result=extractPublicCoffeeFacts(compactCoffeeProductHtml(fixture.html),{source_url:fixture.url});
 assert.equal(result.ok,true,'Representative current-product evidence must remain recognized');
 return result;
}
const sweetBody='<section><h4>bourbon ají variety</h4><h3>Huila, Colombia</h3>'+
 '<p class="flavor">mango, bing cherry, pineapple</p><p>washed process</p></section>'+
 '<p>We are thrilled to share another lot of bourbon ají from producer Arbey Cordoba!</p>'+
 '<p>Archived: 07.02.26</p><h2>Roast Level</h2><span>Light</span><span>Medium</span>'+
 '<section><h2>Arbey Cordoba</h2><p>PRODUCER</p></section>'+
 '<section><h2>since 2025</h2><p>RELATIONSHIP</p></section>'+
 '<section><h2>1886 masl</h2><p>Elevation</p></section>'+
 '<p>This bourbon ají lot from producer Arbey Cordoba and his farm El Diviso has arrived.</p>'+
 '<h2>Brew It</h2><h3>ORIGAMI AIR</h3><p>RATIO 1:17</p><p>COFFEE 18g</p>'+
 '<p>WATER 305g</p><p>T.D.S 1.31%</p><p>GRIND 1000 microns</p>'+
 '<h3>Espresso</h3><p>COFFEE IN 18g</p><p>ESPRESSO OUT 36g</p><p>BREW TIME 22-24s</p>'+
 '<h2>Transparency</h2><p>Green cost $8.70/lb</p>'+
 '<section class="related-products"><h2>More coffees</h2><h3>Other Coffee</h3>'+
 '<p>Origin: Mexico</p><p>Variety: Pacamara</p><p>Producer: Wrong Producer</p>'+
 '<p>Tasting Notes: Toffee, grape</p></section>';

test('Sweet Bloom reported coffee retains source variety, identity, elevation, notes and espresso recipe',()=>{
 const r=parse(page('Arbey Cordoba',sweetBody,{url:sweetUrl,brand:'Sweet Bloom Coffee'}));
 assert.match(r.fields.variety||'',/^bourbon ají$/i);
 assert.equal(r.fields.producer,'Arbey Cordoba');
 assert.match(r.fields.origin||'',/Huila.*Colombia/i);
 assert.match(r.fields.elevation_m||'',/1886\s*masl/i);
 assert.equal(r.fields.process,'Washed');
 assert.match(r.fields.tasting_notes||'',/mango.*bing cherry.*pineapple/i);
 for(const [key,value] of Object.entries({dose_g:18,yield_g:36,time_s_min:22,time_s_max:24}))
  assert.equal(r.roaster_recipe?.[key],value,key);
 assert.equal(r.fields.release_label,undefined,'Archive and relationship dates are not harvest evidence');
 assert.equal(r.fields.roast_level,undefined,'A Light/Medium scale without its indicator is not a selected roast');
 assert.doesNotMatch(r.fields.origin||'',/Mexico/i);
});

test('variety suffix preserves uncommon names and encoded accents without a cultivar dictionary',()=>{
 for(const [source,expected] of [['Bourbon Aj&#237; variety','Bourbon Ají'],['San Isidro 48 cultivar','San Isidro 48'],['SL28 &amp; SL34 varieties','SL28 & SL34']]){
  const r=parse(page('Current Coffee','<h4>'+source+'</h4><p>Process: Washed</p>'));
  assert.equal(r.fields.variety,expected,source);
 }
});

test('SEY explicit variety excludes genetic background and URL year is not harvest',()=>{
 const r=parse(page('Ruarai AA Separation',
  '<h3>VARIETAL</h3><p>SL28 &amp; SL34</p><h3>REGION</h3><p>Nyeri</p>'+
  '<h3>ALTITUDE</h3><p>1,783 masl</p><h3>HARVEST</h3><p>November 2025</p>'+
  '<h2>ABOUT SL28 AND SL34</h2><p>SL34 has a Typica-like background. SL28 is from the Bourbon genetic group.</p>',
  {url:'https://www.seycoffee.com/products/2026-ruarai-aa-separation-kenya',brand:'SEY'}));
 assert.equal(r.fields.variety,'SL28 & SL34');
 assert.equal(r.fields.release_label,'November 2025');
 assert.doesNotMatch(r.fields.variety,/Bourbon|Typica/);
});

test('Black and White exact pipe fields outrank farm history mentioning another variety',()=>{
 const r=parse(page('Lica Torres - Black Cherry Natural',
  '<p>In 2020, Lica planted Milenio trees on his farm at 1500–1600 MASL.</p>'+
  '<p>Origin | Rivas, Brunca, Costa Rica</p><p>Producer | Don Lica Torres</p>'+
  '<p>Farm | Cerro Buena Vista</p><p>Process | Black Cherry Natural</p>'+
  '<p>Variety | Catuaí</p><p>Elevation | 1500 MASL</p>',
  {url:'https://www.blackwhiteroasters.com/products/r-lica-torres-black-cherry-natural',brand:'Black & White Coffee Roasters'}));
 assert.equal(r.fields.variety,'Catuaí');assert.equal(r.fields.producer,'Don Lica Torres');
 assert.equal(r.fields.elevation_m,'1500 MASL');assert.equal(r.fields.process,'Natural');
});

test('country selectors and roaster addresses do not contaminate Tim Wendelboe coffee facts',()=>{
 const r=parse(page('Echemo',
  '<h2>About this coffee</h2><p>Cultivar: Ethiopian heirloom from Coche forest</p>'+
  '<p>Flavour notes: Floral, white tea &amp; stone fruits</p><p>Producer: Khalid Shifa</p>'+
  '<p>Country: Ethiopia</p><p>Region: Goma, Jimma</p><p>Process: Washed</p>'+
  '<p>Harvest date: December 2025</p><footer><p>Address: Oslo, Norway</p></footer>',
  {url:'https://timwendelboe.no/products/echemo-certified-organic',brand:'Tim Wendelboe',
   before:'<nav><select><option>Brazil</option><option>Colombia</option><option>Kenya</option><option>Norway</option></select></nav>'}));
 assert.equal(r.fields.variety,'Ethiopian heirloom from Coche forest');
 assert.equal(r.fields.producer,'Khalid Shifa');assert.equal(r.fields.release_label,'December 2025');
 assert.doesNotMatch(r.fields.origin||'',/Brazil|Colombia|Kenya|Norway/);
 assert.match(r.fields.tasting_notes||'',/Floral.*white tea.*stone fruits/i);
});

test('Onyx named product metric wins over a generic essay about other coffee varieties',()=>{
 const r=parse(page('Geometry',
  '<div class="a-stat" data-name="roast-level"><p>Light<br>Agtron #130<br><label>ROAST LEVEL</label></p></div>'+
  '<div class="a-stat" data-name="variety"><p>Mixed<br><label>VARIETY</label></p></div>'+
  '<div class="a-stat" data-name="country"><p>Colombia, Ethiopia<br><label>ORIGIN</label></p></div>'+
  '<div class="a-stat" data-name="ferment"><p>Washed<br><label>PROCESS METHOD</label></p></div>'+
  '<h2>What Are Coffee Varieties?</h2><p>Coffee varieties include Pacamara, Pink Bourbon, Gesha and Java. SL28 grows in Kenya.</p>',
  {url:'https://onyxcoffeelab.com/products/geometry',brand:'Onyx Coffee Lab'}));
 assert.equal(r.fields.variety,'Mixed');assert.equal(r.fields.origin,'Colombia, Ethiopia');
 assert.equal(r.fields.roast_level,'Light');assert.equal(r.fields.process,'Washed');
});

test('multiline variety values stay together inside their own labeled fact section',()=>{
 const r=parse(page('Samuel Jr.',
  '<section><h3>Variety</h3><p>Caturra</p><p>Chiroso</p></section>'+
  '<section><h3>producer</h3><p>Diego Bermudez</p></section>'+
  '<section><h3>Altitude</h3><p>1960 masl</p></section>',
  {url:'https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/',brand:'Manhattan Coffee Roasters'}));
 assert.match(r.fields.variety||'',/^Caturra(?:[, ]+)Chiroso$/);
 assert.equal(r.fields.producer,'Diego Bermudez');
 assert.doesNotMatch(r.fields.variety||'',/Diego|1960/);
});

test('an actual product story after a related-products block stays available without borrowing card fields',()=>{
 const r=parse(page('Samuel Jr.',
  '<p>Origin: Cauca, Colombia</p><section class="related-products"><h2>Related products</h2>'+
  '<article><h3>Other coffee</h3><p>Producer: Wrong Person</p><p>Variety: Gesha</p></article></section>'+
  '<section class="product-story"><h2>Our Story</h2><p>Producer: Diego Bermudez</p>'+
  '<p>Variety: Caturra Chiroso</p><p>This lot uses thermal shock after fermentation.</p></section>',
  {url:'https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/',brand:'Manhattan Coffee Roasters'}));
 assert.equal(r.fields.producer,'Diego Bermudez');assert.equal(r.fields.variety,'Caturra Chiroso');
});

test('Spanish product labels and MSNM are retained while processing temperature is not espresso temperature',()=>{
 const r=parse(page('Centroamericano Natural Anaeróbico',
  '<ul><li>Origen: Costa Rica</li><li>Proceso: Natural Anaeróbico</li>'+
  '<li>Variedad: Centroamericano</li><li>Altitud: 1200 - 1400 MSNM</li>'+
  '<li>Cosecha: 2026</li><li>Nota de cata: Cacao nibs, Frutos del bosque, Tamarindo</li></ul>'+
  '<h2>Proceso</h2><p>Secado de 28°C a 40°C durante 10–15 días.</p>',
  {url:'https://nomadcoffee.es/products/centroamericano-natural-anaerobico',brand:'NOMAD Coffee'}));
 assert.equal(r.fields.variety,'Centroamericano');assert.equal(r.fields.origin,'Costa Rica');
 assert.equal(r.fields.process,'Anaerobic');assert.equal(r.fields.release_label,'2026');
 assert.match(r.fields.tasting_notes||'',/Cacao nibs.*Frutos del bosque.*Tamarindo/);
 assert.equal(r.roaster_recipe,undefined);
});

test('contradictory explicit variety evidence is withheld instead of silently taking the first value',()=>{
 const fixture=page('Outo',
  '<h3>Variety</h3><p>SL34</p><table><tr><th>Varietal</th><td>Ruiru 11</td></tr></table>'+
  '<p>Process: Washed</p>',{url:'https://coffeacirculor.com/products/outo',brand:'Coffea Circulor'});
 const r=parse(fixture);
 assert.equal(r.fields.variety,undefined);assert.ok(r.conflicts?.includes('variety'));
 assert.equal(r.fields.process,'Washed');
});

test('variety-pack shopping text and generic taxonomy cannot fill a missing coffee variety',()=>{
 const r=parse(page('Current Coffee',
  '<p>Origin: Colombia</p><p>Try our variety pack.</p><h2>About varieties</h2>'+
  '<p>For example, Bourbon and Typica are commonly grown coffee varieties.</p>'+
  '<p>The phrase honey sweetness describes the cup, not its processing method.</p>'));
 assert.equal(r.fields.variety,undefined);assert.equal(r.fields.process,undefined);
});

test('filter-only recipe and fermentation measurements cannot create an espresso recommendation',()=>{
 const r=parse(page('Filter Coffee',
  '<h2>Filter Recipe</h2><p>COFFEE IN 18g</p><p>WATER OUT 305g</p><p>BREW TIME 2:30</p>'+
  '<h2>Processing</h2><p>Fermented for 24 hours at 22°C, then dried for 14 days.</p>'));
 assert.equal(r.roaster_recipe,undefined);
});
