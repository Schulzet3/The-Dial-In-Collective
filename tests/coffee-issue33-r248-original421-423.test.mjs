import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

const samples={
  421:['AK Mountain','https://www.alaskaartisancoffee.com/products/ak-mountain'],
  423:['White Coffee','https://www.alaskaartisancoffee.com/products/white-coffee']
};
function parse(n,blocks,aside=''){
  const [name,url]=samples[n];
  const ld=JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url});
  return extractPublicCoffeeFacts('<html><head><title>'+name+' | Alaska Artisan Coffee</title>'+
    '<script type="application/ld+json">'+ld+'</script></head><body>'+
    '<main><article class="product"><h1>'+name+'</h1><div class="product-description">'+
    blocks.join('')+'</div></article></main>'+aside+'</body></html>',{source_url:url});
}
const paragraph=s=>'<p>'+s+'</p>';
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
test('#421 selected named medium blend and own flavor notes are direct source evidence',()=>{
  const p=parse(421,[paragraph('A classic medium roast of ours that deserves attention.'),
    paragraph('Try this perfectly balanced medium blend with notes of cacao nibs and apricot.')]);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'AK Mountain');
  assert.equal(p.fields.roast_level,'Medium');
  assert.ok((has(p.fields.tasting_notes,'cacao')&&has(p.fields.tasting_notes,'apricot'))||
    (p.conflicts||[]).includes('tasting_notes'));
});
test('#421 comparison to other named blends never supplies their fields or espresso recipe',()=>{
  const p=parse(421,[paragraph('A classic medium roast with notes of cacao nibs and apricot.'),
    paragraph('If you know Fog Riser and Outhouse blend, give this mountain roast a try.')],
    '<aside class="related-products">Other Coffee: Dark Roast, Natural, Decaf, 18g/36g in 26s</aside>');
  assert.equal(p.ok,true);
  assert.equal(p.fields.roast_level,'Medium');
  assert.equal(p.fields.decaffeination_method,undefined);
  assert.equal(p.fields.release_label,undefined);
  assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g);
});
test('#423 selected nutty White Coffee does not inherit educational Malaysia geography',()=>{
  const p=parse(423,[paragraph('Our White Coffee has a nutty taste and is offered pre-ground.'),
    '<h3>What is White Coffee?</h3>',
    paragraph('Origin: The term "white coffee" often refers to a specific preparation method from Ipoh, Malaysia.'),
    paragraph('Roasting Process: In contrast to regular coffee, white coffee is lightly roasted.'),
    paragraph('Flavor Profile: This kind of preparation can have fruity or floral notes.')]);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'White Coffee');
  assert.ok(!has(p.fields.origin,'Malaysia')&&!has(p.fields.origin,'Ipoh'));
  assert.ok(!has(p.fields.tasting_notes,'fruity')&&!has(p.fields.tasting_notes,'floral'));
  assert.notEqual(p.fields.process,'Washed');
  assert.notEqual(p.fields.roast_level,'Dark');
});
test('#423 category explanation cannot become selected current crop or numeric espresso dose',()=>{
  const p=parse(423,[paragraph('White Coffee has a nutty taste.'),
    '<h3>What is White Coffee?</h3>',
    paragraph('Origin: Ipoh, Malaysia.'),
    paragraph('Preparation: White coffee is often served with sweetened condensed milk.'),
    '<h3>Espresso Method</h3>',
    paragraph('Fill your basket about half full. A normal double shot may take 25 seconds, but white coffee may be eight seconds.')]);
  assert.equal(p.ok,true);
  assert.ok(!has(p.fields.origin,'Malaysia'));
  assert.equal(p.fields.release_label,undefined);
  assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g);
});
test('a missing exact selected product must not be relabeled as verified',()=>{
  for(const number of [421,423]){
    const failures=requiredFocusedSourceFailures([number],
      [{number,status:'FETCHED',parser_ok:true,selected_heading_identity_verified:false,
      add_coffee_ui_rendered:true,source_review_rendered:true}]);
    assert.ok(failures.some(f=>f.reason==='selected_original_product_heading_identity_unverified'));
  }
});
