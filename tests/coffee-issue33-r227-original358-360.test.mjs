import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Original immutable 603 source cases #358-360; exact current seller facts, not the frozen oracle.
const cases={
 358:['Finca La Unica - Washed Honduras','https://subliminalcoffee.com/products/finca-la-unica-washed-honduras'],
 359:['Finca Terrerito - Natural Honduras','https://subliminalcoffee.com/products/finca-terrerito-natural-honduras'],
 360:['La Piragua - Anaerobic Natural Colombia','https://subliminalcoffee.com/products/la-piragua-anaerobic-natural-colombia']
};
function parse(n,lines,unrelated=''){
 const [name,url]=cases[n];
 const product={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' | Subliminal Coffee Company</title>'+
  '<script type="application/ld+json">'+JSON.stringify(product)+'</script></head>'+
  '<body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="product-description">'+lines.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+unrelated+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const unica=[
 'Producer: Letica Lopez','Region: Copan','Process: Washed','Varietals: Lempira','Altitude: 1400m',
 'We taste notes of: Milk Chocolate, Sweet Tobacco, and Cinnamon Sugar',
 'Finca La Unica is run by Leticia Lopez, daughter of Al Lopez. The coffee is grown at La Unica and processed at Finca Terrerito.'
];
const terrerito=[
 'Producer: Adelmo Lopez','Region: Copan','Process: Natural','Varietals: Parainema & Obata','Altitude: 1200m',
 'We taste notes of: Asian Plum, Black Tea, Dried Cherry',
 'This particular natural lot works for single origin espresso or pour over.'
];
const piragua=[
 'Producer: The Vargas Family','Region: Huila','Process: Anaerobic Natural','Varietals: Caturra','Altitude: 1800m',
 'We taste notes of: Pink Lemonade, Hibiscus Tea, & Apricot',
 'Arley Vargas and his father Alexander work at La Piragua farm in Huila, Colombia.'
];

test('#358 exact original product identity and washed process',()=>{
 const p=parse(358,unica);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[358][0]);assert.equal(p.fields.process,'Washed');
});
test('#358 own cocoa/tobacco/cinnamon taste is selected, not adjacent farm coffee',()=>{
 const p=parse(358,unica);const notes=String(p.fields.tasting_notes||'');
 assert.match(notes,/Milk Chocolate/i);assert.match(notes,/Sweet Tobacco/i);
 assert.match(notes,/Cinnamon Sugar/i);
});
test('#358 seller Letica/Leticia spelling variation is not father Al Lopez producer',()=>{
 const p=parse(358,unica);
 assert.doesNotMatch(String(p.fields.producer||''),/^Al Lopez$/i);
 assert.equal(p.fields.decaffeination_method??null,null);
});
test('#359 exact original product is Natural, not sister La Unica Washed',()=>{
 const p=parse(359,terrerito);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[359][0]);assert.equal(p.fields.process,'Natural');
});
test('#359 own Asian Plum/Black Tea/Dried Cherry remains product specific',()=>{
 const p=parse(359,terrerito);const notes=String(p.fields.tasting_notes||'');
 assert.match(notes,/Asian Plum/i);assert.match(notes,/Black Tea/i);
 assert.match(notes,/Dried Cherry/i);
});
test('#359 brewing suggestion never becomes numeric espresso recipe',()=>{
 const p=parse(359,terrerito);
 assert.ok(!p.fields.espresso_recipe);assert.ok(!p.fields.decaffeination_method);
});
test('#360 current selected La Piragua retains anaerobic and named family',()=>{
 const p=parse(360,piragua);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[360][0]);assert.equal(p.fields.process,'Anaerobic');
 assert.doesNotMatch(String(p.fields.producer||''),/Balzac/i);
});
test('#360 original own notes cannot borrow sibling Chocolate/Tobacco',()=>{
 const p=parse(360,piragua,
  '<aside class="related-products"><h2>Finca La Unica</h2>Milk Chocolate, Sweet Tobacco, Cinnamon Sugar. Swiss Water Decaf. 18 g in / 36 g out.</aside>');
 const notes=String(p.fields.tasting_notes||'');
 assert.match(notes,/Pink Lemonade/i);assert.match(notes,/Hibiscus/i);assert.match(notes,/Apricot/i);
 assert.doesNotMatch(notes,/Sweet Tobacco/i);assert.ok(!p.fields.decaffeination_method);
 assert.ok(!p.fields.espresso_recipe);
});
test('exact original selected name is not overwritten by related-card identity',()=>{
 const p=parse(358,unica,'<aside class="related-products"><h2>La Piragua - Anaerobic Natural Colombia</h2>Natural Process, Pink Lemonade</aside>');
 assert.equal(p.fields.name,cases[358][0]);assert.equal(p.fields.process,'Washed');
});
