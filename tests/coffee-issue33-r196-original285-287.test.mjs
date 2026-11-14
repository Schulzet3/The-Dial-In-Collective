import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const urls={
 285:'https://riseupcoffee.com/products/single-origin-select-sumatra-fair-trade-organic',
 286:'https://roadmapcoffeeworks.com/products/ethiopia-worka-sakaro-anaerobic',
 287:'https://roadmapcoffeeworks.com/products/mexico-cesmach'
};
const names={
 285:'Single Origin Select: Sumatra | Fair Trade | Organic Coffee',
 286:'Ethiopia Worka Sakaro',
 287:'Mexico Angel Albino Corzo'
};
function selected(n,details,aside='',structuredDetails=''){
 const url=urls[n],name=names[n];
 const ld={'@context':'https://schema.org','@type':'Product',name,url,description:structuredDetails,brand:{'@type':'Brand',name:n===285?'Rise Up Coffee Roasters':'Roadmap CoffeeWorks'}};
 const html='<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><header>Shop Coffee</header><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+details+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const sumatra='<p>ROAST LEVEL: Medium+</p><h5>Gayo Mountain, Sumatra, Indonesia</h5><p>Located in the Aceh region of Sumatra, Gayo Mountain is known for growing high quality coffee. This collective coffee represents generations of cultivation by indigenous families. The bean drying process in Sumatra is unique and results in rich, malty, earthy flavors with very low acidity.</p>';
const worka='<p>Roast Level: Light</p><p>Flavor: Macerated Strawberry, Pineapple, Yogurt, Dark Chocolate</p><p>Farm: 400 smallholder farms</p><p>Region: Worka Chelbesa, Gedio, Gedeb</p><p>Altitude: 2000-2200 masl</p><p>Variety: Heirloom</p><p>Production Method: Anaerobic Natural</p><p>This coffee from the Worka Sakaro Washing Station is a great example.</p>';
const mexico='<p>Roast Level: Medium</p><p>Flavor: Dark Chocolate, Cola, Blackberry, Hazelnut</p><p>Farm: FFESICH Cooperative</p><p>Region: Chiapas</p><p>Varietals: Bourbon, Caturra, Sarchimor, Catimor, Costa Rica, Marago</p><p>Production Method: Washed</p><p>Angel Albino Corzo is the region in Chiapas state, not the producer. The coffee itself comes from the FFESICH cooperative.</p>';

test('#285 chosen Sumatra is not a nearby house roast and retains own flavor',()=>{
 const p=selected(285,sumatra,'<aside><h2>Organic House Roast</h2><p>NOTES: Balanced, Chocolatey, Creamy</p><p>ROAST LEVEL: Dark</p><p>Producer: Sibling Farm</p></aside>');
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,950));
 assert.equal(p.fields?.name,names[285]);
 assert.match(String(p.fields?.origin||''),/sumatra|indonesia/i);
 for(const word of ['malty','earthy'])assert.match(String(p.fields?.tasting_notes||'').toLowerCase(),new RegExp(word));
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/chocolatey|creamy/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Sibling Farm/i);
 assert.notEqual(p.fields?.roast_level,'Dark');
});
test('#285 unnamed collective is not an individual producer or proven drying method',()=>{
 const p=selected(285,sumatra);
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer,'anonymous indigenous families must not become a named producer');
 assert.notEqual(p.fields?.process,'Washed');
});
test('#286 exact Farm: 400 smallholder farms is a quantity, NOT named supplier',()=>{
 const p=selected(286,worka);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.equal(p.fields?.name,names[286]);
 assert.ok(!p.fields?.producer,'400 unnamed smallholder farms cannot be a verified producer: '+JSON.stringify(p.fields));
});
test('#286 unrelated cooperative must not leak into selected Worka',()=>{
 const p=selected(286,worka,'<aside><h2>Mexico Angel Albino Corzo</h2><p>Farm: FFESICH Cooperative</p><p>Flavor: Cola, Blackberry</p></aside>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer,'unrelated FFESICH must not be assigned to Worka: '+JSON.stringify(p.fields));
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/\b(?:cola|blackberry)\b/i);
});
test('#287 directly named FFESICH cooperative qualifies; locality does not become producer',()=>{
 const p=selected(287,mexico);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.equal(p.fields?.name,names[287]);
 assert.match(String(p.fields?.producer||''),/FFESICH/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Angel Albino Corzo/i);
 assert.equal(p.fields?.process,'Washed');
});
test('#287 indefinite additional farming families cannot replace named selected cooperative',()=>{
 const p=selected(287,mexico+'<p>The cooperative consists of 2000 farming families.</p>');
 assert.equal(p.ok,true);
 assert.match(String(p.fields?.producer||''),/FFESICH/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/2000 farming families/i);
});

test('#286 current full visible Flavor outranks same-product shorter Product description',()=>{
 const p=selected(286,worka,'','<p>Flavor: Strawberry, Pineapple, Dark chocolate</p>');
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.tasting_notes,'Macerated Strawberry, Pineapple, Yogurt, Dark Chocolate');
 assert.ok(!p.conflicts?.includes('tasting_notes'),'shorter structured selected teaser is not contradictory');
 assert.ok(!p.fields?.producer,'literal count is not producer');
});
test('#287 exact selected full Flavor outranks same-coffee shorter teaser; named coop preserved',()=>{
 const p=selected(287,mexico,'','<p>Flavor: Dark chocolate, Cola, Blackberry</p>');
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.tasting_notes,'Dark Chocolate, Cola, Blackberry, Hazelnut');
 assert.ok(!p.conflicts?.includes('tasting_notes'));
 assert.match(String(p.fields?.producer||''),/FFESICH/i);
});
test('#287 true contradictory same-product Flavor item stays blank and reviewable',()=>{
 const p=selected(287,mexico,'','<p>Flavor: Tart Cherry, Cola, Blackberry</p>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.tasting_notes,'contradictory flavor must not be silently combined');
 assert.ok(p.conflicts?.includes('tasting_notes'),'true conflict explicitly recorded');
});
test('#286 named cooperative is not excluded by count-shaped anonymous farm guard',()=>{
 const named=worka.replace('Farm: 400 smallholder farms','Farm: Worka Sakaro Producers Cooperative');
 const p=selected(286,named);
 assert.equal(p.ok,true);
 assert.match(String(p.fields?.producer||''),/Worka Sakaro Producers Cooperative/i);
});

test('#286 station in narrative is a processing facility, not unnamed grower',()=>{
 const p=selected(286,worka);
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer,'this coffee from Worka Sakaro Washing Station is not a named farmer');
});
test('#287 two contrary directly printed Flavor labels cannot be rescued by a subset teaser',()=>{
 const contradictory=mexico+'<p>Flavor: Coconut, Peach, Bergamot</p>';
 const p=selected(287,contradictory,'','<p>Flavor: Dark Chocolate, Cola, Blackberry</p>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.tasting_notes,'two incompatible labels cannot become a single canonical list');
 assert.ok(p.conflicts?.includes('tasting_notes'),'source must surface unresolved flavor contradiction');
});
