// Issue #33 R403: selected #134 current exact product owns water-decaf claim; Kenya AB is different coffee.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://glorycloudcoffee.com/products/honduras-decaf-reserva-pacavita-organic';
const name='Decaf - Swiss Water Process - Medium Roast';
const direct='Swiss Water Process leads to a fantastic decaf coffee that will surprise you with great taste and none of the chemical processing or aftertaste.';
const own='This ethically sourced blend has multiple origins: Colombia, Ethiopia, Honduras, Mexico and Indonesia. Flavors vary by season and may include sweet graham cracker, citrus, cherry and dark chocolate.';
const kenya='With regards to acidity, our Kenya AB has been selected at auction. Producer: Small Farm Holders. Region: Mt. Kenya, Central Kenya. Variety: Mix of Varietals. Processing: Washed, and then sun dried. Altitude: 4,600–6,500 ft (1400–2000m). Cupping Notes: currant, black tea, blackberry.';
function parse(title=name,body=''){
 const structured=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:title,url,brand:{'@type':'Brand',name:'Glory Cloud Coffee Roasters'}});
 return extractPublicCoffeeFacts('<html><head><script type="application/ld+json">'+structured+'</script></head><body><nav><p>Swiss Water Process leads to a delicious decaf coffee.</p></nav><main><h1>'+title+'</h1><section class="product-description"><h2>Description</h2>'+body+'</section></main><footer><p>Producer: Wrong</p></footer></body></html>',{source_url:url});
}
test('selected decaf H1 corroborated by exact own product description yields Water Process, not green processing or Kenya',()=>{
 const r=parse(name,'<p>We know people who change their plans for our Decaf.</p><p>'+direct+'</p><p>'+own+'</p><p>'+kenya+'</p>');
 assert.equal(r.ok,true);assert.equal(r.fields.name,name);assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,undefined);assert.equal(r.fields.roast_level,'Medium');
 assert.notEqual(r.fields.origin,'Mt. Kenya, Central Kenya');assert.notEqual(r.fields.producer,'Small Farm Holders');
 assert.equal(r.fields.variety,undefined);assert.equal(r.fields.elevation_m,undefined);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/currant|black tea|blackberry/iu);
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});
test('title alone or sitewide nav and FAQ do not authorize method',()=>{
 for(const body of ['', '<p>Our decaf tastes delicious.</p>', '<aside><p>'+direct+'</p></aside>']){
  const r=parse(name,body);assert.equal(r.fields.decaffeination_method,undefined,body);
 }
});
test('regular other selected coffee never inherits decaf treatment from page menus',()=>{
 const r=parse('Regular Kenya AB','<p>'+kenya+'</p><aside><p>'+direct+'</p></aside>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('direct source must name SAME water brand as selected decaf title',()=>{
 const r=parse('Decaf - Mountain Water Process - Medium Roast','<p>'+direct+'</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
test('negated, historical and contradictory selected method paragraphs stay blank',()=>{
 for(const phrase of ['Swiss Water Process leads to a fantastic decaf coffee, unlike this coffee which uses ethyl acetate.','Previously, Swiss Water Process leads to a fantastic decaf coffee but this is our new sugarcane decaf.','Swiss Water Process leads to a fantastic decaf coffee. This coffee uses ethyl acetate instead.']){
  const r=parse(name,'<p>'+phrase+'</p>');assert.equal(r.fields.decaffeination_method,undefined,phrase);
 }
});
test('mixed-caffeine coffee cannot obtain full-decaf method from another product',()=>{
 const r=parse('Half-Caff - Swiss Water Process - Medium Roast','<p>'+direct+'</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
});
