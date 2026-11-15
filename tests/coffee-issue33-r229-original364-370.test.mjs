import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const cases={
  364:{name:'Per My Last Email (Decaf)',url:'https://sumatocoffee.com/products/per-my-last-email-decaf'},
  370:{name:'Arbey Cordoba',url:'https://sweetbloomcoffee.com/products/arbey-cordoba-26'}
};
function parse(n,paragraphs,related=''){
 const {name,url}=cases[n];
 const json={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' - selected roaster</title><script type="application/ld+json">'+JSON.stringify(json)+'</script></head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="product-description">'+paragraphs.map(p=>'<p>'+p+'</p>').join('')+
 '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const sumato=[
 'Roast Level: Medium',
 'Process: EA (Ethyl Acetate) Natural Decaffeination',
 'Using ethyl acetate derived from sugarcane molasses, we gently remove the caffeine.',
 'Flavor Profile: Smooth hazelnut, subtle sweetness, balanced acidity',
 'Region: Premium Central American coffee regions',
 'Processing: Washed process before EA decaffeination',
 'Drip Coffee: 1:16; Pour Over: 1:15; French Press: 1:12'
];
const arbey=[
 'bourbon ají variety; Huila, Colombia; mango, bing cherry, pineapple; washed process',
 'We are thrilled to share another beautiful lot of bourbon ají from producer Arbey Cordoba!',
 'Archived: 07.02.26',
 'This bourbon ají lot from producer Arbey Cordoba and his farm El Diviso is really really good.',
 'Fresh off the grind aromatics are ripe mango. Mango transfers to the cup with bing cherry, pineapple and passion fruit.',
 'Elevation: 1886 masl',
 'Espresso: COFFEE IN 18g, ESPRESSO OUT 36g, BREW TIME 22-24s',
 'ORIGAMI AIR: ratio 1:17, coffee 18g, water 305g'
];
test('#364 same-selected sugarcane EA decaf is distinct from green Washed',()=>{
 const p=parse(364,sumato);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[364].name);
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 assert.notEqual(p.fields.process,'Natural','EA Natural describes decaffeination, not natural cherry processing');
});
test('#364 seller-selected medium and hazelnut are not borrowed from sibling',()=>{
 const p=parse(364,sumato);assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes||''),/hazelnut/i);
 assert.ok(!p.fields.espresso_recipe,'filter ratio is not selected espresso recipe');
});
test('#364 explicit green Washed before EA should never become green Natural',()=>{
 const p=parse(364,sumato.concat('Green processing: Washed'));
 assert.notEqual(p.fields.process,'Natural');
});
test('#364 hostile related Natural process does not supersede own selected decaf',()=>{
 const p=parse(364,sumato,'<aside class="related-products"><h2>Other Natural Ethiopia</h2>natural green process, strawberry and rose</aside>');
 assert.equal(p.fields.name,cases[364].name);
 assert.notEqual(p.fields.process,'Natural');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/strawberry|rose/i);
});
test('#370 original selected archive keeps explicit Washed identity',()=>{
 const p=parse(370,arbey);assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Arbey Cordoba');
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.producer||''),/Arbey Cordoba/i);
});
test('#370 exact cup notes, no other archived product flavor',()=>{
 const p=parse(370,arbey);const notes=String(p.fields.tasting_notes||'');
 assert.match(notes,/mango/i);assert.match(notes,/cherry/i);
 assert.match(notes,/pineapple/i);
 assert.ok(!p.fields.decaffeination_method);
});
test('#370 sibling cards cannot supply flavor or decaf evidence',()=>{
 const p=parse(370,arbey,
 '<aside class="related-products"><h2>Winter Bloom</h2>chocolate truffle, plum, fruitcake. Swiss Water decaf.</aside>');
 assert.equal(p.fields.name,'Arbey Cordoba');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/chocolate truffle|fruitcake/i);
 assert.ok(!p.fields.decaffeination_method);
});
test('#367 unavailable exact original cannot satisfy positive official source gate',()=>{
 const errors=requiredFocusedSourceFailures([367],[{number:367,status:'UNAVAILABLE',reason:'HTTP 404'}]);
 assert.ok(errors.some(x=>x.reason==='required_official_source_not_fetched'));
});
