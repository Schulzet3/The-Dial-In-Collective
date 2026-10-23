// Small factual fragments from the 2026-10-23 public acceptance responses.
// These cover source facts found during the manual completeness audit beyond
// the first 64 live assertions. Negative controls are synthetic variants.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

function parse(name,body,url='https://roaster.example/products/current-coffee'){
 const html='<html><head><title>'+name+'</title><link rel="canonical" href="'+url+'"></head>'+
  '<body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 return result;
}
const seyTitle='<div class="coffee_title coffee_titleDesktop">'+
 '<span class="coffeeTitle_producer">Ruarai</span><span class="coffeeTitle_farm">AA SEPARATION</span>'+
 '<span class="coffeeTitle_varietyProcess">SL28 &amp; SL34 - WASHED</span>'+
 '<span class="coffeeTitle_country">Kenya</span></div>';
const seyStory='<h2>ABOUT RUARAI</h2><p>This is our second year working with the Ruarai washing station, '+
 'located in the highlands on the southwestern slopes of Mt. Kenya.</p>';

test('SEY selected title country complements region and its named washing station fills producer',()=>{
 const result=parse('SEY - 2026 Ruarai; AA Separation - Kenya',
  '<section class="coffee_keyInfo">'+seyTitle+'</section>'+
  '<div class="coffee_technicalDetails_detail"><span class="coffee_technicalDetails_detail_title">REGION</span>'+
  '<p class="coffee_technicalDetails_detail_description">Nyeri</p></div>'+seyStory,
  'https://www.seycoffee.com/products/2026-ruarai-aa-separation-kenya');
 assert.equal(result.fields.origin,'Nyeri, Kenya');
 assert.match(result.fields.producer||'',/^Ruarai(?: washing station)?$/i);
 assert.notEqual(result.roaster_details?.farm,'AA SEPARATION','Bean screen size is not a farm');
});

test('SEY details for a related product cannot create selected coffee country or producer',()=>{
 const result=parse('Current Coffee','<p>Variety: Catuaí</p>'+
  '<section class="related-products"><h2>More coffees</h2>'+seyTitle+seyStory+'</section>');
 assert.equal(result.fields.origin,undefined);
 assert.equal(result.fields.producer,undefined);
});

test('Manhattan selected location country complements its explicit region card',()=>{
 const result=parse('Samuel Jr.',
  '<div class="product-drilldown__content--info__location subtitle">Colombia</div>'+
  '<div class="product-drilldown__content--detail"><div class="detail-label">Region</div>'+
  '<div class="detail-value">Cauca<br /></div></div>',
  'https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/');
 assert.equal(result.fields.origin,'Cauca, Colombia');
});

test('Manhattan location metadata on another product cannot extend the current origin',()=>{
 const result=parse('Current Coffee','<p>Region: Cauca</p>'+
  '<section class="related-products"><h2>Related products</h2><h3>Other Coffee</h3>'+
  '<div class="product-drilldown__content--info__location subtitle">Kenya</div></section>');
 assert.equal(result.fields.origin,'Cauca');
});

function spanishFarm(section='Sobre la finca',story='Aquiares es propiedad de Diego Robelo y su familia, '+
 'y asentada sobre la falda del volcán Turrialba a 1400 msnm, se trata de la plantación de café '+
 'más grande en un solo bloque de Costa Rica.'){
 return '<div class="collapsible"><div class="collapsible-button"><h3 class="mb-0 relative">'+
  '<div class="flex">'+section+'</div><span class="fa-solid fa-plus">+</span></h3></div>'+
  '<div class="collapsible-content"><div class="item-body"><div class="gray-links visible">'+story+'</div></div></div></div>';
}
test('NOMAD Spanish farm section credits Aquiares and its named owner from direct DIV text',()=>{
 const result=parse('Centroamericano Natural Anaeróbico','<p>Origen: Costa Rica</p>'+
  '<p>Altitud: 1200 - 1400 MSNM</p>'+spanishFarm(),
  'https://nomadcoffee.es/products/centroamericano-natural-anaerobico');
 assert.match(result.fields.producer||'',/^Diego Robelo(?: y su familia)?$/);
 assert.equal(result.roaster_details?.farm,'Aquiares');
 assert.equal(result.fields.origin,'Costa Rica');
 assert.equal(result.fields.elevation_m,'1200 - 1400 MSNM','Farm narrative height cannot replace the lot altitude range');
});

test('Spanish roaster ownership and another coffee farm story do not become this coffee producer',()=>{
 for(const body of [
  spanishFarm('Sobre nosotros','La empresa es propiedad de Elena Rivera y su familia.'),
  '<section class="related-products"><h2>More coffees</h2>'+spanishFarm()+'</section>'
 ]){
  const result=parse('Current Coffee','<p>Origen: Colombia</p>'+body);
  assert.equal(result.fields.producer,undefined);
  assert.equal(result.roaster_details?.farm,undefined);
 }
});
