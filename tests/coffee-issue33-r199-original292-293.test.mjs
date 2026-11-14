import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const guji='https://seedscoffee.com/products/ethiopia-getachew-zekele';
const hab='https://seedscoffee.com/products/ethiopia-guji-getachew-copy';
function parse({url,name,paragraph,other=''}) {
 const schema={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Seeds Coffee Co'}};
 const html='<!doctype html><html><head><title>'+name+' - Seeds Coffee Co</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+paragraph+'</div></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const getachew='Tastes Like: Citrus, Black Tea, Honeysuckle. Tero Farm is the flagship farm of Dimtu Coffee PLC, the vertically integrated growing and export operation helmed by Getachew Zekele.';
const habtamu='Tastes Like: Cherry, Papaya, Lime Candy. Habtamu Fekadu Aga (Kuri Mountain Coffee) was founded in 2015 by Aaga Dinsa; inherited Kuri kebele farm and 144 registered outgrowers.';

test('original292 selected direct Guji Getachew remains its own coffee and flavor',()=>{
 const p=parse({url:guji,name:'Ethiopia Guji Getachew',paragraph:'<p>Tastes Like: Citrus, Black Tea, Honeysuckle</p><p>Tero Farm is the flagship farm of Dimtu Coffee PLC, helmed by Getachew Zekele.</p>'});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 assert.equal(p.fields?.name,'Ethiopia Guji Getachew');
 assert.match(String(p.fields?.tasting_notes||''),/citrus/i);
 assert.match(String(p.fields?.tasting_notes||''),/honeysuckle/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Habtamu|Aaga Dinsa/i);
 assert.ok(!p.fields?.process,'no green processing is disclosed');
 assert.ok(!p.fields?.roast_level,'no roast level disclosed');
});
test('original293 recycled historical Getachew URL slug must not replace selected Habtamu H1 or direct notes',()=>{
 const p=parse({url:hab,name:'Ethiopia Yirgacheffe Habtamu',paragraph:'<p>Tastes Like: Cherry, Papaya, Lime Candy</p><p>Habtamu Fekadu Aga (Kuri Mountain Coffee) was founded in 2015 by Aaga Dinsa.</p>'});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 assert.equal(p.fields?.name,'Ethiopia Yirgacheffe Habtamu');
 assert.match(String(p.fields?.tasting_notes||''),/cherry/i);
 assert.match(String(p.fields?.tasting_notes||''),/lime candy/i);
 assert.doesNotMatch(JSON.stringify(p.fields||{}),/Getachew Zekele|Tero Farm/i);
 assert.ok(!p.fields?.process,'no explicit green process');
 assert.ok(!p.fields?.roast_level,'no published roast');
});
test('sibling product evidence never fills current selected Habtamu origin or sensory',()=>{
 const aside='<aside><h2>Ethiopia Guji Getachew</h2><p>'+getachew+'</p><p>Origin: Guji Ethiopia; Process: Natural.</p></aside>';
 const p=parse({url:hab,name:'Ethiopia Yirgacheffe Habtamu',paragraph:'<p>Tastes Like: Cherry, Papaya, Lime Candy</p>',other:aside});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,'Ethiopia Yirgacheffe Habtamu');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/Honeysuckle|Black Tea/i);
 assert.ok(!p.fields?.process,'sibling process cannot migrate');
});
test('historical / SEO Getachew text cannot overwrite selected Habtamu product identity',()=>{
 const meta='<aside><h2>Older Getachew lot</h2><p>'+getachew+'</p></aside>';
 const p=parse({url:hab,name:'Ethiopia Yirgacheffe Habtamu',paragraph:'<p>Tastes Like: Cherry, Papaya, Lime Candy</p><p>'+habtamu+'</p>',other:meta});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,'Ethiopia Yirgacheffe Habtamu');
 assert.doesNotMatch(String(p.fields?.producer||''),/Getachew Zekele|Tero Farm/i);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/Honeysuckle|Black Tea/i);
});
