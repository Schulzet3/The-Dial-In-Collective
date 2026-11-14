import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://roadmapcoffeeworks.com/products/peru-german-carranza-gesha';
const title='Peru German Carranza Gesha';
const labels='<p>Roast Level: Light</p><p>Flavor: White Peach, Strawberry, Jasmine, Honeysuckle, Almond, Agave</p><p>Farm: El Bebedero</p><p>Region: Amazonas, Northern Peru</p><p>Altitude: 1600 MASL</p><p>Varietals: Gesha</p><p>Production Method: Natural</p>';
const story="<p>Producer German Carranza works among his large extended family on his 15 hectare plot in northern Peru. Carranza's El Bebedero sits in a perfect position at the edge of the vast Amazon rainforest, benefiting from high elevation.</p>";
function parse(details,aside='',name=title){
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Roadmap CoffeeWorks'}};
 const html='<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+details+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#288 named CURRENT grower supersedes the independently labeled Farm fallback',()=>{
 const p=parse(labels+story);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,950));
 assert.equal(p.fields.name,title);
 assert.equal(p.fields.producer,'German Carranza');
 assert.equal(p.fields.process,'Natural');
 assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.tasting_notes||''),/Honeysuckle/);
});
test('#288 without current producer story a name in the title is not proof',()=>{
 const p=parse(labels);assert.equal(p.ok,true);assert.notEqual(p.fields.producer,'German Carranza');
});
test('#288 cross-sell grower story is NOT selected product evidence',()=>{
 const p=parse(labels,'<aside><h2>Another Peru coffee</h2>'+story+'</aside>');
 assert.equal(p.ok,true);assert.notEqual(p.fields.producer,'German Carranza');
});
test('#288 historical unrelated grower does not replace current farm evidence',()=>{
 const p=parse(labels+"<p>Historically producer German Carranza grew another coffee. Carranza's El Bebedero is unrelated to this lot.</p>");
 assert.equal(p.ok,true);assert.notEqual(p.fields.producer,'German Carranza');
});
test('#288 another chosen coffee must not acquire name-specific producer',()=>{
 const p=parse(labels+story,'','Peru Other Gesha');
 assert.equal(p.ok,true);assert.notEqual(p.fields.producer,'German Carranza');
});
