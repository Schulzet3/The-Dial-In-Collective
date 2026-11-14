import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const organico='https://shop.caffedarte.com/products/organico-drip-coffee';
const swiss='https://shop.caffedarte.com/products/swiss-water-decaf-drip';
const organicCopy='With certified organic beans chosen from the finest varietals, the Organico blend is crafted to taste great as drip coffee or espresso. Roasted medium-dark for a bright, natural earthy flavor profile that is smooth and tasty. Formulated for both drip and espresso. Organico is the new name for Organico Drip and Organico Espresso.';
const swissCopy="Decaffeinated using the Swiss Water Process, for a cleaner coffee taste, our SWP Decaf Drip coffee is a gourmet roast, sure to satisfy the most discerning decaf drinker's palate.";
function parse({url=organico,name='Organico',description=organicCopy,specs='',aside='',seo='STALE OTHER COFFEE'}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:"Caffé D'arte Coffee Roasters"}};
 const html='<html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+description+'</p>'+specs+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original #305 selected current Organico is not renamed to the historical two discontinued labels',()=>{
 const p=parse({specs:'<p>Roast Level: Medium-Dark</p>'});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.equal(p.fields?.name,'Organico');
 assert.match(String(p.fields?.roast_level||''),/Medium-Dark/i);
 assert.ok(!p.fields?.origin && !p.fields?.producer && !p.fields?.process && !p.fields?.decaffeination_method);
});
test('original #305 old SEO and sitewide wood-fire smoke cannot become direct selected flavor or processing',()=>{
 const p=parse({specs:'<p>Roast Level: Medium-Dark</p>',seo:'Organico Drip Dark Kenya with Peach',aside:'<section><h2>Wood fire roasted</h2><p>Our wood fire method creates smoky character.</p></section><aside><h2>Other coffee Kenya</h2>Peach, Swiss Water Decaf, Washed. Producer: Other Grower.</aside>'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,'Organico');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/smoke|smoky|peach/i);
 assert.ok(!p.fields?.origin && !p.fields?.producer && !p.fields?.process && !p.fields?.decaffeination_method);
});
test('original #306 exact Swiss Water Decaf Drip supports selected water decaf and medium-dark',()=>{
 const p=parse({url:swiss,name:'Swiss Water Decaf Drip',description:swissCopy,specs:'<p>Medium-Dark Roast</p>'});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.equal(p.fields?.name,'Swiss Water Decaf Drip');
 assert.match(String(p.fields?.decaffeination_method||''),/Water/i);
 assert.match(String(p.fields?.roast_level||''),/Medium-Dark/i);
 assert.ok(!p.fields?.origin && !p.fields?.producer && !p.fields?.process);
});
test('original #306 neighboring origin and alternative decaf process are never attributed to selected product',()=>{
 const p=parse({url:swiss,name:'Swiss Water Decaf Drip',description:swissCopy,specs:'<p>Medium-Dark Roast</p>',aside:'<aside><h2>Other Mountain Water Colombian</h2><p>Origin: Colombia. Producer: Named Farm. Flavor: pineapple, jasmine. Natural process.</p></aside>',seo:'Kenya Decaf by Another Roaster'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,'Swiss Water Decaf Drip');
 assert.doesNotMatch(String(p.fields?.origin||''),/Kenya|Colombia/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Named Farm/i);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/pineapple|jasmine/i);
 assert.notEqual(p.fields?.process,'Natural');
 assert.match(String(p.fields?.decaffeination_method||''),/Water/i);
});
test('original #305/#306 product descriptions cannot inherit unrelated numeric espresso recipes',()=>{
 for(const [url,name,description,specs] of [[organico,'Organico',organicCopy,'<p>Medium-Dark Roast</p>'],[swiss,'Swiss Water Decaf Drip',swissCopy,'<p>Medium-Dark Roast</p>']]){
  const p=parse({url,name,description,specs,aside:'<footer>Other espresso recipe: 18g in, 36g out, 29 seconds. 2022 Kenyan farmer.</footer>'});
  assert.equal(p.ok,true);
  assert.ok(!p.fields?.dose_g && !p.fields?.yield_g && !p.fields?.espresso_recipe);
  assert.doesNotMatch(String(p.fields?.producer||''),/Kenyan farmer/i);
 }
});
