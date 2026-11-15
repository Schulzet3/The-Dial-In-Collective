import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Selected primary product only. Original frozen603 oracle and CSV are untouched.
const selected={
 356:['Decaf Colombia','https://stovetoproasters.com/products/decaf-colombia'],
 357:['Ethiopia Worka Chelbessa','https://stovetoproasters.com/products/ethiopia-worka-chelbessa']
};
function parse(n,spec,unrelated=''){
 const [name,url]=selected[n];
 const json={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' | Stovetop Roasters</title>'+
  '<script type="application/ld+json">'+JSON.stringify(json)+'</script></head>'+
  '<body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="product-description">'+spec.map(x=>'<p>'+x+'</p>').join('')+
  '</div></article></main>'+unrelated+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const decaf=[
 'Region: Huila','Process: Washed, Sugar Cane Decaf','Variety: Various',
 'Elevation: 1,200-2,100 masl','Tasting Notes: Sweet, Lemon, Creamy',
 'At Stovetop, we love ethyl acetate decaf coffees. E.A. is derived from fermented cane sugar.'
];
const worka=[
 'Region: Gedeb','Process: Washed','Variety: Ethiopian Heirloom',
 'Elevation: 1,900-2,200 masl','Notes: Pear, Orange, Rose',
 'Brought to us from the privately owned Worka Chelbessa washing station in the region of Gedeb, Yirgacheffe.',
 'The station partners with SNAP, bringing hundreds of smallholder farmers together to process and export their coffee.'
];
test('#356 direct washed green process is distinct from sugarcane EA decaffeination',()=>{
 const p=parse(356,decaf);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[356][0]);assert.equal(p.fields.process,'Washed');
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
});
test('#356 own Huila, variety and tasting survive exact selected product',()=>{
 const p=parse(356,decaf);assert.match(String(p.fields.origin||''),/Huila/i);
 assert.match(String(p.fields.tasting_notes||''),/Sweet/i);
 assert.match(String(p.fields.tasting_notes||''),/Lemon/i);
 assert.match(String(p.fields.tasting_notes||''),/Creamy/i);
 assert.ok(!p.fields.roast_level);
});
test('#356 never borrow unrelated Swiss Water process or other coffee notes',()=>{
 const p=parse(356,decaf,'<aside class="related-products"><h2>Other Decaf</h2>Swiss Water Process. Tasting: strawberry and cocoa</aside>');
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/strawberry/i);
});
test('#356 brewing/grind options do not create a numeric espresso recipe',()=>{
 const p=parse(356,decaf,'<aside>Grind: Espresso, Drip, French Press. Related coffee: 18 g in / 36 g out</aside>');
 assert.ok(!p.fields.espresso_recipe);
});
test('#357 own washed, heirloom, Gedeb and cup notes from current selected source',()=>{
 const p=parse(357,worka);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[357][0]);assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.origin||''),/Gedeb|Yirgacheffe|Ethiopia/i);
 assert.match(String(p.fields.tasting_notes||''),/Pear/i);
 assert.match(String(p.fields.tasting_notes||''),/Rose/i);
});
test('#357 station/processor is not evidence of a named individual grower',()=>{
 const p=parse(357,worka);assert.ok(!p.fields.decaffeination_method);
 assert.ok(!p.fields.roast_level);
 assert.ok(!p.fields.espresso_recipe);
 assert.doesNotMatch(String(p.fields.producer||''),/SNAP(?: owner| founder)|Atlantic Specialty(?: owner| founder)/i);
});
test('#357 neighbor coffee attributes must not become selected decaf/roast/notes',()=>{
 const p=parse(357,worka,'<aside class="related-products"><h2>Other Coffee</h2>Dark Roast, Swiss Water Decaf, hazelnut</aside>');
 assert.equal(p.fields.process,'Washed');
 assert.ok(!p.fields.decaffeination_method);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/hazelnut/i);
});
