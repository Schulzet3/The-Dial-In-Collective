import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const target='https://www.corvuscoffee.com/products/echo-gesha';
const base='<html><head><meta property="og:type" content="product"><meta property="og:title" content="Echo Gesha"><meta property="og:site_name" content="Corvus Coffee"></head><body><nav><p>Producer: Wrong Navigation</p></nav><main><h1>Echo Gesha</h1>';
const tail='<h2>You may also like</h2><h4>Finca Unrelated, Kenya</h4><p>Tasting Notes: Wrong Coffee</p></main><footer>Producer: Wrong Footer</footer></body></html>';
const echo='<h3>Cascara Infused Carbonic Maceration</h3><h4>Finca Deborah, Panama</h4>'+
 '<p>Jamison Savage has taken the queen of varieties and married her to wine processing, producing some of the most wildly beautiful experimental Geishas we have discovered.</p>'+
 '<p>Echo carries the torch of a well-crafted Carbonic Maceration coffee and elevates it even further. Whole cherries rest in tanks with cascara, pressurized with CO2 to build a pre-fermentation environment, before the coffee is washed clean and dried.</p>'+
 '<p>Tasting notes: Jasmine, Cabernet Grape, and Tropical</p>';
const parse=body=>extractPublicCoffeeFacts(base+body+tail,{source_url:target});
test('Corvus Echo Gesha reads farm, grower, real fermentation stages and tasting notes',()=>{
 const r=parse(echo);
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Echo Gesha');
 assert.equal(r.fields.roaster,'Corvus Coffee');
 assert.equal(r.fields.origin,'Panama');
 assert.equal(r.fields.producer,'Finca Deborah');
 assert.equal(r.fields.variety,'Gesha');
 assert.equal(r.fields.process,'Anaerobic');
 assert.equal(r.roaster_details.farm,'Finca Deborah');
 assert.equal(r.roaster_details.named_producer,'Jamison Savage');
 assert.match(r.roaster_details.processing_detail,/Cascara Infused Carbonic Maceration.*washed finish/);
 assert.match(r.fields.tasting_notes||'',/Jasmine, Cabernet Grape, and Tropical/);
 assert.equal(r.fields.roast_level,undefined);
 assert.equal(r.fields.elevation_m,undefined);
 assert.equal(r.roaster_recipe,undefined);
 assert.doesNotMatch(JSON.stringify(r),/Wrong Navigation|Wrong Footer|Wrong Coffee|Finca Unrelated/);
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/Farm \/ Estate/);
 assert.match(markup,/Named Producer/);
 assert.match(markup,/Cascara Infused/);
});
test('No grower, farm or processing invented from unrelated paragraphs',()=>{
 const r=parse('<h4>Reserve</h4><p>Explore our producer relationship with Jamison Savage elsewhere.</p>'+
 '<p>Generic washed coffee advice. The espresso ratio should be 1:2.</p>');
 assert.equal(r.fields.producer,undefined);
 assert.equal(r.fields.process,undefined);
 assert.equal(r.roaster_details?.named_producer,undefined);
 assert.equal(r.roaster_recipe,undefined);
});
test('A plain Washed field remains Washed even when unrelated prose mentions other methods',()=>{
 const r=parse('<p>Process: Washed</p><p>We also discuss carbonic maceration as a technique in coffee education.</p>');
 assert.equal(r.fields.process,'Washed');
});
test('Complex processing headline remains supplemental if an explicit canonical process is already present',()=>{
 const r=parse('<p>Process: Washed</p>'+echo);
 assert.equal(r.fields.process,'Washed');
 assert.match(r.roaster_details.processing_detail,/Carbonic Maceration/);
});
