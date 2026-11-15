import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const cases={
 352:['Colombia EA Sugarcane Decaf Coffee Beans','https://staccatoroasters.com/products/colombia-valle-del-cauca-ea-decaf'],
 353:['Ethiopia Sasaba Natural Coffee','https://staccatoroasters.com/products/ethiopia-sasaba-natural-coffee'],
 354:['Honduras Elvin Suazo Coffee Beans','https://staccatoroasters.com/products/honduras-elvin-suazo-natural-coffee']
};
const colombia=['Country: Colombia','Region: Valle del Cauca','Producer: Various Smallholder Farmers','Process: Washed • EA Sugarcane Decaffeination','Varieties: Caturra & Castillo','Roast Level: Medium','Tasting Notes: Strawberry, Chocolate, Vanilla'];
const sasaba=['Country: Ethiopia','Region: Guji','District: Kercha','Station: Sasaba','Founder: Tsegay Hagos Tesfaye','Process: Natural','Variety: Mixed Heirloom','Roast Level: Light','Tasting Notes: Berry, Stone Fruit, Sweet, Bright & Juicy'];
const honduras=['Country: Honduras','Region: La Paz','Producer: Elvin Suazo','Farm: Finca Rancho Escondido','Process: Natural','Variety: IHCAFE 90','Harvest: December–March','Roast Level: Light','Tasting Notes: Bright Citrus, Subtle Blueberry, Sweet Finish'];
function parse(n,own,other=''){
 const [name,url]=cases[n];
 const json={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' | Staccato Roasters</title><script type="application/ld+json">'+JSON.stringify(json)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+own.map(x=>'<p>'+x+'</p>').join('')+'</div></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#352 selected washed green coffee and EA sugarcane decaf are distinct',()=>{
 const p=parse(352,colombia);assert.equal(p.ok,true);assert.equal(p.fields.name,cases[352][0]);
 assert.equal(p.fields.process,'Washed');assert.equal(p.fields.decaffeination_method,'Sugar Process');
});
test('#352 literal official notes, medium roast and smallholders belong to selected',()=>{
 const p=parse(352,colombia);assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes||''),/Strawberry/i);
 assert.match(String(p.fields.tasting_notes||''),/Vanilla/i);
 assert.match(String(p.fields.producer||''),/smallholder/i);
});
test('#352 unrelated Swiss Water sidebar must not replace direct EA method',()=>{
 const p=parse(352,colombia,'<aside class="related-products"><h2>Other Decaf</h2>Swiss Water process. Blueberry and caramel</aside>');
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Caramel/i);
});
test('#353 direct natural light and selected original name',()=>{
 const p=parse(353,sasaba);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[353][0]);assert.equal(p.fields.process,'Natural');
 assert.equal(p.fields.roast_level,'Light');
});
test('#353 processing-station founder cannot silently become individual grower',()=>{
 const p=parse(353,sasaba);
 assert.doesNotMatch(String(p.fields.producer||''),/Tsegay Hagos Tesfaye/i);
});
test('#353 tasting list retained and sibling espresso ratio excluded',()=>{
 const p=parse(353,sasaba,'<aside class="related-products">Neighboring coffee espresso: 18g in 36g out in 28 seconds; Water Process</aside>');
 assert.match(String(p.fields.tasting_notes||''),/Berry/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(!p.fields.espresso_recipe);
});
test('#354 producer, natural processing, light roast and current name',()=>{
 const p=parse(354,honduras);assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[354][0]);
 assert.equal(p.fields.process,'Natural');assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.producer||''),/Elvin Suazo/i);
});
test('#354 recurring harvest months do not fabricate distinct release identity',()=>{
 const p=parse(354,honduras);assert.ok(!p.fields.release_label);
});
test('#354 selected notes remain separate from V60 wet aroma and unrelated decaf',()=>{
 const p=parse(354,honduras,'<p>When brewed on a V60, pineapple in the wet aroma.</p><aside class="related-products"><h2>Other Coffee</h2>Swiss Water Decaf</aside>');
 assert.match(String(p.fields.tasting_notes||''),/Citrus/i);
 assert.match(String(p.fields.tasting_notes||''),/Blueberry/i);
 assert.ok(!p.fields.decaffeination_method);
});
