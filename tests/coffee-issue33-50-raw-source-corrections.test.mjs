import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://roaster.example.org/products/selected';
const page=(name,body,head='')=>'<html><head>'+head+'</head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
const check=(name,body,head='')=>extractPublicCoffeeFacts(page(name,body,head),{source_url});
test('current selected COMSA organization supplies producer, confirmed in actual Add Coffee preview',()=>{
 const r=check('Honduras - Organic Coffee Beans','<p>Single Origin Organic Honduras coffee from COMSA in Marcala, La Paz. Grown at altitudes between 1,300 and 1,700 meters.</p>');
 assert.equal(r.ok,true);assert.equal(r.fields.producer,'COMSA');assert.match(coffeeUrlPreviewMarkup(r),/COMSA/);
});
test('COMSA is not borrowed into another product or a recommendation card',()=>{
 assert.notEqual(check('Peru Organic','<p>Single Origin Organic Honduras coffee from COMSA in Marcala, La Paz.</p>').fields.producer,'COMSA');
 assert.notEqual(check('Honduras Coffee','<h2>You may also like</h2><p>Single Origin Organic Honduras coffee from COMSA in Marcala, La Paz.</p>').fields.producer,'COMSA');
});
test('selected San Lazaro farm is not the charitable organization Mission Lazarus',()=>{
 const r=check('Honduras San Lazaro','<p>We are proud to be working directly with the San Lazaro farm.</p><p>Finca San Lazaro sits above San Marcos.</p><p>The San Lazaro farm serves the nonprofit Mission Lazarus.</p>');
 assert.equal(r.fields.producer,'Finca San Lazaro');assert.notEqual(r.fields.producer,'Mission Lazarus');
});
test('uncorroborated or other coffee farm reference is not a producer',()=>{
 assert.notEqual(check('Honduras San Lazaro','<p>We are working directly with the San Lazaro farm.</p>').fields.producer,'Finca San Lazaro');
 assert.notEqual(check('Colombia Other','<p>We work directly with the San Lazaro farm. Finca San Lazaro is located elsewhere.</p>').fields.producer,'Finca San Lazaro');
});
test('Sumatra exact selected sensory statement recovers explicit earthy and spicy notes',()=>{
 const r=check('Sumatra','<p>A full-bodied coffee with low acidity, it has earthy, spicy notes that are sometimes described as tasting like dark chocolate or tobacco. Sumatran coffee is a great choice for those who prefer bolder coffee.</p>');
 assert.equal(r.fields.tasting_notes,'earthy, spicy');assert.match(coffeeUrlPreviewMarkup(r),/earthy, spicy/);
});
test('educational flavor illustration is not selected current sensory evidence',()=>{
 const r=check('Sumatra','<h2>What is coffee?</h2><p>A full-bodied coffee with low acidity, it has earthy, spicy notes that are sometimes described as tasting like chocolate.</p>');
 assert.equal(r.fields.tasting_notes,undefined);
});
test('selected Wrecking Ball Gera literal Tastes like wins over generic marketing teaser',()=>{
 const head='<meta name="description" content="Smooth and velvety, nuts and chews from the box of chocolates. Tastes like: Caramel, milk chocolate with a lovely mild berry finish.">';
 const r=check('Ethiopia Gera, Natural Process, Gr. 1','<h4>Smooth and velvety... nuts and chews from the box of chocolates.</h4><h4>Tastes like: Caramel, milk chocolate with a lovely mild berry finish.</h4><h4>Notes and Notes:</h4><p>This is our only natural process coffee.</p>',head);
 assert.equal(r.fields.tasting_notes,'Caramel, milk chocolate with a lovely mild berry finish');
 assert.ok(!(r.conflicts||[]).includes('tasting_notes'));
});
test('another explicitly labeled current Tasting Notes list is not hidden',()=>{
 const r=check('Selected Coffee','<p>Tasting Notes: Mango, lime, jasmine.</p><h4>Tastes like: Caramel, milk chocolate with a lovely mild berry finish.</h4>');
 assert.notEqual(r.fields.tasting_notes,'Caramel, milk chocolate with a lovely mild berry finish');
});
