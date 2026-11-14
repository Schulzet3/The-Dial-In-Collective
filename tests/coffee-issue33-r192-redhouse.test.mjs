import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const coffees={
 277:{name:'Geisha El Paraiso Nariño 8 oz',url:'https://redhouseroasters.com/products/gesha-el-paraiso-narino',
  desc:'<p>From the high-altitude slopes of El Paraíso Farm in Nariño, Colombia, comes the rare and refined Geisha coffee. With notes of jasmine, lemon, and a good balance, it is a true coffee masterpiece. Grown by Jose Gomez a second generation coffee farmer.</p><p>FARMER: Jose Gomez Lopez</p><p>FARM: El Paraiso</p><p>VARIETAL: Gesha</p><p>ELEVATION: 1900 Meters</p><p>ORIGIN: Buesaco, Nariño, Colombia</p><p>ROAST: Medium</p><p>CUPPING NOTES: Fruity notes, hibiscus, medium acidity, clean finish.</p>'},
 278:{name:'Mexican Oaxaca',url:'https://redhouseroasters.com/products/mexican-oaxaca',
  desc:'<p>ELEVATION: 1500 Meters</p><p>ORIGIN: Oaxaca Region of Mexico</p><p>PROCESSING: Wet-Hulled</p><p>VARIETAL: Typica/Bourbon</p><p>CUPPING NOTES: Balanced sweet cocoa, honey, caramel.</p>'},
 279:{name:'Sumatra',url:'https://redhouseroasters.com/products/sumatra',
  desc:'<p>ELEVATION: 1500-1800 Meters</p><p>ROAST: Full City</p><p>ORIGIN: Kerinci</p><p>PROCESSING: Wet-Hulled</p><p>VARIETAL: Djember (S-795)</p><p>CUPPING NOTES: Molasses, floral. Spice. Full body, sweet finish.</p>'}
};
function parse(n,other='',override=null){
 const c=coffees[n],p={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Red House Roasters'}};
 const html='<!doctype html><html><head><meta property="og:type" content="product"><meta property="og:title" content="'+c.name+'"><script type="application/ld+json">'+JSON.stringify(p)+'</script></head><body><header><a href="/products/other">More coffee</a></header><main><article class="product"><h1>'+c.name+'</h1><div class="product-description">'+(override??c.desc)+'</div><select><option>Whole Bean</option><option>Fine for Espresso</option></select></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
const f=n=>parse(n).fields||{},notes=p=>String(p.fields?.tasting_notes||'').toLowerCase();
test('#277 current chosen Geisha maintains H1, named grower and selected cupping notes',()=>{
 const p=parse(277);assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.match(String(p.fields?.name||''),/Geisha El Paraiso Nariño 8 oz/);
 assert.match(String(p.fields?.producer||''),/Jose Gomez Lopez/i,JSON.stringify(p.fields));
 for(const x of ['fruity','hibiscus'])assert.ok(notes(p).includes(x),JSON.stringify(p.fields));
 assert.equal(p.fields?.roast_level,'Medium');
 assert.match(String(p.fields?.origin||''),/Colombia/i);
 assert.ok(!p.fields?.process&&!p.fields?.decaffeination_method);
});
test('#277 narrative jasmine and lemon are distinct selected evidence, not generic menu notes',()=>{
 const c=coffees[277],p=parse(277),facts=p.source_facts||[];
 assert.equal(p.ok,true);assert.match(c.desc,/notes of jasmine, lemon/);
 assert.match(c.desc,/CUPPING NOTES: Fruity notes, hibiscus/);
 assert.ok(facts.some(x=>x.field==='tasting_notes'&&/hibiscus/i.test(String(x.value||''))),JSON.stringify(facts).slice(0,1600));
});
test('#277 own secondary jasmine/lemon pair is retained for Source Review, not canonical autofill',()=>{
 const p=parse(277);assert.equal(p.ok,true);
 const review=(p.source_facts||[]).filter(x=>x.field==='sensory_context'&&
  x.label==='Selected current unlabeled tasting pair (review only)');
 assert.equal(review.length,1,JSON.stringify((p.source_facts||[]).slice(0,32)));
 assert.match(review[0].value,/jasmine/i);assert.match(review[0].value,/lemon/i);
 assert.equal(review[0].source_url,coffees[277].url);
 assert.match(notes(p),/hibiscus/i);assert.doesNotMatch(notes(p),/jasmine|lemon/i);
});
test('#277 related-coffee flavor pair cannot add selected context',()=>{
 const chosen=coffees[277].desc.replace('With notes of jasmine, lemon, and a good balance, it is a true coffee masterpiece.','');
 const p=parse(277,'<aside><h2>Other Coffee</h2><p>With notes of caramel, cinnamon, and a good balance, this coffee is excellent.</p></aside>',chosen);
 assert.equal(p.ok,true);
 assert.ok(!(p.source_facts||[]).some(x=>x.label==='Selected current unlabeled tasting pair (review only)'),JSON.stringify((p.source_facts||[]).slice(0,30)));
});
test('#277 conditional milk tasting pair cannot become intrinsic selected context',()=>{
 const chosen=coffees[277].desc.replace('With notes of jasmine, lemon, and a good balance, it is a true coffee masterpiece.',
  'If brewed with milk, with notes of cinnamon, vanilla, and a good balance, this drink is lovely.');
 const p=parse(277,'',chosen);assert.equal(p.ok,true);
 assert.ok(!(p.source_facts||[]).some(x=>x.label==='Selected current unlabeled tasting pair (review only)'),JSON.stringify((p.source_facts||[]).slice(0,25)));
});
test('#278 exact Oaxaca distinguishes Wet-Hulled from Washed and preserves selected notes',()=>{
 const p=parse(278);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 for(const x of ['cocoa','honey','caramel'])assert.ok(notes(p).includes(x),JSON.stringify(p.fields));
 assert.match(String(p.fields?.origin||''),/Mexico/i);
 assert.doesNotMatch(String(p.fields?.process||''),/^Washed$/i);
 assert.ok(!p.fields?.roast_level&&!p.fields?.producer);
});
test('#278 unavailable taxonomy is not license to erase literal processing provenance',()=>{
 const p=parse(278);assert.equal(p.ok,true);
 assert.ok((p.source_facts||[]).some(x=>/process/i.test(String(x.field||x.label||''))&&/wet.?hulled/i.test(String(x.value||''))),JSON.stringify((p.source_facts||[]).slice(0,16)));
});
test('#279 Full City is owner-standardized Medium-Dark, not invented Dark',()=>{
 const p=parse(279);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 assert.equal(p.fields?.roast_level,'Medium-Dark',JSON.stringify(p.fields));
 assert.match(String(p.fields?.origin||''),/Kerinci/i);
 assert.doesNotMatch(String(p.fields?.process||''),/^Washed$/i);
 assert.match(String(p.fields?.variety||''),/Djember/i);
});
test('#279 selected Sumatra intrinsic flavor profile cannot be replaced by any other sidebar coffee',()=>{
 const p=parse(279,'<aside><h2>Mexican Oaxaca</h2><p>Roast: Light</p><p>CUPPING NOTES: Cocoa, Honey, Caramel</p><p>Producer: Other Farm</p></aside>');
 assert.equal(p.ok,true);assert.equal(p.fields?.roast_level,'Medium-Dark');
 assert.match(notes(p),/molasses/i);assert.doesNotMatch(notes(p),/caramel/i);
 assert.ok(!p.fields?.producer);
});
test('All #277–279 treat a grind option as retail packaging, not an espresso recipe',()=>{
 for(const n of [277,278,279]){const p=parse(n);assert.equal(p.ok,true);assert.ok(!p.fields?.espresso_recipe&&!p.fields?.decaffeination_method,JSON.stringify(p.fields));}
});
