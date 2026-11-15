import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const coffee={
 349:['Aether Dark Roast','https://spirituscoffee.com/products/aether-dark-roast-blend'],
 350:['Guatemala Manos de Mujer','https://spirituscoffee.com/products/guatemala-manos-de-mujer'],
 351:['Colombia Valle del Cauca Sugarcane Decaf','https://spirituscoffee.com/products/mountain-water-process-decaf']
};
const aether=['Roast Level: Dark','Origin: Mexico, Guatemala, and Honduras','Tasting Notes: Dark chocolate, roasted almond, molasses'];
const mujer=['Roast Level: Medium','Region: Huehuetenango, Guatemala',"Producer: Guaya'b Asociación Civil, Manos de Mujer women's producers program",'Process: Fully washed','Tasting Notes: Dark chocolate, hazelnut, vanilla, dried cherry'];
const sugar=['Roast Level: Medium','Region: Valle del Cauca, Colombia','Process: Fully washed','Decaffeinated using Sugar Cane ethyl acetate','Tasting Notes: Milk chocolate, toasted almond, brown sugar, gentle citrus'];
function parse(id,lines,extra=''){
 const [name,url]=coffee[id],json={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>Older Mountain Water Product | Shop</title><script type="application/ld+json">'+JSON.stringify(json)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+lines.map(x=>'<p>'+x+'</p>').join('')+'</div></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#349 own dark product identity and literal notes',()=>{
 const p=parse(349,aether);
 assert.equal(p.ok,true);assert.equal(p.fields.name,coffee[349][0]);
 assert.equal(p.fields.roast_level,'Dark');assert.match(String(p.fields.tasting_notes||''),/molasses/i);
});
test('#349 other-product decaf and flavors cannot contaminate selected',()=>{
 const p=parse(349,aether,'<aside class="related-products"><h2>Decaf Water Process</h2>Notes: Blueberry, Honey</aside>');
 assert.ok(!p.fields.decaffeination_method);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Honey/i);
});
test('#350 direct washed and medium are distinct from taste disagreement',()=>{
 const p=parse(350,mujer);
 assert.equal(p.ok,true);assert.equal(p.fields.name,coffee[350][0]);
 assert.equal(p.fields.process,'Washed');assert.equal(p.fields.roast_level,'Medium');
});
test('#350 named cooperative belongs to current product, not sibling',()=>{
 const p=parse(350,mujer);
 assert.match(String(p.fields.producer||''),/Guaya.b|Manos de Mujer/i);
});
test('#350 other-product Jasmine cannot create selected tasting',()=>{
 const p=parse(350,mujer,'<aside class="related-products"><h2>Peru Decaf</h2><p>Notes: Jasmine, Marshmallow</p></aside>');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Jasmine|Marshmallow/i);
});
test('#351 recycled Mountain Water slug does not replace chosen coffee name',()=>{
 const p=parse(351,sugar);
 assert.equal(p.ok,true);assert.equal(p.fields.name,coffee[351][0]);
});
test('#351 chosen sugarcane decaf is not Mountain Water or green Natural',()=>{
 const p=parse(351,sugar);
 assert.equal(p.fields.process,'Washed');
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
test('#351 other product cannot donate alternate country or water process',()=>{
 const p=parse(351,sugar,'<aside class="related-products"><h2>Mountain Water Decaf</h2><p>Brazil, Dark, Swiss Water</p></aside>');
 assert.equal(p.fields.name,coffee[351][0]);
 assert.doesNotMatch(String(p.fields.origin||''),/Brazil/i);
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
