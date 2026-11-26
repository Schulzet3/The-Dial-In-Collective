import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const targets={
 371:['Uraga','https://sweetbloomcoffee.com/products/uraga'],
 372:['Wuri','https://sweetbloomcoffee.com/products/wuri']
};
function parse(n,claims,related=''){
 const [name,url]=targets[n];
 const schema={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' - Sweet Bloom Coffee</title>'+
  '<script type="application/ld+json">'+JSON.stringify(schema)+'</script></head>'+
  '<body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="product-description">'+claims.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const uraga=[
 'Origin: Guji, Ethiopia','Variety: Heirloom','Process: Natural',
 'Tasting Notes: Guava, Raspberry, Milk Chocolate',
 'Producer: 850 Small Holder Farmers',
 'Elevation: 2150-2250 masl',
 'RELATIONSHIP: Since 2026',
 'Espresso: 18.5g in, 36g out, 20-22 seconds',
 'Origami Air: 18.5g coffee to 305g water in 2:30'
];
const wuri=[
 'Origin: Gedeb, Ethiopia','Variety: Heirloom','Process: Washed',
 'Tasting Notes: Citra Hops, Mandarin, Sugarcane',
 'Producer: 850 small scale producers',
 'Elevation: 2000-2100 masl',
 'RELATIONSHIP: Since 2026',
 'Espresso: 18.5g in, 36g out, 20-22 seconds',
 'Origami Air: 18.5g coffee to 305g water in 2:30'
];
test('#371 selected Uraga retains own Natural and Ethiopian provenance',()=>{
 const p=parse(371,uraga);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Uraga');
 assert.equal(p.fields.process,'Natural');
 assert.match(String(p.fields.origin||''),/Ethiopia/i);
});
test('#372 selected Wuri retains own Washed and Ethiopian provenance',()=>{
 const p=parse(372,wuri);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Wuri');
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.origin||''),/Ethiopia/i);
});
test('#371 RELATIONSHIP since 2026 is not a distinctive harvest or lot release',()=>{
 const p=parse(371,uraga);
 assert.notEqual(p.fields.release_label,'2026');
 assert.doesNotMatch(String(p.fields.producer||''),/since\s+2026/i);
});
test('#372 RELATIONSHIP since 2026 does not become release or grower',()=>{
 const p=parse(372,wuri);
 assert.notEqual(p.fields.release_label,'2026');
 assert.doesNotMatch(String(p.fields.producer||''),/since\s+2026|washing station/i);
});
test('#371 selected flavor is not borrowed from sibling Wuri',()=>{
 const p=parse(371,uraga,
  '<aside class="related-products"><h2>Wuri</h2><p>Citra Hops, Mandarin, Sugarcane. Washed.</p></aside>');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/citra hops|mandarin|sugarcane/i);
 assert.equal(p.fields.process,'Natural');
});
test('#372 selected flavor is not borrowed from sibling Uraga',()=>{
 const p=parse(372,wuri,
  '<aside class="related-products"><h2>Uraga</h2><p>Guava, Raspberry, Milk Chocolate. Natural.</p></aside>');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/guava|raspberry|milk chocolate/i);
 assert.equal(p.fields.process,'Washed');
});
test('filter-only dose is not falsely converted into espresso',()=>{
 const p=parse(371,uraga.filter(x=>!x.startsWith('Espresso:')));
 assert.ok(!p.fields.espresso_recipe || !/305\s*g|origami|2:30/i.test(p.fields.espresso_recipe));
});
test('an independently labeled Lot 12 preserves real release evidence',()=>{
 const p=parse(372,['Process: Washed','Lot: Lot 12','Tasting Notes: Mandarin']);
 assert.notEqual(p.fields.release_label,'2026');
});

test('#371 selected current annual first offering does not make a unique release',()=>{
 const p=parse(371,[...uraga,'Our first natural offering from Ethiopia of 2026 is this lovely gem from the Uraga Washing Station.']);
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.release_label,'2026');
});
test('#372 last washed seasonal selection is not a unique lot release',()=>{
 const p=parse(372,[...wuri,'Our last washed selection from Ethiopia for 2026 comes from the Wuri washing station in Gedeb.']);
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.release_label,'2026');
});
test('an explicit selected Release: 2026 remains a valid direct source claim',()=>{
 const p=parse(371,['Release: 2026','Process: Natural','Tasting Notes: Guava']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.release_label,'2026');
});
