import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

// Original603 case numbers; source-constrained fixtures are NOT live-source proof.
const cases={
  379:{name:'AAPOSA COOPERATIVE',url:'https://thrivefarmers.com/products/aaposa-cooperative'},
  380:{name:'Horizon Organic',url:'https://thrivefarmers.com/products/horizon-organic'},
  381:{name:'Layover Organic Decaf',url:'https://thrivefarmers.com/products/layover-organic-decaf'}
};
function parse(n,own,related=''){
 const c=cases[n];
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url};
 const html='<html><head><title>'+c.name+' | Thrive Farmers</title>'+
  '<script type="application/ld+json">'+JSON.stringify(schema)+'</script></head>'+
  '<body><main><article class="product"><h1>'+c.name+'</h1>'+
  '<div class="product-description">'+own.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#379 selected AAPOSA washed Guatemala association remains distinct',()=>{
 const p=parse(379,['Origin: Atitlán, Guatemala','Process: Washed',
  'Producer: Asociación de Agricultores y Productores Orgánicos de Atitlán (AAPOSA)',
  'Tasting Notes: Creamy, Toffee, Juicy Peach']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'AAPOSA COOPERATIVE');
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.tasting_notes||''),/toffee/i);
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
test('#379 related decaf cannot donate current selected fields',()=>{
 const p=parse(379,['Origin: Guatemala','Process: Washed',
  'Tasting Notes: Creamy, Toffee, Juicy Peach'],
  '<aside class="related-products"><h2>Layover Organic Decaf</h2>'+
  '<p>Swiss Water Process, Baking Spices, Syrupy, Dark Chocolate</p></aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'AAPOSA COOPERATIVE');
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
test('#380 selected blend identity/roast independent of seller farmer biography',()=>{
 const p=parse(380,['ROAST: Medium','ORIGIN: Guatemala / Nicaragua',
  'REGION: Huehuetenango(GT) / Matagalpa(NI)','PROCESS: Washed',
  'TASTING NOTES: Fruity, Toasted Cereal, Chocolate']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Horizon Organic');
 assert.equal(p.fields.roast_level,'Medium');
 assert.notEqual(p.fields.process,'Natural');
 assert.doesNotMatch(String(p.fields.producer||''),/Marta Solares/iu);
});
test('#380 unrelated featured farm sidebar cannot become sole blend producer',()=>{
 const p=parse(380,['ROAST: Medium','ORIGIN: Guatemala / Nicaragua',
  'PROCESS: Washed','TASTING NOTES: Fruity, Toasted Cereal, Chocolate'],
  '<aside class="related-products"><h2>Meet Marta Solares</h2>'+
  '<p>Farm: La Esperanza. Region: Concepción Pinula, Guatemala.</p></aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Horizon Organic');
 assert.doesNotMatch(String(p.fields.producer||''),/Marta Solares/iu);
 assert.doesNotMatch(String(p.fields.origin||''),/La Esperanza/iu);
});
test('#381 Swiss Water decaf and washed green process are different categories',()=>{
 const p=parse(381,['ROAST: Medium','ORIGIN: Nicaragua','PROCESS: Washed',
  'TASTING NOTES: Baking Spices, Syrupy, Dark Chocolate',
  'The Swiss Water Decaffeination Process is chemical-free.']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Layover Organic Decaf');
 assert.equal(p.fields.process,'Washed');
 assert.notEqual(p.fields.decaffeination_method,'Sugar Process');
 assert.equal(inferDecaffeinationMethod({name:cases[381].name,
  selectedMethod:'The Swiss Water Decaffeination Process is chemical-free.'}),'Water Process');
});
test('regular coffee cannot borrow Swiss Water from sibling',()=>{
 assert.equal(inferDecaffeinationMethod({name:cases[380].name,
  selectedMethod:'Swiss Water Decaffeination Process'}),'');
});
test('opposing water and EA decaf witnesses cannot be silently resolved',()=>{
 assert.equal(inferDecaffeinationMethod({name:cases[381].name,
  selectedMethod:'Swiss Water Process and Ethyl Acetate Decaffeination'}),'');
});
test('unavailable original #379 fails; never certify from a catalog tile',()=>{
 const errors=requiredFocusedSourceFailures([379],
  [{number:379,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(errors.some(x=>x.reason==='required_official_source_not_fetched'));
});
