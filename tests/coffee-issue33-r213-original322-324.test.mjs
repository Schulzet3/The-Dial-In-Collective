import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Seller-authored selected paragraphs, not historic oracle or page-wide SEO.
const products=[
 {n:322,name:'Raiz Campo Sur Whole Bean Coffee Pack',url:'https://shop.westrockcoffee.com/products/raiz-campo-sur-whole-bean-coffee',
  description:"Campo sur is inspired by the Brazilian countryside where the majority of the world's coffee is grown. What's better than spending your morning overlooking the countryside with a warm cup of rich coffee in your hands watching the sun rise over the hills."},
 {n:323,name:'Raiz Palmera Whole Bean Coffee Pack',url:'https://shop.westrockcoffee.com/products/raiz-palmera-whole-bean-coffee',
  description:"Palmera reminds us of those warm, sunny days with a cool breeze. This 100% Central/South American Arabica is blended for a medium roast and body, with a nice sweet caramel flavor, and a nutty lingering finish that is perfect for your iced or hot drinks. Looking for our High Mt. Arabica? Try the new Raiz Palmera for a sustainable upgrade with the same flavor you love!"},
 {n:324,name:'Rwanda Select Reserve',url:'https://shop.westrockcoffee.com/products/rwanda-select-reserve',
  description:"Westrock Coffee began in the capital of Rwanda, so the Rwanda Select Reserve has a special place in our hearts. Through this coffee, you'll explore flavors unique to Rwandan soil."}
];
function chosen(c,related='',seo='UNRELATED DECAF SWISS WATER GUATEMALA 2100 MASL BLUEBERRY') {
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Westrock Coffee'}};
 const html='<!doctype html><html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+c.description+'</p></div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#322 selected Brazilian landscape is marketing inspiration, not proven Brazilian bean origin',()=>{
 const p=chosen(products[0]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,products[0].name);
 assert.ok(!/Brazil/iu.test(String(p.fields?.origin||'')),'inspired by a landscape is not current bean origin');
});
test('#322 missing direct notes are not borrowed from unrelated SEO',()=>{
 const p=chosen(products[0]);assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry|guatemala/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#323 own seller medium roast and selected caramel must be recovered',()=>{
 const p=chosen(products[1]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,products[1].name);
 assert.equal(p.fields?.roast_level,'Medium');
 assert.match(String(p.fields?.tasting_notes||''),/caramel/iu);
});
test('#323 current direct nutty lingering finish is a literal selected flavor, not generic mouthfeel',()=>{
 const p=chosen(products[1]);assert.equal(p.ok,true);
 assert.match(String(p.fields?.tasting_notes||''),/nutty/iu);
});
test('#323 countrywide 100% Central and South American blend is not a Brazilian-only identity',()=>{
 const p=chosen(products[1]);assert.equal(p.fields?.name,products[1].name);
 assert.ok(!/Brazil\s*$/iu.test(String(p.fields?.origin||''))||/Central|South/iu.test(String(p.fields?.origin||'')));
});
test('#323 sibling/reviews do not donate honey, decaf, altitude or unsupported notes',()=>{
 const extra='<aside class="related-products"><h2>Other dark decaf</h2><p>Swiss Water, mango, 2,100 masl, honey processed.</p></aside>';
 const p=chosen(products[1],extra);
 assert.equal(p.fields?.name,products[1].name);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/mango/iu);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#324 historic company origin is not a named grower, process, decaf or inferred tasting-note list',()=>{
 const p=chosen(products[2]);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,products[2].name);
 assert.ok(!p.fields?.producer);
 assert.ok(!p.fields?.decaffeination_method);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/caramel|blueberry|mango|swiss water/iu);
});
