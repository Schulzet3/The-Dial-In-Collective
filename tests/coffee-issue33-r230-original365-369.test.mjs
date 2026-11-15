import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

const selected={
  365:['The Founder - Single Origin Ethiopian','https://sumatocoffee.com/products/the-founder-single-origin-ethiopian'],
  366:['The Sender - Single Origin Costa Rican','https://sumatocoffee.com/products/the-sender-single-origin-costa-rican'],
  368:['En Fuego','https://summermooncoffee.com/products/en-fuego'],
  369:['Fireside','https://summermooncoffee.com/products/fireside']
};
function parse(n,prose,sibling=''){
  const [name,url]=selected[n];
  const schema={'@context':'https://schema.org','@type':'Product',name,url};
  const html='<html><head><title>'+name+'</title><script type="application/ld+json">'+
    JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+
    name+'</h1><div class="product-description">'+prose.map(p=>'<p>'+p+'</p>').join('')+
    '</div></article></main>'+sibling+'</body></html>';
  return extractPublicCoffeeFacts(html,{source_url:url});
}
const founder=[
 'Roast Level: Light','Origin: Yirgacheffe, Ethiopia','Process: Natural',
 'Elevation: 1,900-2,100 meters','Flavor Profile: Bright florals, blackberry, complex sweetness',
 'Varietals: Heirloom Ethiopian','Producer: Small-holder farms',
 'Pour Over: coffee to water ratio 1:16'
];
const sender=[
 'Roast Level: Light-Medium','Origin: Palmichal and Santa Ana Mountains, Costa Rica',
 'Process: Washed','Elevation: 1200-1600 meters',
 'Flavor Profile: Lively spice notes, balanced sweetness',
 'Producer: Small-holder farms',
 'Drip Coffee: 1:16. French Press: 1:12.'
];
const fuego=[
 'Origin: Mexico','Roast Level: Medium','Tasting notes: Candied Roasted Pecans',
 'These beans are organically grown and roasted over an oak fire in a handcrafted brick oven.'
];
const fireside=[
 'Origin: Gaitania, Tolima, Colombia','Roast Level: Medium',
 'Elevation: 1,600–1,900 meters above sea level',
 'Varieties: Caturra, Castillo, Colombia','Process: Washed',
 'Tasting Notes: Roasted Cinnamon and Semi-sweet chocolate',
 'The green beans are fully washed and sun-dried before the roast.'
];
test('#365 exact Ethiopian current product retains its Natural process',()=>{
 const p=parse(365,founder);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[365][0]);
 assert.equal(p.fields.process,'Natural');assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.origin||''),/Ethiopia/i);
});
test('#365 selected own sensory, no imagined espresso recipe',()=>{
 const p=parse(365,founder);
 assert.match(String(p.fields.tasting_notes||''),/blackberry/i);
 assert.equal(p.fields.espresso_recipe,undefined);
});
test('#366 selected Costa Rican is Washed, not the sibling Natural Ethiopia',()=>{
 const p=parse(366,sender);assert.equal(p.ok,true);
 assert.equal(p.fields.name,selected[366][0]);
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.origin||''),/Costa Rica/i);
 assert.notEqual(p.fields.roast_level,'Dark');
});
test('#366 French Press and drip ratios are not espresso',()=>{
 const p=parse(366,sender);
 assert.equal(p.fields.espresso_recipe,undefined);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blackberry/i);
});
test('#368 oak-fire roasting is not a green coffee Natural process',()=>{
 const p=parse(368,fuego);assert.equal(p.ok,true);
 assert.equal(p.fields.name,'En Fuego');assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes||''),/Candied Roasted Pecans/i);
 assert.notEqual(p.fields.process,'Natural');
});
test('#369 fully Washed coffee is not recategorized from sun-drying',()=>{
 const p=parse(369,fireside);assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Fireside');assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.origin||''),/Colombia/i);
 assert.match(String(p.fields.tasting_notes||''),/Cinnamon/i);
});
test('#368 selected flavor excludes unrelated #369 chocolate',()=>{
 const p=parse(368,fuego,'<aside class="related-products"><h2>Fireside</h2><p>Roasted Cinnamon and Semi-sweet chocolate, Washed Colombia</p></aside>');
 assert.equal(p.fields.name,'En Fuego');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/chocolate/i);
 assert.notEqual(p.fields.process,'Washed');
});
test('#369 selected flavor excludes #368 related pecans and #365 blackberry',()=>{
 const p=parse(369,fireside,'<aside class="related-products"><h2>En Fuego / The Founder</h2>Roasted pecans, blackberry, Natural Ethiopia</aside>');
 assert.equal(p.fields.name,'Fireside');assert.equal(p.fields.process,'Washed');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/pecans|blackberry/i);
});
test('#367 unavailable old Autumn Blend cannot be counted as official-source PASS',()=>{
 const failures=requiredFocusedSourceFailures([367],[{number:367,status:'UNAVAILABLE',reason:'HTTP 404'}]);
 assert.ok(failures.some(f=>f.reason==='required_official_source_not_fetched'));
});
