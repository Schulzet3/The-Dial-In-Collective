import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

// Synthetic role/identity regressions only; actual current merchant HTML is
// independently fetched by the scoped guarded GitHub workflow.
const cases={
  406:['Guatemala Los Volcanes','https://webe.coffee/products/guatemala-los-volcanes'],
  408:['Holy Grail No. 2: Strawberry Jam','https://webe.coffee/products/strawberry-jam-colombia-santa-monica']
};
function parse(n,details,extra=''){
 const [name,url]=cases[n];
 const html='<html><head><title>'+name+' | WeBe Coffee Roasters</title>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url})+
  '</script></head><body><main><article class="product"><h1>'+name+
  '</h1><div class="product-description">'+details.map(x=>'<p>'+x+'</p>').join('')+
  '</div></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#406 current selected typed specifications are its own, not unrelated coffee facts',()=>{
 const p=parse(406,[
  'Tasting notes: Brown Sugar, Red Apple, Milk Chocolate, Orange',
  'Origin: Guatemala', 'Region: Alta Verapaz, Guatemala',
  'Producer: Smallholder farmers working with Los Volcanes',
  'Process: Washed', 'Roast: Light',
  'Altitude: 1,300–1,500 meters',
  'Varieties: Bourbon, Caturra, Catuai, Sarchimor, Anacafe 14'
 ]);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[406][0]);
 assert.equal(p.fields.process,'Washed');
 assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.origin||''),/Guatemala/i);
 assert.match(String(p.fields.tasting_notes||''),/Brown Sugar/i);
 assert.match(String(p.fields.tasting_notes||''),/Orange/i);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#408 current strawberry/wine yeast co-ferment can retain anaerobic, no fabricated water/sugar decaf',()=>{
 const p=parse(408,[
  'Origin: Colombia', 'Region: Armenia, Quindío',
  'Producer: Jairo Arcila, Santa Mónica farm', 'Roast: Light',
  'Process: 72-hour dry anaerobic co-ferment with strawberries and wine yeast, then honey processed, patio dried',
  'Tasting notes: Ripe Strawberry, Tangerine, Caramel, Chocolate'
 ]);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[408][0]);
 assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.origin||''),/Colombia/i);
 assert.match(String(p.fields.tasting_notes||''),/Strawberry/i);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('a different limited release and shopper/customer remarks never become #406 facts',()=>{
 const p=parse(406,['Guatemala Los Volcanes is a light roast from Guatemala with brown sugar and orange.'],
  '<aside class="related-products">Holy Grail No. 2 is strawberry co-fermented. Limited release.</aside>'+
  '<div class="customer-reviews">I get blueberry, and dial in at 20g to 40g in 28 seconds.</div>'+
  '<footer>© 2026 WeBe Coffee Roasters</footer>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[406][0]);
 assert.equal(p.fields.release_label,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('pour-over ratio is not a selected espresso shot recipe',()=>{
 const p=parse(408,['Strawberry Jam is a light roast from Colombia.','Pour-over, 1:15 (20 g to 300 g), 200°F, to bring out the jammy sweetness.']);
 assert.equal(p.ok,true);
 assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('unreachable or wrong selected identity must fail focused source acceptance',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH'])
  assert.ok(requiredFocusedSourceFailures([408],[{number:408,status,parser_ok:false}])
   .some(x=>x.reason==='required_official_source_not_fetched'));
 const row={number:406,status:'FETCHED',parser_ok:true,selected_heading_identity_verified:false,
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([406],[row])
  .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
