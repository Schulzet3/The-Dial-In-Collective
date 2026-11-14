import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const cases={
  275:{url:'https://readysetcoffee.com/products/guatemala-antigua-los-volcanes-copy',name:'Guatemala Antigua Los Volcanes',
    desc:'<h6>Elevation: 5,000 Feet</h6><h6>Process: Fully Washed | Patio Drying</h6><h6>Varietals: Bourbon | Typica</h6><h6>Cupping Notes: Black Currant | Toffee | Toasted Almond</h6><h6>Roasters Level: Medium</h6><h4>What’s it All Mean?</h4><p>We applied a medium roast to highlight the savory fruit notes inherent in the beans while giving it just enough heat to give hints of toasted almonds. It hails from the rich volcanic soils of Antigua, and exemplifies the complex sweetness found in all great coffees from Guatemala.</p><h4>Behind The Bean</h4><p>Antigua is Guatemala’s oldest and best-known coffee-growing region and this coffee is sourced by the Los Volcanes brand that represents the region. This lot is grown by some of the top farms and small producers in the Ciudad Vieja region.</p>'},
  276:{url:'https://readysetcoffee.com/products/honduras-manos-de-mujer-organic-fair-trade',name:'Honduras Manos de Mujer, Organic, Fair Trade',
    desc:'<h2>Manos de Mujer, Organic, Fair Trade, Honey Processed.</h2><h6>Elevation: 4,000 Feet</h6><h6>Process: Honey</h6><h6>Varietals: Bourbon | Catuai | Caturra | Typica</h6><h6>Cupping Notes: Hazelnut | Orange Blossom | Agave</h6><h6>Roaster\'s Level: Medium</h6><h4>Behind The Bean</h4><p>“Manos de Mujer” is a group of female coffee producers within the COMSA organization located in Marcala, Honduras. This initiative was started for the purpose of improving the living standards of the female members of COMSA that own and operate their own farms. COMSA aims to promote gender equality at the farms and throughout the community.</p><p>COMSA was created in Honduras in 2000 by 62 farmers who wanted to reform the way coffee was grown.</p><p>A note on honey processed coffees: Honey processed is a method where the cherries are de-pulped but are allowed to dry without washing them.</p>'}
};
function parse(number,other='',descOverride=null){
 const c=cases[number],product={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Ready Set!'}};
 const html='<!doctype html><html><head><meta property="og:type" content="product"><meta property="og:title" content="'+c.name+'"><meta property="og:site_name" content="Ready Set!"><script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body><header><h3>This Week’s offers</h3><a href="/products/guatemala-antigua-los-volcanes-copy">Volcanes! fresh off the pallet.</a></header><main><article class="product"><h1>'+c.name+'</h1><div class="product-description">'+(descOverride??c.desc)+'</div></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
const notes=(p)=>String(p.fields?.tasting_notes||'').toLowerCase();
test('#275 exact chosen tasting trio and labeled roast/process',()=>{
 const p=parse(275);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.match(String(p.fields?.name||''),/Guatemala Antigua Los Volcanes/i);
 for(const x of ['black currant','toffee','toasted almond'])assert.ok(notes(p).includes(x),JSON.stringify(p).slice(0,2200));
 assert.equal(p.fields?.roast_level,'Medium');assert.match(String(p.fields?.process||''),/Washed/i);
 assert.match(String(p.fields?.origin||''),/Guatemala/i);
});
test('#275 anonymous Ciudad Vieja farms are not a named canonical producer',()=>{
 const p=parse(275);assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer,'Unidentified top farms and small producers must remain reviewable, not verified producer: '+JSON.stringify(p.fields));
});
test('#275 other selected product sidebar cannot donate notes, roasts or growers',()=>{
 const p=parse(275,'<aside><h2>Mexico Chiapas</h2><p>Cupping Notes: Brown Sugar, Green Apple, Milk Chocolate</p><p>Producer: Other Farm</p><p>Roast Level: Dark</p></aside>');
 assert.equal(p.ok,true);assert.doesNotMatch(notes(p),/brown sugar|green apple|milk chocolate/);
 assert.equal(p.fields?.roast_level,'Medium');assert.ok(!p.fields?.producer);
});
test('#275 explicitly labeled indefinite producer cannot create a named supplier',()=>{
 const p=parse(275,'',cases[275].desc+'<h6>Producer: some of the top farms and small producers</h6>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer,JSON.stringify(p).slice(0,1600));
});
test('#276 selected collective has its own exact notes and honey process',()=>{
 const p=parse(276);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.match(String(p.fields?.name||''),/Manos de Mujer/);
 for(const x of ['hazelnut','orange blossom','agave'])assert.ok(notes(p).includes(x),JSON.stringify(p).slice(0,2200));
 assert.match(String(p.fields?.process||''),/Honey/i);assert.equal(p.fields?.roast_level,'Medium');
 assert.match(String(p.fields?.origin||''),/Honduras/i);
});
test('#276 named Manos de Mujer collective is not replaced by founding COMSA history',()=>{
 const p=parse(276);assert.equal(p.ok,true);
 assert.match(String(p.fields?.producer||''),/Manos de Mujer/i,JSON.stringify(p).slice(0,2300));
 assert.doesNotMatch(String(p.fields?.producer||''),/62 farmers|2000/i);
});
test('#276 espresso grind and decaf are unreported, never invented',()=>{
 const p=parse(276,'<select><option>Ground | Espresso</option></select>');
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe);
});
test('#276 other Ready Set product cannot change female producer collective',()=>{
 const p=parse(276,'<aside><h2>Mexico Chiapas</h2><p>Producer: Small family farms</p><p>Cupping Notes: Green Apple, Milk Chocolate</p></aside>');
 assert.equal(p.ok,true);assert.match(String(p.fields?.producer||''),/Manos de Mujer/i);
 assert.doesNotMatch(notes(p),/green apple|milk chocolate/);
});
