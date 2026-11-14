import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const kenya={
 name:'Kenya AA - Ndaroini Estate',
 url:'https://shop.justlovecoffee.com/products/kenya-aa-ndaroini-estate',
 description:[
 'Awaken Your Senses with a Vibrant Coffee Born on the Slopes of Mt. Kenya',
 'Our Kenya AA Ndaroini is a vibrant, small-batch journey in a cup, bursting with notes of juicy peach, golden honey, and zesty grapefruit. Grown on the high slopes of Mt. Kenya, this fully washed lot is the bright, sparkling adventure your morning routine has been craving.',
 'Key Features:',
 'Tasting Notes: Bright Peach, Golden Honey, Zesty Grapefruit',
 'Origin: Ndaroini Factory, Nyeri, Kenya',
 'Elevation: 1,700 meters',
 'Process: Fully Washed & Dried on Raised Beds',
 'Our Kenya AA Ndaroini comes to us from the dedicated farmers of the Ndaroini Factory. Here, at an elevation of 1,700 meters, fully ripe cherries are handpicked and delivered with care.',
 'You will love this coffee if you enjoy light-roast African coffees.'
 ]};
const uganda={
 name:'Uganda AA - Lifesong',
 url:'https://shop.justlovecoffee.com/products/uganda-aa-lifesong',
 description:[
 'Uganda AA (Direct Trade Single-Origin)',
 'Our Uganda AA is a rich, direct-trade single-origin coffee with notes of chocolate, brown sugar, and dried fruit wrapped in a full, syrupy body. Grown on the fertile slopes of Mt. Elgon and roasted in small batches.',
 'At a Glance',
 'Flavor Notes: Chocolate, Brown Sugar, Dried Fruit',
 'Origin: Lifesong Farms | Mt. Elgon, Uganda',
 'Roast: Medium',
 'Elevation: 1,280 meters',
 'Process: Washed',
 'Varietals: Bourbon & Typica',
 'From Mt. Elgon to Your Morning',
 'On the fertile slopes of Uganda\'s Mt. Elgon, coffee farming has supported families for generations. But for years, many growers in the Bududa region received prices that made it difficult to invest in their farms and their future.',
 'Today, through a direct-trade partnership with Manna Origins, farmers receive prices above the local market, helping create greater stability and opportunity within their community.'
 ]};
function selected(c,{blocks=c.description,unrelated='',oldSeo='OLD ETHIOPIA DECAF SWISS WATER 2300 MASL MANGO',pageName=c.name}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name:pageName,url:c.url,brand:{'@type':'Brand',name:'Just Love Coffee Roasters'}};
 const html='<!doctype html><html><head><title>'+oldSeo+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+pageName+'</h1><div class="product-description">'+blocks.map(x=>'<p>'+x+'</p>').join('')+'</div></article></main>'+unrelated+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#317 current exact selected identity, labeled notes and washed process',()=>{
 const p=selected(kenya);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,kenya.name);
 assert.match(String(p.fields?.origin||''),/Nyeri.*Kenya/iu);
 assert.equal(p.fields?.process,'Washed');
 for(const note of ['peach','honey','grapefruit'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(note,'i'));
});
test('#317 current labeled selected altitude is growing elevation, not unrelated product',()=>{
 const p=selected(kenya);
 assert.match(String(p.fields?.elevation_m||''),/1,?700/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#317 do not copy unrelated selected coffee identity, notes or SEO',()=>{
 const p=selected(kenya,{unrelated:'<aside class="related-products"><h2>Uganda AA Lifesong</h2><p>Dark roast mango strawberry Swiss Water 2400 MASL.</p></aside>'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,kenya.name);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/strawberry|mango/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#318 explicit selected medium roast, washed, varietals and tasting notes',()=>{
 const p=selected(uganda);assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.equal(p.fields?.name,uganda.name);
 assert.equal(p.fields?.roast_level,'Medium');
 assert.equal(p.fields?.process,'Washed');
 for(const note of ['chocolate','brown sugar','dried fruit'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(note,'i'));
 assert.match(String(p.fields?.variety||''),/Bourbon/iu);
 assert.match(String(p.fields?.variety||''),/Typica/iu);
});
test('#318 direct labeled Mt Elgon country and elevation do not migrate philanthropic Bududa or partner geography',()=>{
 const p=selected(uganda);assert.equal(p.ok,true);
 assert.match(String(p.fields?.origin||''),/Elgon.*Uganda/iu);
 assert.doesNotMatch(String(p.fields?.origin||''),/Bududa/iu);
 assert.match(String(p.fields?.elevation_m||''),/1,?280/iu);
 assert.doesNotMatch(String(p.fields?.producer||''),/Manna Origins/iu);
});
test('#318 related light-roast collection, other coffee and previous SEO cannot override selected medium roast',()=>{
 const p=selected(uganda,{oldSeo:'Light Roast Uganda AA - Lifesong | Old Kenya Ndaroini SEO',unrelated:'<aside class="related-products"><h2>Light Roast</h2><p>Colombia Honey Process, Gamboa family, Strawberry and Orange</p></aside>'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,uganda.name);
 assert.equal(p.fields?.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/strawberry|orange/iu);
 assert.doesNotMatch(String(p.fields?.producer||''),/Gamboa/iu);
});

test('#317 hypothetical flavor preference does not establish selected actual roast',()=>{
 const p=selected(kenya);assert.equal(p.ok,true);
 assert.ok(!p.fields?.roast_level,'If you enjoy light-roast African coffees is audience preference, not selected Roast: Light');
});
