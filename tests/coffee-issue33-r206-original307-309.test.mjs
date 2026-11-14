import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const root='https://shop.compasscoffee.com/products/';
const selected=[
 {name:'Embassy Blend',handle:'embassy-blend',body:'Embassy Blend - Crisp, Savory, & Full-Bodied. Bold, crisp, and savory with earthy, fragrant notes.',terms:/crisp|savory/i},
 {name:'Emblem Espresso',handle:'emblem-espresso-1',body:'Emblem Espresso - Rich, Caramel, & Classic. A rich, caramel, classic espresso.',details:'<p>Flavor Notes: Rich, Caramel, Classic</p>',terms:/caramel/i},
 {name:'Horizon Blend',handle:'horizon-blend',body:'Horizon Blend - Bright, Berry-Like, & Sweet. Bright and sweet with vibrant berry-like notes.',terms:/berry/i}
];
function parse(c,extras={}){
 const url=root+c.handle;
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url,brand:{'@type':'Brand',name:'Compass Coffee'}};
 const html='<html><head><title>'+(extras.seo||'UNRELATED MENU COFFEE')+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+(extras.description||c.body)+'</p>'+(c.details||'')+'</div></article></main>'+(extras.aside||'')+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
for(const [i,c] of selected.entries()){
 test('original #'+(307+i)+' selected '+c.name+' current own description has supported identity and sensory language',()=>{
  const p=parse(c);
  assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
  assert.equal(p.fields?.name,c.name);
  assert.match(String(p.fields?.tasting_notes||''),c.terms);
  assert.ok(!p.fields?.producer && !p.fields?.process && !p.fields?.decaffeination_method);
 });
 test('original #'+(307+i)+' unrelated SEO/sibling method, farmer and numeric recipe cannot leak',()=>{
  const p=parse(c,{seo:'Kenyan Swiss Water Decaf from Another Roaster',aside:'<aside><h2>Other coffee from Kenya</h2><p>Producer: Other Farm. Natural process. Swiss Water decaf, pineapple, kiwi and 18g in/36g out.</p></aside>'});
  assert.equal(p.ok,true,JSON.stringify(p).slice(0,350));
  assert.equal(p.fields?.name,c.name);
  assert.doesNotMatch(String(p.fields?.tasting_notes||''),/pineapple|kiwi/i);
  assert.ok(!p.fields?.producer && !p.fields?.process && !p.fields?.decaffeination_method && !p.fields?.espresso_recipe);
 });
}
test('three exact selected handles remain distinct under recycled identity in unrelated page sections',()=>{
 for(const c of selected){
  const p=parse(c,{aside:'<section class="related-products"><h1>Another Coffee</h1><p>Dark roast, Kenya, other named farm.</p></section>'});
  assert.equal(p.ok,true);
  assert.equal(p.fields?.name,c.name);
  assert.doesNotMatch(String(p.fields?.producer||''),/other named farm/i);
 }
});
