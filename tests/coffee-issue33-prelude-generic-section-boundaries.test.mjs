// Issue #33 original603 #261: source-backed selected Prelude Guji Kercha role boundaries.
// Synthetic markup follows the current official H1 and paragraphs; not raw HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://preludecoffeeroasters.com/products/ethiopia-guji-kercha';
const producerSection='<h2>About the Producer:</h2><p>The Guji region is named for one of the tribes of the Oromo and is one of the administrative zones of the Oromia region. The zone was created in 2002 when the uplands of Borena zone were split to create it.</p>';
const processSection='<h2>About the Process:</h2><p>The Guji region enjoys ideal coffee growing conditions. Its volcanic soil is bursting with nutrients, creating deep red and brown top-layer of soil. The regions high altitude, bi-modal rainfall pattern and dry weather allow for the cherries to develop slowly.</p>';
const cupSection='<h2>What you\'ll find in the cup:</h2><p>This coffee has those classic bursting fruit flavors we\'ve come to love about natural Ethiopian coffees. It reminds us of sweet strawberries and agave nectar with a buttery mouthfeel and a pleasant acidity that makes us think of granny smith apples.</p>';
const parse=(body,head='',related='')=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product">'+head+'</head><body><main><article class="product"><h1>Ethiopia Guji Kercha</h1><div class="product__description">'+body+'</div></article></main>'+related+'</body></html>',
 {source_url:url});

test('#261 a regional About the Producer paragraph cannot create a named producer',()=>{
 const r=parse(producerSection+processSection+cupSection);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Ethiopia Guji Kercha');
 assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Oromo tribe|Borena zone/i);
});

test('#261 climate under About the Process is not a primary coffee-processing method',()=>{
 const r=parse(producerSection+processSection);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined,JSON.stringify(r.fields));
});

test('#261 unrelated SEO and related coffee producer cannot fill selected Guji Kercha',()=>{
 const head='<title>Former Kenya Lot - Producer: Other Estate</title><meta name="description" content="Former Kenya Lot grown by Other Estate">';
 const related='<aside class="related-products"><h2>Other coffee</h2><h3>Kenya Lot</h3><p>Producer: Other Estate</p><p>Process: Washed</p></aside>';
 const r=parse(producerSection+processSection+cupSection,head,related);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Ethiopia Guji Kercha');
 assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
 assert.notEqual(r.fields.process,'Washed',JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Other Estate|Former Kenya Lot/i);
});

test('#261 cup analogy to natural Ethiopian coffees is not primary-process evidence',()=>{
 const r=parse(producerSection+processSection+cupSection);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.process,undefined,JSON.stringify(r.fields));
 assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
});

test('comparison with washed Kenyan coffees cannot fill a selected Ethiopian process',()=>{
 const r=parse('<p>This coffee tastes like washed Kenyan coffees, with a vivid berry cup.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.process,undefined,JSON.stringify(r.fields));
});

test('an actual selected Process label outranks a different-coffee cup analogy',()=>{
 const r=parse('<p>Process: Washed</p>'+cupSection);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
});

test('a direct selected naturally processed statement remains extractable',()=>{
 const r=parse('<p>This coffee is naturally processed and dried in the cherry.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.process,'Natural',JSON.stringify(r.fields));
});
