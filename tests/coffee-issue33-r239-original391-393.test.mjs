import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

// Synthetic source-bound positive/hostile contracts, NOT substitutes for raw
// official seller HTML and the exact-SHA runtime afterproof in R239 CI.
const products={
  391:{name:'Downshift',url:'https://umblecoffee.com/products/downshift'},
  392:{name:'Front Runner',url:'https://umblecoffee.com/products/front-runner'},
  393:{name:'Umble Reserve - Prologue',url:'https://umblecoffee.com/products/prologue'}
};
function parse(number,description,related=''){
  const {name,url}=products[number];
  const schema={'@context':'https://schema.org','@type':'Product',name,url};
  const paragraphs=description.map(s=>'<p>'+s+'</p>').join('');
  const html='<html><head><title>'+name+' | Umble Coffee</title><script type="application/ld+json">'+
    JSON.stringify(schema)+'</script></head><body><main><article class="product">'+
    '<h1>'+name+'</h1><div class="product-description">'+paragraphs+
    '</div></article></main>'+related+'</body></html>';
  return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#391 selected decaf with educational Swiss Water podcast does not assert selected water method',()=>{
 const p=parse(391,[
  'Downshift is a medium-roast single-origin decaf from Huila, Colombia.',
  'Process: Washed. Flavor Notes: Chocolate, Caramel, Hazelnut.',
  'PODCAST: We got with the folks at Swiss Water to understand decaf better. Listen to our educational podcast.'
 ]);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Downshift');
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
test('#391 explicit exact chosen Swiss Water decaffeination method is recognizable, unlike a podcast',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Downshift',selectedCurrentDecafIdentity:true,
  selectedMethod:'Decaffeination Method: Swiss Water Process'}),'Water Process');
 assert.equal(inferDecaffeinationMethod({name:'Downshift',selectedCurrentDecafIdentity:true,
  selectedMethod:''}),'');
});
test('#392 selected Front Runner does not borrow related Downshift decaf or sensory',()=>{
 const p=parse(392,[
  'Front Runner is a medium roast from Nariño, Colombia, washed processed.',
  'Flavor Notes: Graham Cracker, Toffee, Marshmallow.',
  'We use Front Runner for espresso at HQ, but publish no measured espresso recipe.'
 ],'<aside class="related-products"><h2>Downshift</h2><p>Swiss Water Decaf, Chocolate, Caramel, Hazelnut</p></aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Front Runner');
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Hazelnut/i);
});
test('#393 footer copyright, generic early releases and other process education do not identify lot',()=>{
 const p=parse(393,[
  'Umble Reserve - Prologue is natural processed from the Vargas family in Huila, Colombia.',
  'Process: Natural. Flavor Notes: Apricot, Raspberry, Pink Starburst.',
  'Washed coffees tend to be clean, naturally processed coffees are fruit-forward.'
 ],'<footer><p>Stay in the loop with insider extras, early releases and more!</p>'+
   '<p>© 2026 Umble Coffee Co</p></footer>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Umble Reserve - Prologue');
 assert.notEqual(p.fields.release_label,'Limited batch');
 assert.notEqual(p.fields.release_label,'2026');
 assert.notEqual(p.fields.process,'Washed');
});
test('identity-mismatched or unavailable original page never yields certified current product',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  const failures=requiredFocusedSourceFailures([393],[{number:393,status,parser_ok:false}]);
  assert.ok(failures.some(x=>x.reason==='required_official_source_not_fetched'));
 }
});
test('the true selected coffee still requires an independently verified original heading',()=>{
 const r={number:391,status:'FETCHED',parser_ok:true,add_coffee_ui_rendered:true,
   source_review_rendered:true,selected_h1_present_in_scoped_html:true,
   selected_heading_identity_verified:false};
 assert.ok(requiredFocusedSourceFailures([391],[r])
   .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
