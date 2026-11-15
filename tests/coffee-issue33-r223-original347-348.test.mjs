import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const original={
 347:{url:'https://sparkyscraftcoffeeroasting.com/products/las-lajas-micromill-finca-calle-liles-black-honey',name:'Las Lajas Micromill – Finca Calle Liles - Black Honey'},
 348:{url:'https://sparkyscraftcoffeeroasting.com/products/womens-produced-colombia-decaf',name:'Night Shift Espresso Decaf'}
};
const own347=['Micromill | Las Lajas','Process | Black Honey','Variety | San Isidro','Elevation | 1400–1600 MASL','Region | Sabanilla de Alajuela, Central Valley','Country | Costa Rica'];
const own348=['"When you need a coffee but also need to sleep later"','Thank you to our first responders, medical staff and everyone else keeping the world moving while the rest of us sleep.'];
function parse(id,own,extra=''){
 const {name,url}=original[id],product={'@context':'https://schema.org','@type':'Product',name,url};
 return extractPublicCoffeeFacts('<html><head><title>Former Colombian Decaf Dark Roast</title><script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><section class="product-description">'+own.map(x=>'<p>'+x+'</p>').join('')+'</section></article></main>'+extra+'</body></html>',{source_url:url});
}
test('#347 unique selected H1 not stale SEO or sibling',()=>{const p=parse(347,own347,'<aside class="related-products"><h2>Dark Swiss Water</h2>Notes: Marshmallow, Cocoa</aside>');assert.equal(p.ok,true);assert.equal(p.fields.name,original[347].name);assert.doesNotMatch(String(p.fields.tasting_notes||''),/Marshmallow|Cocoa/i)});
test('#347 directly printed Black Honey correctly normalizes green process',()=>{const p=parse(347,own347);assert.equal(p.fields.process,'Honey');assert.ok(!p.fields.decaffeination_method)});
test('#347 own cultivar/elevation/origin',()=>{const p=parse(347,own347);assert.match(String(p.fields.variety||''),/San Isidro/i);assert.match(String(p.fields.elevation_m||''),/1400/);assert.match(String(p.fields.origin||''),/Costa Rica/i)});
test('#347 farm/processor not speculative named grower, roast or recipe',()=>{const p=parse(347,own347);assert.ok(!p.fields.roast_level);assert.ok(!p.fields.espresso_recipe);assert.doesNotMatch(String(p.fields.producer||''),/Harrar|unrelated farmer/i)});
test('#348 current Night Shift identity despite recycled Colombia slug',()=>{const p=parse(348,own348);assert.equal(p.ok,true);assert.equal(p.fields.name,original[348].name)});
test('#348 Decaf is not an explicit sugar/water processing method',()=>{const p=parse(348,own348);assert.ok(!p.fields.decaffeination_method);assert.ok(!p.fields.roast_level);assert.ok(!p.fields.process||p.fields.process==='Other/Unknown')});
test('#348 other product reviews do not confer selected tasting',()=>{const p=parse(348,own348,'<aside class="related-products"><h2>Women Producers Colombia</h2>Notes: Blueberry, Jasmine</aside>');assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Jasmine/i)});
