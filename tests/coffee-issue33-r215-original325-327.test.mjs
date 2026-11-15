import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const selected=[
 {name:'Simpatico Organic Low Acid Half-Caff Coffee',url:'https://simpaticocoffee.com/products/organic-low-acid-half-caff-coffee',description:"Does regular coffee have too much caffeine, but decaffeinated coffee just doesn't excite you? Try Simpatico Organic Low Acid Half-Caff Coffee. It is a full-bodied low acid coffee with a clean, nutty/cocoa flavor. (Prefer 99.5% decaf? Try Simpatico Low Acid Decaf Medium Smooth Roast.)"},
 {name:'Simpatico Organic Low Acid: Medium Smooth Roast',url:'https://simpaticocoffee.com/products/simpatico-low-acid-coffee-medium-smooth-roast',description:"Simpatico Organic Low Acid Medium Smooth Roast Coffee is a bright-bodied low acid coffee with a clean, nutty flavor. (Prefer decaf? Try Simpatico Low Acid Decaf Medium Smooth Roast.)"},
 {name:'Simpatico Low Acid Decaf: Dark Smooth Roast',url:'https://simpaticocoffee.com/products/simpatico-low-acid-decaf-coffee-dark-smooth-roast',description:"Simpatico Low Acid Decaf Coffee is mountain water processed with no chemicals. Our dark roast creates a smoky low acid coffee that features dark fruit flavors and a creamy body. (Also available with caffeine in our Simpatico Organic Low Acid Coffee: Dark Smooth Roast.)"}
];
function parse(c,related=''){
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Simpatico Coffee'}};
 return extractPublicCoffeeFacts('<!doctype html><html><head><title>UNRELATED GUATEMALA SWISS WATER BLUEBERRY 1950m</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+c.description+'</p></div></article></main>'+related+'</body></html>',{source_url:c.url});
}
test('#325 half-caff: own flavor, no unrelated full-decaf method',()=>{
 const p=parse(selected[0]);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[0].name);
 assert.match(String(p.fields.tasting_notes||''),/nutty|cocoa/i);
 assert.ok(!p.fields.decaffeination_method);
});
test('#325 half-caff: do not fill unrelated SEO origin, recipe',()=>{
 const p=parse(selected[0]);assert.doesNotMatch(String(p.fields.origin||''),/Guatemala/i);
 assert.ok(!p.fields.espresso_recipe);
});
test('#326 selected medium/nutty description',()=>{
 const p=parse(selected[1]);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[1].name);
 assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes||''),/nutty/i);
});
test('#326 alternative decaf does not turn this regular coffee into decaf',()=>{
 const p=parse(selected[1],'<aside class="related-products">Another decaf is Swiss Water, blueberry, Guatemala.</aside>');
 assert.ok(!p.fields.decaffeination_method);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry/i);
});
test('#327 direct selected dark roast and dark-fruit sensory',()=>{
 const p=parse(selected[2]);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[2].name);
 assert.equal(p.fields.roast_level,'Dark');
 assert.match(String(p.fields.tasting_notes||''),/dark fruit/i);
});
test('#327 explicit selected mountain water treatment must be decaffeination, not green washed',()=>{
 const p=parse(selected[2]);assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.notEqual(p.fields.process,'Washed');
});
test('#327 unrelated negative/alternative page materials cannot imply another treatment',()=>{
 const p=parse(selected[2],'<aside class="related-products">Try the other sugarcane decaf, honey process, blueberry.</aside>');
 assert.notEqual(p.fields.decaffeination_method,'Sugar Process');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry/i);
});
