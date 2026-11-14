import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://roasterympls.com/products/tanzania-peaberry',name='Tanzania Peaberry';
const prose='<p>From the slopes of Mount Kilimanjaro, rare peaberry beans deliver notes of pepper, white wine, and black currant.</p><p>Tanzania Peaberry delivers a bright, lively acidity with a medium body, offering notes of notes of pepper, white wine, and black currant, with a clean, refreshing finish.</p>';
const labeled='<p>Tasting Notes:</p><p>Acidity: Bright and lively</p><p>Body: Medium and smooth</p><p>Flavor: Citrus, black tea, sweet berries, and hints of chocolate</p><p>Finish: Clean and refreshing</p><p>Origin: Tanzania</p><p>Process: Washed</p>';
function parse(content,aside=''){const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'The Roastery'}};return extractPublicCoffeeFacts('<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+content+'</div></article></main>'+aside+'</body></html>',{source_url:url});}
test('own current #291 conflicting labeled and prose sensory claims are not silently resolved',()=>{
 const p=parse(prose+labeled);assert.equal(p.ok,true,JSON.stringify(p).slice(0,800));
 assert.equal(p.fields?.name,name);assert.ok(!p.fields?.tasting_notes,JSON.stringify(p.fields));
 assert.ok(p.conflicts?.includes('tasting_notes'),'two current conflicting selected flavors must be reviewable');
 assert.equal(p.fields?.process,'Washed');assert.ok(!p.fields?.roast_level,'medium body is not medium roast');
});
test('single exact product Flavor caption is autofillable without contradiction',()=>{
 const p=parse(labeled);assert.equal(p.ok,true);assert.match(String(p.fields?.tasting_notes||''),/citrus/i);assert.match(String(p.fields?.tasting_notes||''),/chocolate/i);assert.ok(!p.conflicts?.includes('tasting_notes'));
});
test('unrelated sibling copy cannot create selected product conflict',()=>{
 const p=parse(labeled,'<aside><h2>Other coffee</h2>'+prose+'</aside>');assert.equal(p.ok,true);assert.match(String(p.fields?.tasting_notes||''),/citrus/i);assert.ok(!p.conflicts?.includes('tasting_notes'));
});
test('compatible own copy must not manufacture conflict',()=>{
 const p=parse('<p>Tanzania Peaberry offers notes of citrus, black tea, sweet berries, and hints of chocolate.</p>'+labeled);assert.equal(p.ok,true);assert.match(String(p.fields?.tasting_notes||''),/citrus/i);assert.ok(!p.conflicts?.includes('tasting_notes'));
});
