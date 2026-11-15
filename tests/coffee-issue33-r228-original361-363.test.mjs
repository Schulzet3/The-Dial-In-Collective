import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const selected={
  361:['decaf colombia sugarcane medium roast','https://subterracoffee.com/products/decaf-colombia-sugarcane-medium-roast'],
  362:['ethiopia guji hambela natural light roast','https://subterracoffee.com/products/ethiopia-guji-hambela-buliye-natural-light-roast'],
  363:['mexico chiapas bellavista medium','https://subterracoffee.com/products/mexico-chiapas-bellavista-medium']
};
function parse(n,lines,related=''){
  const [name,url]=selected[n];
  const product={'@context':'https://schema.org','@type':'Product',name,url};
  const html='<html><head><title>'+name+' | subterra coffee</title><script type="application/ld+json">'+JSON.stringify(product)+'</script></head>'+
    '<body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+
    lines.map(s=>'<p>'+s+'</p>').join('')+'</div></article></main>'+related+'</body></html>';
  return extractPublicCoffeeFacts(html,{source_url:url});
}
const decaf=[
 '-a medium roast version of our hit sugarcane decaf Colombia decaf',
 '-delicious rich chocolatey Colombia made with the sugarcane decaffeination process',
 '-rich decaf roast with loads of cocoa, nut, and browned sugar notes',
 '-brewing recommendation: grind a bit finer to bring out darker flavors'
];
const guji=[
 '-another fantastic fresh-crop Ethiopia!',
 '-lovely organic natural grade 1 guji hambela',
 '-sparkling tart acidity with flavors of blueberry, other berries, and some tropical fruit. go fine with the grind!'
];
const mexico=[
 '-brilliant clean washed mexico from Bellavista area of the Chiapas',
 '-produced by small farmholders',
 '-nutty and chocolatey, balanced, clean and sweet. roasted on the med-dark side of medium',
 '-brewing recommendation: espresso or french press, but anything should work well'
];

test('#361 selected medium-roast Sugarcane decaf identifies its current own coffee',()=>{
 const p=parse(361,decaf);assert.equal(p.ok,true);
 assert.equal(String(p.fields.name).toLowerCase(),selected[361][0]);
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 assert.equal(p.fields.roast_level,'Medium');
});
test('#361 cocoa/nut/browned sugar remain own tasting notes',()=>{
 const p=parse(361,decaf);const notes=String(p.fields.tasting_notes||'').toLowerCase();
 for(const n of ['cocoa','nut','browned sugar'])assert.ok(notes.includes(n),n);
});
test('#361 decaffeination is distinct from green-processing method',()=>{
 const p=parse(361,decaf);
 assert.ok(!p.fields.process||p.fields.process==='Other/Unknown',
   'sugarcane decaffeination must not be falsely called a green coffee process');
 assert.ok(!p.fields.espresso_recipe);
});
test('#362 recycled Buliye slug must identify current Guji Hambela, not historical Ayla Bombe',()=>{
 const p=parse(362,guji);assert.equal(p.ok,true);
 assert.equal(String(p.fields.name).toLowerCase(),selected[362][0]);
 assert.doesNotMatch(p.fields.name,/Sidama|Ayla|Bombe/i);
});
test('#362 natural-process current Guji source does not acquire previous Sidama identity or notes',()=>{
 const p=parse(362,guji,'<aside class="related-products"><h2>Sidama Ayla Bombe</h2>Raisin, Vanilla, Washed, Decaf</aside>');
 assert.equal(p.fields.process,'Natural');
 assert.equal(p.fields.roast_level,'Light');
 assert.ok(!p.fields.decaffeination_method);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/raisin|vanilla/i);
});
test('#362 current direct blueberry/berries/tropical fruits are not credited to archived coffee',()=>{
 const p=parse(362,guji);
 const notes=String(p.fields.tasting_notes||'').toLowerCase();
 assert.ok(notes.includes('blueberry'));assert.ok(notes.includes('berries')||notes.includes('berry'));
 assert.equal(String(p.fields.name).toLowerCase(),selected[362][0]);
});
test('#363 exact chosen Bellavista source retains washed Mexico provenance',()=>{
 const p=parse(363,mexico);assert.equal(p.ok,true);
 assert.equal(String(p.fields.name).toLowerCase(),selected[363][0]);
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.origin||''),/Mexico/i);
});
test('#363 own nutty/chocolatey notes exclude neighboring decaf cocoa sugar',()=>{
 const p=parse(363,mexico,
  '<aside class="related-products"><h2>decaf colombia sugarcane medium roast</h2>Cocoa, Browned sugar. Swiss Water decaf.</aside>');
 const notes=String(p.fields.tasting_notes||'').toLowerCase();
 assert.match(notes,/nutty/i);assert.match(notes,/chocolate/i);
 assert.doesNotMatch(notes,/browned sugar/i);assert.ok(!p.fields.decaffeination_method);
});
test('#363 comparative roast wording does not invent a Dark classification or espresso ratio',()=>{
 const p=parse(363,mexico);
 assert.notEqual(p.fields.roast_level,'Dark');
 assert.ok(!p.fields.espresso_recipe);
});
test('all three selected names are stable against generic menu and SEO sibling copy',()=>{
 for(const n of [361,362,363]){
   const a=n===361?decaf:n===362?guji:mexico;
   const p=parse(n,a,'<nav>Sidama Ayla Bombe, Decaf Colombia and Finca La Unica</nav>');
   assert.equal(String(p.fields.name).toLowerCase(),selected[n][0]);
 }
});
