import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://seedscoffee.com/products/top-shelf-series-colombia-alejandro-ruiz';
const name='Top Shelf Series: Colombia Alejandro Ruiz';
const own='Coming from Alejandro Ruiz in Huila, Colombia, the Colombia Alejandro Ruiz Top Shelf coffee is a natural processed Caturra, carrying balanced notes of Star Fruit and Guava.';
const grower='Alejandro Ruiz is a 4th generation coffee producer. He works with his family on Finca El Rocío in Bruselas, Colombia and Finca La Esperenza in Huila, Colombia.';
function parse({ownText=own,more='',metaTitle=name}={}) {
 const schema={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Seeds Coffee Co'}};
 const html='<!doctype html><html><head><title>'+metaTitle+'</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+ownText+'</p><p>'+grower+'</p></div></article></main>'+more+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original294 selected H1 and exact own sensory from natural Caturra product',()=>{
 const p=parse();
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.name,name);
 assert.match(String(p.fields?.tasting_notes||''),/star fruit/i);
 assert.match(String(p.fields?.tasting_notes||''),/guava/i);
 assert.match(String(p.fields?.origin||''),/colombia/i);
 assert.ok(!p.fields?.roast_level,'unpublished roast must not be guessed');
 assert.ok(!p.fields?.decaffeination_method,'unpublished decaf method must not be guessed');
});
test('other coffee category aside may not supply roast process or sensory',()=>{
 const other='<aside><h2>Guji Getachew</h2><p>Roast: Dark. Process: Washed. Tastes Like: Citrus, Black Tea, Honeysuckle.</p></aside>';
 const p=parse({more:other});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,name);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/honeysuckle|black tea/i);
 assert.notEqual(p.fields?.process,'Washed');
 assert.notEqual(p.fields?.roast_level,'Dark');
});
test('recycled historical SEO title never replaces exact current selected product identity',()=>{
 const p=parse({metaTitle:'Guatemala Old Top Shelf Lot - Seeds Coffee Co'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,name);
 assert.doesNotMatch(JSON.stringify(p.fields||{}),/Guatemala Old Top Shelf Lot/i);
});
test('other product note text cannot populate blank selected sensory',()=>{
 const other='<aside><h2>Ethiopia Yirgacheffe Habtamu</h2><p>Tastes Like: Cherry, Papaya, Lime Candy</p></aside>';
 const p=parse({ownText:'Alejandro Ruiz is a coffee producer in Huila, Colombia. This selected product provides no specific tasting notes.',more:other});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/Cherry|Papaya|Lime Candy/i);
});
