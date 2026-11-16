import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const cases={418:['AFRICAN BLEND','https://www.ahrre.com/products/african-blend'],419:['COLOMBIAN LIGHT ROAST','https://www.ahrre.com/products/colombian-light-roast']};
function parse(n,paragraphs=[],aside=''){
 const [name,url]=cases[n];
 const ld=JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url});
 const html='<html><head><title>'+name+' | Ahrre\'s Coffee Roastery</title><script type="application/ld+json">'+ld+'</script></head>'+
  '<body><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+
  paragraphs.map(x=>'<p>'+x+'</p>').join('')+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
test('#418 explicitly labeled Full City from selected product normalizes Medium-Dark',()=>{
 const p=parse(418,['COFFEE DETAILS','FLAVOR NOTES: Floral, Fruity, Berry','REGION: Africa','ROAST: Full City',
  'African Blend is grown exclusively in East Africa.']);
 assert.equal(p.ok,true);assert.equal(p.fields.name,'AFRICAN BLEND');
 assert.equal(p.fields.roast_level,'Medium-Dark');
 assert.ok(has(p.fields.tasting_notes,'Berry')||(p.conflicts||[]).includes('tasting_notes'));
});
test('#418 generic decaf variant menu and all-decaf educational sentence do not mark base regular blend decaf',()=>{
 const p=parse(418,['ROAST: Full City','FLAVOR NOTES: Floral, Fruity, Berry',
  'Blended Coffees tend to emphasize coffees blended.',
  'All Decaffeinated coffees are Swiss Water Process.'],
  '<aside class="related-products">Decaf / Espresso $22.08</aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.notEqual(p.fields.process,'Washed');
});
test('#419 other standard Full City comparison must not promote selected Colombian American Roast to Medium-Dark',()=>{
 const p=parse(419,['These beans are roasted to the American Roast — two shades lighter than our standard Full City roast.',
  'Colombian Supremo beans yield a moderately heavy-bodied coffee with a balanced flavor.']);
 assert.equal(p.ok,true);assert.equal(p.fields.name,'COLOMBIAN LIGHT ROAST');
 assert.notEqual(p.fields.roast_level,'Medium-Dark');
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('related coffee Full City label cannot determine selected Colombian roast',()=>{
 const p=parse(419,['Colombian Supremo beans yield a smooth rich flavor.'],
  '<aside class="related-products">AFRICAN BLEND ROAST: Full City</aside>');
 assert.equal(p.ok,true);assert.notEqual(p.fields.roast_level,'Medium-Dark');
});
test('no fabricated numeric espresso dose from product variants or footers',()=>{
 for(const n of [418,419]){
  const p=parse(n,['Product description and beans only.'],
   '<footer>Espresso grind, Whole Bean, 2026 shipping, 3lbs, order $50</footer>');
  assert.equal(p.ok,true);assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
  assert.equal(p.fields.release_label,undefined);
 }
});
test('missing or changed selected official product is not current-source certification',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  const failures=requiredFocusedSourceFailures([418],[{number:418,status,parser_ok:false}]);
  assert.ok(failures.some(x=>x.reason==='required_official_source_not_fetched'));
 }
 const failures=requiredFocusedSourceFailures([419],[{number:419,status:'FETCHED',parser_ok:true,
  selected_heading_identity_verified:false,add_coffee_ui_rendered:true,source_review_rendered:true}]);
 assert.ok(failures.some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
