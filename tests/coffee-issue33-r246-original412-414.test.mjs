import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const cases = {
  412:['Brown Bear','https://woodscoffee.com/products/brown-bear'],
  413:['Decaf','https://woodscoffee.com/products/decaf'],
  414:['Woods Blend','https://woodscoffee.com/products/woods-blend']
};
function parse(n, paragraphs=[], aside='') {
  const [name,url]=cases[n];
  const ld=JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url});
  const html='<html><head><title>'+name+' | Woods Coffee</title><script type="application/ld+json">'+ld+
    '</script></head><body><main><article class="product"><h1>'+name+
    '</h1><div class="product-description">'+paragraphs.map(x=>'<p>'+x+'</p>').join('')+
    '</div></article></main>'+aside+'</body></html>';
  return extractPublicCoffeeFacts(html,{source_url:url});
}
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
test('#412 selected Brown Bear Dark roast with its own direct notes',()=>{
  const p=parse(412,['A rich full-bodied dark roast with hints of chocolate, vanilla and spice.',
    'Dark Roast','Notes: Rich | Earth | Spice']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'Brown Bear');
  assert.equal(p.fields.roast_level,'Dark');
  assert.ok(has(p.fields.tasting_notes,'Spice')||(p.conflicts||[]).includes('tasting_notes'));
  assert.equal(p.fields.decaffeination_method,undefined);
});
test('#413 explicit selected Swiss Water decaf is water method, not Washed processing',()=>{
  const p=parse(413,['A medium roast that delivers sweet, floral and spice.',
    'Using the Swiss Water Process our decaf is 99.9% caffeine free.',
    'Medium Roast','Notes: Sweet | Floral | Spice','Swiss Water Process']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'Decaf');
  assert.equal(p.fields.roast_level,'Medium');
  assert.equal(p.fields.decaffeination_method,'Water Process');
  assert.notEqual(p.fields.process,'Washed');
  assert.ok(has(p.fields.tasting_notes,'Spice')||(p.conflicts||[]).includes('tasting_notes'));
});
test('#414 direct Woods Blend medium own tasting survives, numeric recipe absent',()=>{
  const p=parse(414,['Our Woods Blend is a medium roast with delicate sweetness and hints of cinnamon.',
    'It features semi-sweet cocoa characteristics with a dry finish.',
    'Medium Roast','Notes: Almonds | Mild Fruit | Cocoa Powder']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'Woods Blend');
  assert.equal(p.fields.roast_level,'Medium');
  assert.ok(has(p.fields.tasting_notes,'Cocoa')||(p.conflicts||[]).includes('tasting_notes'));
  assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('unrelated product decaf and espresso recipe cannot contaminate selected Brown Bear',()=>{
  const p=parse(412,['Dark Roast','Notes: Rich | Earth | Spice'],
    '<aside class="related-products">Decaf Swiss Water Process</aside>'+
    '<section class="customer-reviews">20g in, 40g out, 26 seconds for espresso</section>');
  assert.equal(p.ok,true);
  assert.equal(p.fields.decaffeination_method,undefined);
  assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('non-selected copyright year and coffee subscription are not a lot or recipe',()=>{
  const p=parse(414,['Medium Roast','Notes: Almonds | Mild Fruit | Cocoa Powder'],
    '<footer>2026 Woods Coffee — free shipping, start a subscription</footer>');
  assert.equal(p.ok,true);
  assert.equal(p.fields.release_label,undefined);
  assert.ok(!p.roaster_recipe?.dose_g);
});
test('missing selected current source and mismatched heading remain explicit failures',()=>{
  for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
    const e=requiredFocusedSourceFailures([413],[{number:413,status,parser_ok:false}]);
    assert.ok(e.some(x=>x.reason==='required_official_source_not_fetched'));
  }
  const e=requiredFocusedSourceFailures([412],[{number:412,status:'FETCHED',parser_ok:true,
    selected_heading_identity_verified:false,add_coffee_ui_rendered:true,source_review_rendered:true}]);
  assert.ok(e.some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
