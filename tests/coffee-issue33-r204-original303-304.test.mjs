import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const guatemala='https://shop.broadporchcoffee.com/products/guatemala';
const meaning='https://shop.caffedarte.com/products/meaning-of-life-drip-coffee';
function parse({url=guatemala,name='Guatemala - Huehuetenango',description='A silky and balanced medium roast from Huehuetenango, Guatemala. Sweet toffee and roasted almond notes come together in a smooth, easy-drinking cup with plenty of body. Tasting Notes: Almond, Toffee, Silky. Roast Level: Medium Roast. Origin: Huehuetenango, Guatemala. Process: Washed.',aside='',seo='OLD OTHER PRODUCT'}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:url===guatemala?'Broad Porch Coffee':"Caffé D'arte Coffee Roasters"}};
 const html='<html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+description+'</p>'+(url===guatemala?'<p>Tasting Notes: Almond · Toffee · Silky</p><p>Roast Level: Medium Roast</p><p>Origin: Huehuetenango, Guatemala</p><p>Process: Washed</p>':'')+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original #303 direct selected Guatemala name origin washed medium and almond/toffee',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,'Guatemala - Huehuetenango');
 assert.match(String(p.fields?.origin||''),/Guatemala/i);
 assert.match(String(p.fields?.process||''),/Washed/i);
 assert.match(String(p.fields?.roast_level||''),/Medium/i);
 for(const note of ['almond','toffee'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(note,'i'));
 assert.ok(!p.fields?.producer && !p.fields?.elevation_m);
});
test('original #303 unrelated coffee navigation and old SEO cannot contaminate selected source',()=>{
 const p=parse({aside:'<aside><h2>Other Ethiopia Gesha</h2><p>Notes: jasmine, lychee. Roast: Dark. Process: Natural. Producer: Named Other Farmer.</p></aside>',seo:'Dark Ethiopia Gesha and jasmine'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,'Guatemala - Huehuetenango');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/jasmine|lychee/i);
 assert.notEqual(p.fields?.process,'Natural');
 assert.notEqual(p.fields?.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields?.producer||''),/Named Other Farmer/i);
});
test('original #304 direct selected Meaning of Life product identity stays itself without invented farm',()=>{
 const p=parse({url:meaning,name:'Meaning of Life® Drip Coffee',description:'Well-balanced, full-bodied, and supremely smooth, our Meaning of Life® coffee is the perfect coffee to sip and contemplate the meaning of life. Also known as Nectar of the Gods, this award-winning drip blend is a classic offering from Caffé D’arte.'});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.equal(p.fields?.name,'Meaning of Life® Drip Coffee');
 assert.ok(!p.fields?.producer && !p.fields?.elevation_m && !p.fields?.origin,'selected product does not identify farm/region');
 assert.ok(!p.fields?.decaffeination_method,'no decaffeination supported');
});
test('original #304 shared wood-fire education is not this coffee green processing, origin or flavor',()=>{
 const p=parse({url:meaning,name:'Meaning of Life® Drip Coffee',description:'Well-balanced, full-bodied, and supremely smooth, our Meaning of Life® coffee is the perfect coffee to sip.',aside:'<section><h2>Wood fire roasted</h2><p>Our wood fire method brings out deep flavors. Smoke and caramel in every sip.</p></section><aside><h2>Campania Dark Drip</h2><p>Dark roast from Kenya. Swiss Water Decaf. Producer: Other Farmer. Tasting Notes: Peach.</p></aside>'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,'Meaning of Life® Drip Coffee');
 assert.ok(!p.fields?.process && !p.fields?.origin && !p.fields?.decaffeination_method);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/smoke|caramel|peach/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Other Farmer/i);
});
test('original #304 unqualified blended description must not invent espresso recipe',()=>{
 const p=parse({url:meaning,name:'Meaning of Life® Drip Coffee',description:'Well-balanced, full-bodied, and supremely smooth, this award-winning drip blend ships in a 12oz foil bag.',aside:'<footer>Espresso tips for another product: 18g in, 36g out, 28 seconds.</footer>'});
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.espresso_recipe && !p.fields?.dose_g && !p.fields?.yield_g);
});
