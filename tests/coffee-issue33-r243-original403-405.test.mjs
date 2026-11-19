import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
// Synthetic selected-product contracts; guarded public current-source job is separate.
const cases={
 403:['Ambler Blend','https://wakecoffee.com/products/ambler-blend'],
 404:['Bromo','https://wakecoffee.com/products/bromo-blend'],
 405:['Mountain Water Decaf','https://wakecoffee.com/products/decaf']
};
function parse(n,description,extra=''){
 const [name,url]=cases[n];
 const html='<html><head><title>'+name+' | Wake Coffee Roasters</title>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url})+
  '</script></head><body><main><article class="product"><h1>'+name+
  '</h1><div class="product-description">'+description.map(s=>'<p>'+s+'</p>').join('')+
  '</div><select name="grind"><option>Whole bean</option><option>Espresso</option></select></article></main>'+
  extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#403 direct Latin-American blend; no unsupported release or process',()=>{
 const p=parse(403,['Crafted with Latin-American beans, Ambler offers a light-bodied, spirited coffee experience.','Its mellow flavor is welcoming.']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,cases[403][0]);
 assert.match(String(p.fields.origin||''),/Latin America/i);
 assert.equal(p.fields.release_label,undefined);
 assert.equal(p.fields.process,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#404 selected Central American and Indonesian caramel are its own facts',()=>{
 const p=parse(404,["Our espresso blend, crafted from select Central American and Indonesian beans, delivers a robust caramel flavor."]);
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[404][0]);
 assert.match(String(p.fields.origin||''),/Central America/i);
 assert.match(String(p.fields.origin||''),/Indonesia/i);
 assert.match(String(p.fields.tasting_notes||''),/caramel/i);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#405 Water decaffeination is not Washed green processing or Medium roast',()=>{
 const p=parse(405,['Our Mountain Water Decaf Beans undergo a 100% chemical-free decaffeination process.',
 'Tasting notes: herbal, dark chocolate, medium body','Latin American, Indonesian and African Blend']);
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[405][0]);
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.equal(p.fields.process,undefined);
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.release_label,undefined);
});
test('review-only roast adjectives and Bromo Caffeine history do not certify coffee roast, caffeine or recipe',()=>{
 const p=parse(404,['Bromo Blend offers caramel from Central American and Indonesian beans.'],
 '<aside class="customer-reviews">A customer: Dark roast. Espresso 18g in 36g out over 30 seconds.</aside>'+
 '<footer>Copyright 2026 Wake Coffee. The historic Bromo Caffeine remedy is not this coffee.</footer>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[404][0]);
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.release_label,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.ok(!p.roaster_recipe?.dose_g&&!p.roaster_recipe?.yield_g&&!p.roaster_recipe?.time_s);
});
test('sibling #405 decaf does not make regular #403 decaffeinated',()=>{
 const p=parse(403,['Ambler Blend uses Latin-American beans.'],
 '<aside class="related-products">Mountain Water Decaf uses a water process.</aside>');
 assert.equal(p.ok,true);assert.equal(p.fields.decaffeination_method,undefined);
});
test('unavailable and changed H1 remain unverified even with a parsed URL',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  assert.ok(requiredFocusedSourceFailures([405],[{number:405,status,parser_ok:false}])
   .some(e=>e.reason==='required_official_source_not_fetched'));
 }
 const row={number:404,status:'FETCHED',parser_ok:true,selected_heading_identity_verified:false,
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([404],[row])
  .some(e=>e.reason==='selected_original_product_heading_identity_unverified'));
});

test('#405 H1 alone or sibling named Water is NOT selected method evidence',()=>{
 const titleOnly=parse(405,['Fresh roasted decaf coffee from three regions.']);
 assert.equal(titleOnly.ok,true);assert.equal(titleOnly.fields.decaffeination_method,undefined);
 const fromSibling=parse(405,['Fresh roasted decaf coffee with no stated method.'],
  '<aside class="related-products"><p>Our Mountain Water Decaf Beans undergo a chemical-free decaffeination process.</p></aside>');
 assert.equal(fromSibling.fields.decaffeination_method,undefined);
});
test('#405 one selected paragraph with competing Sugar decaf spec is withheld',()=>{
 const p=parse(405,[
  'Our Mountain Water Decaf Beans undergo a 100% chemical-free decaffeination process.',
  'Decaffeination Method: Sugar Cane Process'
 ]);
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,undefined);
});
