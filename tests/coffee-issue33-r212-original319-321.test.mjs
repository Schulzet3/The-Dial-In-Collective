import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Exact chosen public merchant descriptions observed in O.Henrys product pages.
// These synthetic controls are not proof of the complete live HTML or frozen603.
const products=[
 {n:319,name:'Brazil Oberon',url:'https://shop.ohenryscoffee.com/products/brazil-oberon',
  description:"Grown in the famed Cerrado region, Brazil Oberon is a classic, dependable cup of coffee. With a creamy body, sweet chocolate and citrus notes, and mild acidity, it’s an incredibly versatile, crowd-pleasing cup that tastes great in a variety of brewing methods. Sold as a 1-pound bag."},
 {n:320,name:'Costa Rica Sonora Honey',url:'https://shop.ohenryscoffee.com/products/costa-rica-sonora-honey',
  description:"Grown on biodiverse, renewably powered micro-lots at Hacienda Sonora in Costa Rica's Central Valley, this blend of honey and natural process coffees features a velvety body, winey acidity, and notes of cherry, chocolate, hazelnut, and baking spice. Sweet, bright, and refreshing, it shines in a pour-over or espresso."},
 {n:321,name:'Ethiopia Yirgacheffe',url:'https://shop.ohenryscoffee.com/products/ethiopia-yirgacheffe',
  description:"A classic single-origin cup from the birthplace of coffee, our meticulously sourced Ethiopia Yirgacheffe Mamo Kacha is roasted light to highlight its explosive aroma, sweet floral and citrus notes, and distinctively herbal, tea-like body. Sold as a 1-pound bag."}
];
function chosen(c,related='',seo='DEPRECATED COLOMBIA DECAF 2300 MASL SWISS WATER MANGO'){
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'O.Henrys Coffee'}};
 const html='<!doctype html><html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+c.description+'</p></div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#319 chosen source names Cerrado as Brazilian growing region, not just country',()=>{
 const p=chosen(products[0]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.equal(p.fields?.name,'Brazil Oberon');
 assert.match(String(p.fields?.origin||''),/Cerrado.*Brazil|Brazil.*Cerrado/iu);
});
test('#319 current flavor prose is selected and no unpublished roast is inferred',()=>{
 const p=chosen(products[0]);assert.equal(p.ok,true);
 assert.match(String(p.fields?.tasting_notes||''),/chocolate/iu);
 assert.match(String(p.fields?.tasting_notes||''),/citrus/iu);
 assert.ok(!p.fields?.roast_level);
});
test('#319 unrelated named dark/decaf menu cannot contaminate selected fields',()=>{
 const p=chosen(products[0],'<aside class="related-products"><h2>Dark Colombia Swiss Water</h2><p>Mango, guava, Swiss Water, 2,300 masl.</p></aside>');
 assert.equal(p.fields?.name,'Brazil Oberon');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/mango|guava/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#320 seller explicitly calls blend honey AND natural, not singular process',()=>{
 const p=chosen(products[1]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.equal(p.fields?.name,'Costa Rica Sonora Honey');
 assert.match(String(p.fields?.origin||''),/Central Valley.*Costa Rica|Costa Rica.*Central Valley/iu);
 assert.ok(!['Honey','Natural'].includes(String(p.fields?.process||'')), 'mixed-process blend may not become single-process lot');
});
test('#320 selected flavor notes remain seller-specific',()=>{
 const p=chosen(products[1]);assert.equal(p.ok,true);
 for(const note of ['cherry','chocolate','hazelnut','baking spice'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(note,'iu'));
 assert.ok(!p.fields?.roast_level,'old oracle light/medium is not a current selected roast statement');
});
test('#321 current named Yirgacheffe product has own light roast, floral citrus',()=>{
 const p=chosen(products[2]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.equal(p.fields?.name,'Ethiopia Yirgacheffe');
 assert.equal(p.fields?.roast_level,'Light');
 assert.match(String(p.fields?.tasting_notes||''),/floral/iu);
 assert.match(String(p.fields?.tasting_notes||''),/citrus/iu);
});
test('#321 Mamo Kacha phrase is not an explicitly named producer or decaf method',()=>{
 const p=chosen(products[2]);assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.producer||''),/Mamo Kacha/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
