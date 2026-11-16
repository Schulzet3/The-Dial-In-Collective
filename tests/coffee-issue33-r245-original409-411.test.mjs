import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

// Synthetic identity, direct-source and hostile-negative controls.
// The workflow separately fetches the real current selected merchant HTML.
const cases={
  409:['Decaf','https://whiterhinocoffee.com/products/decaf'],
  410:['Ethiopia Kayon Mountain','https://whiterhinocoffee.com/products/ethiopia-kayon-mountain'],
  411:['Hidden Eagle (Espresso Blend)','https://whiterhinocoffee.com/products/hidden-eagle-espresso']
};
function parse(n,description=[],extra=''){
 const [name,url]=cases[n];
 const html='<html><head><title>'+name+' | White Rhino Coffee</title>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url})+
  '</script></head><body><main><article class="product"><h1>'+name+
  '</h1><div class="product-description">'+description.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#409 selected Swiss Water decaf independent of Washed green processing',()=>{
 const p=parse(409,['Our decaffeinated Guatemalan coffee uses Swiss Water Process.',
  'Roast: Medium','Origin: Guatemala','Process: Washed, Swiss Water Process',
  'Growing Altitude: 1320 - 1600 meters',
  'Tasting Notes: Caramel Apple, Black Tea, Raisin']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Decaf');
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.tasting_notes||''),/Caramel Apple/i);
});
test('#410 current selected producer history is not a release year',()=>{
 const p=parse(410,['The Kayon Mountain Coffee Farm has been owned and operated by Ismael Hassen Aredo and his family since 2012.',
  'Roast: Light','Origin: Oromia, Guji, Shakiso, Ethiopia','Process: Washed',
  'Growing Altitude: 1900-2200 MASL','Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Ethiopia Kayon Mountain');
 assert.equal(p.fields.process,'Washed');
 assert.equal(p.fields.roast_level,'Light');
 assert.equal(p.fields.release_label,undefined);
 assert.match(String(p.fields.tasting_notes||''),/Jasmine/i);
});
test('#411 a mixed green-processing espresso BLEND cannot become solely washed or natural',()=>{
 const p=parse(411,['A medium roasted espresso made of Natural Brazil and Washed Peru coffees.',
  'Roast: Medium','Origin: Brazil & Peru','Process: Natural & Washed',
  'Tasting Notes: Cocoa, Nut Butter, Honey, Dried Apricot, Caramel']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Hidden Eagle (Espresso Blend)');
 assert.equal(p.fields.roast_level,'Medium');
 assert.notEqual(p.fields.process,'Natural');
 assert.notEqual(p.fields.process,'Washed');
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('unrelated recommendation, review, generic brew panels do not become #410 source facts',()=>{
 const p=parse(410,['Roast: Light','Origin: Ethiopia','Process: Washed',
  'Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle'],
  '<aside class="related-products">Decaf Swiss Water Process</aside>'+
  '<section class="customer-reviews">Water recipe 19.7g in / 32g out / 26 seconds</section>'+
  '<footer>2012 and 2026 ©; Ethiopia Colombia</footer>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.equal(p.fields.release_label,undefined);
 assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('grind choice Espresso and preferred shot description are not a numeric recipe',()=>{
 const p=parse(411,['A perfect espresso shot; choose Espresso grind if preferred.',
  'Roast: Medium','Origin: Brazil & Peru','Tasting Notes: Cocoa, Nut Butter, Honey']);
 assert.equal(p.ok,true);
 assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('inaccessible and mismatched selected current product are reviewable failures',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  const errors=requiredFocusedSourceFailures([409],[{number:409,status,parser_ok:false}]);
  assert.ok(errors.some(x=>x.reason==='required_official_source_not_fetched'));
 }
 const errors=requiredFocusedSourceFailures([411],[{number:411,status:'FETCHED',
  parser_ok:true,selected_heading_identity_verified:false,
  add_coffee_ui_rendered:true,source_review_rendered:true}]);
 assert.ok(errors.some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
