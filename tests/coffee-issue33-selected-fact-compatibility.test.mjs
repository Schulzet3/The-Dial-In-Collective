import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup,withoutDetachedFarmerProfiles} from '../src/server/coffee-product-scope.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {compatibleCoffeeOrigins} from '../src/server/coffee-fact-compatibility.mjs';
const parse=(name,body,url='https://example-coffee.com/products/selected')=>
 extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});
test('VESTA two explicit current labels Region Fresno and Origin Colombia Tolima form a selected tuple',()=>{
 const r=parse('Wush Wush + Papayo','<p>Origin: Colombia, Tolima</p><p>Region: Fresno</p>','https://vestacoffee.com/products/papayo-wushwush-elias-shady-bayter');
 assert.equal(r.ok,true);assert.equal(r.fields.origin,'Fresno, Tolima, Colombia');
 assert.ok(!r.conflicts?.includes('origin'));
});
test('contradictory countries cannot be combined by the region tuple rule',()=>{
 const r=parse('Selected','<p>Country: Peru</p><p>Region: Huila, Colombia</p>');
 assert.equal(r.ok,true);assert.equal(r.fields.origin,undefined);assert.ok(r.conflicts?.includes('origin'));
});
test('Spiritus Guayab Manos de Mujer women producer qualifier is same named program',()=>{
 const r=parse('Guatemala Manos de Mujer',
  '<p>Producer: Guaya&#39;b Asociación Civil, Manos de Mujer program</p>'+
  '<p>Producer: Guaya&#39;b Asociación Civil, Manos de Mujer women producers program</p>',
  'https://spirituscoffee.com/products/guatemala-manos-de-mujer');
 assert.equal(r.ok,true);assert.match(r.fields.producer||'',/Guaya.b Asociación Civil.*Manos de Mujer.*program/);
 assert.ok(!r.conflicts?.includes('producer'));
});
test('different real named producers must still flag conflict',()=>{
 const r=parse('Selected','<p>Producer: Finca La Esperanza</p><p>Producer: Finca La Primavera</p>');
 assert.equal(r.fields.producer,undefined);assert.ok(r.conflicts?.includes('producer'));
});
test('Peru HB compatible Cocoa Almond notes and broader Chocolate list do not conflict',()=>{
 const url='https://lowcountrycoffeeroasters.com/products/peru-hb-1';
 const product={'@type':'Product',name:'Peru HB',url,
  additionalProperty:[{name:'Flavor',value:'Cocoa, Almond, Chocolate'}]};
 const html='<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<main><h1>Peru HB</h1><p>Flavor: Cocoa, Almond</p></main>';
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.ok,true);assert.equal(r.fields.tasting_notes,'Cocoa, Almond');
 assert.ok(!r.conflicts?.includes('tasting_notes'));
});
test('independent overlapping Flavor labels remain real conflicts',()=>{
 const r=parse('Peru HB','<p>Flavor: Cocoa, Almond</p><p>Flavor: Cocoa, Almond, Chocolate</p>');
 assert.equal(r.fields.tasting_notes,undefined);
 assert.ok(r.conflicts?.includes('tasting_notes'));
});
test('actual different selected tasting lists still require manual review',()=>{
 const r=parse('Ethiopia','<p>Tasting Notes: Raspberry, Cane Sugar, Lemon Zest</p>'+
  '<p>Tasting Notes: Ripe Berries, Florals, Sugarcane</p>');
 assert.equal(r.fields.tasting_notes,undefined);assert.ok(r.conflicts?.includes('tasting_notes'));
 assert.match(coffeeUrlPreviewMarkup(r),/Tap the correct option to autofill, or type  a value in the field/);
});
test('Favor selected medium-dark roast outranks the branded Token Dark Roast name',()=>{
 const r=parse('The Token Dark Blend',
  '<p>Behold our year-round Token Dark Roast featuring coffee from Miriam Monteiro de Aguiar.</p>'+
  '<p>They are all here in this medium-dark roast that emphasizes sweetness.</p>',
  'https://favor.coffee/products/the-token-dark-blend');
 assert.equal(r.ok,true);assert.equal(r.fields.roast_level,'Medium-Dark');
 assert.ok(!r.conflicts?.includes('roast_level'));
});
test('direct contradictory selected roast specs remain conflicts',()=>{
 const r=parse('Selected','<p>Roast Level: Dark</p><p>This is a medium-dark roast.</p>');
 assert.equal(r.fields.roast_level,undefined);assert.ok(r.conflicts?.includes('roast_level'));
});
test('Thrive Horizon Organic cannot import unrelated MEET Marta Solares Farm La Esperanza',()=>{
 const markup='<main><h1>Horizon Organic</h1><p>Roast Level: Medium</p>'+
  '<p>Origin: Guatemala / Nicaragua</p><p>Process: Washed</p>'+
  '<div id="meet-farmers-inline"><h3 class="mf-meet-kicker">MEET Marta Solares</h3><h2>Marta Solares</h2>'+
  '<h3>FARM:</h3><p>La Esperanza</p><h3>REGION:</h3><p>San Jose Pinula, Guatemala</p></div></main>';
 assert.match(productMarkup(markup),/La Esperanza|Marta Solares/);
 assert.doesNotMatch(withoutDetachedFarmerProfiles(productMarkup(markup)),/La Esperanza|Marta Solares/);
 const r=extractPublicCoffeeFacts(markup,{source_url:'https://thrivefarmers.com/products/horizon-organic'});
 assert.equal(r.ok,true);assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.fields.producer,undefined);
 assert.doesNotMatch(JSON.stringify(r.fields),/La Esperanza|Marta Solares/);
});
test('exact named selected farmer retains an explicitly relevant MEET person section',()=>{
 const html='<main><h1>Marta Solares</h1><h3>MEET Marta Solares</h3><p>This coffee comes from Marta Solares.</p></main>';
 assert.match(productMarkup(html),/MEET Marta Solares/);
});

test('unrelated generic MEET heading never truncates later selected coffee cultivar specifications',()=>{
 const html='<main><h1>Organic Colombian Coffee</h1><h3>MEET Juan Santos</h3>'+
  '<p>The partnership supports regional education.</p>'+
  '<p>Variety: Caturra, Colombia, Castillo</p></main>';
 assert.match(withoutDetachedFarmerProfiles(productMarkup(html)),/Variety: Caturra, Colombia, Castillo/);
 const result=extractPublicCoffeeFacts(html,{source_url:'https://baldguybrew.com/products/organic-colombian'});
 assert.equal(result.ok,true);
 assert.equal(result.fields.variety,'Caturra, Colombia, Castillo');
});
test('unrelated farmer profile widget must have exact wrapper AND marker to be excluded',()=>{
 for(const html of [
  '<main><h1>Current Coffee</h1><div id="meet-farmers-inline"><h3>MEET Marta Solares</h3><p>Variety: Bourbon</p></div></main>',
  '<main><h1>Current Coffee</h1><div class="farmer"><h3 class="mf-meet-kicker">MEET Marta Solares</h3><p>Variety: Bourbon</p></div></main>'
 ]){
  assert.match(withoutDetachedFarmerProfiles(productMarkup(html)),/Variety: Bourbon/);
 }
});

test('selected natural reserve location and abbreviated secondary Region do not create a false origin conflict',()=>{
 const r=parse('La Josefina Sudán Rumé / Natural Extended Fermentation',
  '<p>Location: Cayambe-Coca Natural Reserve, Ecuador</p>'+
  '<p>Origin: Ecuador</p><p>Region: Cayambe-Coca Natura Reserve</p>',
  'https://www.greatcirclecoffee.com/products/la-josefina-sudan-rume');
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Cayambe-Coca Natural Reserve, Ecuador');
 assert.ok(!r.conflicts?.includes('origin'));
});
test('reserve truncation reconciliation requires identical long locality stem and cannot erase geographic disagreement',()=>{
 assert.equal(
  compatibleCoffeeOrigins('Cayambe-Coca Natural Reserve, Ecuador','Cayambe-Coca Natura Reserve'),
  'Cayambe-Coca Natural Reserve, Ecuador');
 assert.equal(compatibleCoffeeOrigins('Cayambe-Coca Natural Reserve, Ecuador','Other-Coca Natura Reserve, Ecuador'),null);
 assert.equal(compatibleCoffeeOrigins('Cayambe-Coca Natural Reserve, Ecuador','Cayambe-Coca Natura Reserve, Peru'),null);
 assert.equal(compatibleCoffeeOrigins('Cayambe-Coca Natural Reserve, Ecuador','Cayambe-Coca Nature Reserve, Ecuador'),null);
});
