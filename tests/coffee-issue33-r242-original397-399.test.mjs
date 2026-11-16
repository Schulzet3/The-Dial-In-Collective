import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
// Synthetic source-shaped positives and adversarial negatives. The separately
// guarded public-HTTPS job is the only current selected official-source proof.
const cases={
 397:['Nero - Dark Roast Blend','https://victuscoffee.com/products/nero-blend'],
 398:['Veloce - Light Roast Blend','https://victuscoffee.com/products/veloce-blend'],
 399:['Victoria - Medium Roast Blend','https://victuscoffee.com/products/victoria-blend']
};
function parse(n,description,extra=''){
 const [name,url]=cases[n];
 const html='<html><head><title>'+name+' | Victus Coffee</title>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url})+
  '</script></head><body><main><article class="product"><h1>'+name+
  '</h1><div class="product-description">'+description.map(s=>'<p>'+s+'</p>').join('')+
  '</div><select name="grind"><option>Whole Bean</option><option>Espresso</option>'+
  '<option>Drip</option><option>French Press</option></select></article></main>'+
  extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#397 direct Nero dark chocolate is chosen; no other blend sensory',()=>{
 const p=parse(397,['Nero is our dark roast blend, bold and full-bodied.',
  'Tasting Notes: deep chocolatey. Heavy body and a sweet lingering finish.'],
  '<aside class="related-products"><p>Veloce Light Blend, sweet and fruity.</p></aside>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[397][0]);
 assert.equal(p.fields.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/marshmallow|raspberry|berry/i);
 assert.equal(p.fields.release_label,undefined);
});
test('#398 direct Veloce light roast retains fruit; no review berry specificity',()=>{
 const p=parse(398,['Veloce - Light Roast Blend is a light roast.',
  'Tasting Notes: sweet chocolatey and fruity. Medium body and lingering finish.'],
  '<aside class="customer-reviews">A customer says berries differ with every bag, like raspberry.</aside>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[398][0]);
 assert.equal(p.fields.roast_level,'Light');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/raspberry/i);
 assert.equal(p.fields.release_label,undefined);
});
test('#399 current Victoria medium blend does not borrow sibling product or recipe',()=>{
 const p=parse(399,['Victoria is our medium roasted blend.',
  'Tasting Notes: smooth milk chocolate and fruity. Good for espresso drinks.'],
  '<aside class="related-products"><p>Nero Dark Roast and Veloce Light Roast.</p></aside>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[399][0]);
 assert.equal(p.fields.roast_level,'Medium');
 assert.equal(p.fields.release_label,undefined);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/raspberry|marshmallow/i);
});
test('no selected H1 or wrong chosen product is never accepted',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  assert.ok(requiredFocusedSourceFailures([398],[{number:398,status,parser_ok:false}])
   .some(x=>x.reason==='required_official_source_not_fetched'));
 }
 const r={number:399,status:'FETCHED',parser_ok:true,
   add_coffee_ui_rendered:true,source_review_rendered:true,
   selected_heading_identity_verified:false};
 assert.ok(requiredFocusedSourceFailures([399],[r])
  .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
test('a sibling product H1 cannot become current #398 product verification',()=>{
 const r={number:398,status:'FETCHED',parser_ok:true,
  archived_coffee:cases[398][0],current_fields:{name:cases[397][0]},
  selected_h1:[cases[397][0]],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:false,add_coffee_ui_rendered:true,
  source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([398],[r])
  .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
test('merchant page footer year and grind choice cannot certify lot or recipe',()=>{
 const p=parse(397,['Nero Dark Roast Blend. Tasting Notes: deep chocolatey.'],
  '<footer>Copyright 2026 Victus Coffee</footer>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.release_label,undefined);
 assert.equal(p.fields.origin,undefined);
 assert.equal(p.fields.process,undefined);
});
