import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selected,direct,fields} from '../scripts/audit/issue33-r256-435-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const page=(description,extra='',h1='The Dark')=>
 '<html><head><title>The Dark | Black Coffee Roasting Company</title></head><body>'+
 '<main><article class="product"><h1>'+h1+'</h1>'+
 '<div class="woocommerce-product-details__short-description"><p>'+description+
 '</p></div></article></main>'+extra+'</body></html>';
const own='This is our darkest blend. It is how people dream of drinking coffee in Paris, 1990. '+
 'This is black as a moonless night. While most of our coffees lean towards medium roast to lighter style, '+
 'this coffee is dark. Roast Level: Our Darkest.';
test('unique exact current H1 plus own dark description, not sibling or duplicated headings',()=>{
 assert.deepEqual(direct(page(own),['The Dark']),{identity:true,own_dark_description:true});
 assert.equal(direct(page('Unspecified roast','<aside>'+own+'</aside>'),['The Dark']).own_dark_description,false);
 assert.equal(direct(page(own),['The Dark','The Dark']).identity,false);
 assert.equal(direct(page(own),['The Light']).identity,false);
});
test('actual selected product parser preserves literal dark roast but not moonless-night flavor',()=>{
 const p=extractPublicCoffeeFacts(page(own),{source_url:selected.url});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.roast_level,'Dark');
 assert.equal(p.fields?.name,'The Dark');
 assert.ok(!/moonless|night|paris/i.test(p.fields?.tasting_notes||''));
});
test('customer review chocolatiness and recommendation coffee cannot fill unpublished product facts',()=>{
 const p=extractPublicCoffeeFacts(page(own,
  '<section id="reviews"><h2>5 reviews for The Dark</h2>'+
  '<p>Our favorite blend! Smooth chocolatiness, dark cherry, cinnamon from Guatemala, Washed.</p></section>'+
  '<aside class="related-products"><h2>Other Coffee</h2>'+
  '<p>Light roast, natural Ethiopian heirloom, 1900 meters.</p></aside>'),{source_url:selected.url});
 assert.equal(p.ok,true);
 assert.ok(!/chocolatiness|cherry|cinnamon/i.test(p.fields?.tasting_notes||''));
 assert.ok(!p.fields?.origin&&!p.fields?.producer&&!p.fields?.elevation_m);
 assert.ok(!p.fields?.decaffeination_method);
});
test('canonical proof rejects imagined cup notes or borrowed process/altitude',()=>{
 const f={name:'The Dark',roaster:'Black Coffee Roasting Company',roast_level:'Dark'};
 assert.ok(Object.values(fields(f)).every(Boolean));
 assert.equal(fields({...f,tasting_notes:'Chocolate'}).no_invented_sensory,false);
 assert.equal(fields({...f,process:'Natural'}).no_unpublished_process,false);
 assert.equal(fields({...f,elevation_m:'1900'}).no_unpublished_elevation,false);
 assert.equal(fields({...f,roast_level:'Medium'}).explicit_dark,false);
});
test('missing or replaced exact product URL is not certified by frozen or search snippet',()=>{
 const f=requiredFocusedSourceFailures([435],[{number:435,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(f.some(x=>x.reason==='required_official_source_not_fetched'));
});
