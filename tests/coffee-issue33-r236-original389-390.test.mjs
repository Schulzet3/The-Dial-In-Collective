import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {selectedProductFormH2} from '../scripts/audit/issue33-selected-product-heading.mjs';

// Source-bound contract fixtures, not a substitute for current official HTML.
const originals={
  389:{name:'El Salvador El Manzano Natural',url:'https://topecacoffee.com/products/el-salvador-manzano-natural'},
  390:{name:'Santa Ana Swiss Water® Decaf',url:'https://topecacoffee.com/products/santa-ana-swiss-water®-decaf'}
};
function parse(number,details,related=''){
 const {name,url}=originals[number];
 const schema={'@context':'https://schema.org','@type':'Product',name,url};
 const html='<html><head><title>'+name+' | Topeca Coffee Roasters</title>'+
  '<script type="application/ld+json">'+JSON.stringify(schema)+'</script></head>'+
  '<body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="product-description">'+details.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#389 exact chosen El Manzano is natural, light and own selected sensory',()=>{
 const p=parse(389,['Producer: Emilio Lopez-Diaz, El Manzano',
  'Region: Santa Ana, El Salvador','Process: Natural','Roast Degree: Light',
  'Flavor Notes: Persimmon, Milk Chocolate, Almond Milk']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,originals[389].name);
 assert.equal(p.fields.process,'Natural');
 assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.tasting_notes||''),/Persimmon/i);
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
test('#389 current selected 2026 holiday offering is not a sibling decaf claim',()=>{
 const p=parse(389,['We are offering this naturally processed El Manzano as our last rotating single origin of 2026.',
  'Producer: Emilio Lopez-Diaz','Process: Natural',
  'Flavor Notes: Persimmon, Milk Chocolate, Almond Milk'],
  '<aside class="related-products"><h2>Santa Ana Swiss Water® Decaf</h2>'+
  '<p>Swiss Water, Dried Fruit, Nougat, Cacao Nib</p></aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,originals[389].name);
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Nougat|Cacao Nib/i);
});
test('#389 unrelated generic 2026 relationship must not become a distinct release',()=>{
 const p=parse(389,['Region: Santa Ana, El Salvador','Process: Natural',
  'Relationship since 2026.','Flavor Notes: Persimmon, Milk Chocolate, Almond Milk']);
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.release_label,'2026');
});
test('#390 selected Swiss Water method and Light roast are independent',()=>{
 const p=parse(390,['Producer: Emilio Lopez-Diaz','Region: Santa Ana, El Salvador',
  'Roast Degree: Light','Flavor Notes: Dried Fruit, Nougat, Cacao Nib',
  'Swiss Water Decaffeination Plant in Vancouver processes this selected coffee.']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,originals[390].name);
 assert.equal(p.fields.roast_level,'Light');
 assert.match(String(p.fields.tasting_notes||''),/Nougat/i);
 assert.equal(inferDecaffeinationMethod({name:originals[390].name,
  selectedMethod:'Swiss Water Decaffeination Process'}),'Water Process');
});
test('#390 mixed green Washed + Natural must not silently become only Washed',()=>{
 const p=parse(390,['Roast Degree: Light',
  'Processing Method: Blend of Washed and Natural',
  'Swiss Water Decaffeination Process',
  'Flavor Notes: Dried Fruit, Nougat, Cacao Nib']);
 assert.equal(p.ok,true);
 assert.ok(!['Washed','Natural'].includes(p.fields.process) ||
  (p.conflicts||[]).includes('process'),
  'mixed green processing cannot silently reduce to one constituent');
 assert.notEqual(p.fields.decaffeination_method,'Sugar Process');
});
test('#390 sibling medium Signature Espresso roast must not override selected Light',()=>{
 const p=parse(390,['Roast Degree: Light','Swiss Water Decaffeination Process',
  'This coffee is designed as a decaffeinated counterpart of our medium roast Signature Espresso.',
  'Flavor Notes: Dried Fruit, Nougat, Cacao Nib']);
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.roast_level,'Medium');
 assert.equal(p.fields.roast_level,'Light');
});
test('conflicting selected Swiss Water and EA method remains unresolved',()=>{
 assert.equal(inferDecaffeinationMethod({name:originals[390].name,
  selectedMethod:'Swiss Water Process and Ethyl Acetate Decaffeination'}),'');
});
test('unavailable original #388 cannot be certified using another Topeca SKU',()=>{
 const failures=requiredFocusedSourceFailures([388],
  [{number:388,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(failures.some(x=>x.reason==='required_official_source_not_fetched'));
});

function currentProductH2Fixture({name='El Salvador El Manzano Natural',
 handle='el-salvador-manzano-natural',action='/cart/add',description=true,
 surrounding='' }={}){
 return '<main><div class="main-product--root" data-handle="'+handle+'">'+
  '<form class="product-form" action="'+action+'">'+
  '<div class="product-form--block" data-block-type="heading">'+
  '<h2 class="product-form--block--heading">'+name+'</h2></div>'+
  (description?'<div class="product-form--block" data-block-type="description">'+
   '<div class="product-form--block--description"><p>Year after year our coffee farm produces a current selected harvest. '+
   'This exact selected bean has light roasting and natural processing and its own distinct fruity and sweet flavors. '+
   'All coffee details here belong to the selected purchase form.</p></div></div>':'')+
  '<button>Add to cart</button></form></div>'+surrounding+'</main>';
}
test('current exact selected H2 in buy form with substantial own prose establishes identity, no H3 required',()=>{
 const html=currentProductH2Fixture();
 assert.deepEqual(selectedProductFormH2(html,{source_url:originals[389].url}),[originals[389].name]);
});
test('wrong source URL handle cannot certify a selected purchase form H2',()=>{
 const html=currentProductH2Fixture();
 assert.deepEqual(selectedProductFormH2(html,{source_url:originals[390].url}),[]);
});
test('form H2 without own product description is not identity proof',()=>{
 const html=currentProductH2Fixture({description:false});
 assert.deepEqual(selectedProductFormH2(html,{source_url:originals[389].url}),[]);
});
test('recommendation product purchase form is not selected product identity',()=>{
 const nested='<aside class="related-products">'+currentProductH2Fixture()+'</aside>';
 assert.deepEqual(selectedProductFormH2(nested,{source_url:originals[389].url}),[]);
});
test('generic wrong cart endpoint cannot certify a selected H2',()=>{
 const html=currentProductH2Fixture({action:'/collections/all'});
 assert.deepEqual(selectedProductFormH2(html,{source_url:originals[389].url}),[]);
});
