import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {cases,direct,fields} from '../scripts/audit/issue33-r255-433-447-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const product=(n,paragraph,extra='')=>
 '<html><head><title>'+cases[n].name+' | Coffee</title></head>'+
 '<body><main><article class="product"><h1>'+cases[n].name+'</h1>'+
 '<div class="woocommerce-product-details__short-description"><p>'+paragraph+
 '</p></div></article></main>'+extra+'</body></html>';
const am='Graham cracker, cashew, hibiscus, with a hint of lemon and sunrise. Perfect everyday coffee no matter how you brew. It does lean slightly lighter. Roast Level: Lighter';
const sumatra='This premium selection is a clean, double picked Sumatra grown in the Jegarang region, at an elevation of 1375 & 1600 meters. Upon grinding, you will notice very sweet and fruity aromatics. In the cup, it showcases deep fruit notes, great body and a smooth lasting finish. Medium-Dark Roast.';
test('AM selected direct evidence requires all literal descriptors, not related or customer-review prose',()=>{
 assert.deepEqual(direct(433,product(433,am),['AM']),{selected_heading:true,own_evidence:true});
 assert.equal(direct(433,product(433,'No tasting information','<aside>'+am+'</aside>'),['AM']).own_evidence,false);
 assert.equal(direct(433,product(433,am),['AM','AM']).selected_heading,false);
 assert.equal(direct(433,product(433,am),['Other']).selected_heading,false);
});
test('AM current selected direct four-flavor text must not yield figurative sunrise or a guessed Lighter category',()=>{
 const p=extractPublicCoffeeFacts(product(433,am),{source_url:cases[433].url});
 assert.equal(p.ok,true);
 const taste=String(p.fields?.tasting_notes||'').toLowerCase();
 for(const literal of ['graham cracker','cashew','hibiscus','lemon'])
  assert.ok(taste.includes(literal)||p.conflicts?.includes('tasting_notes'),
   'Missing selected literal '+literal+' in actual parser');
 assert.ok(!p.fields?.roast_level,'Comparative Lighter cannot be categorized as Medium/Light');
 assert.ok(!taste.includes('sunrise'),'Figurative sunrise must not become a sourced flavor');
});
test('AM negative: reviews and sibling coffee must not provide unprinted origin, roast or flavor',()=>{
 const page=product(433,'No coffee flavor details published.',
  '<section id="reviews"><h2>Customer reviews</h2><p>Great bright hibiscus, graham cracker, cashew and lemon, Dark roast from Ethiopia.</p></section>'+
  '<aside class="related-products">Related AM blend: Dark roast, Kenya, decaf</aside>');
 const p=extractPublicCoffeeFacts(page,{source_url:cases[433].url});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
 assert.notEqual(p.fields?.roast_level,'Dark');
 assert.ok(!String(p.fields?.tasting_notes||'').includes('Dark roast'));
});
test('AM canonical field gate rejects earlier archived lemon-and-sunrise-only and fabricated roast/origin',()=>{
 const f={name:'AM',roaster:'Black Coffee Roasting Company',tasting_notes:'Graham cracker, cashew, hibiscus, lemon'};
 assert.ok(Object.values(fields(433,f)).every(Boolean));
 assert.equal(fields(433,{...f,tasting_notes:'lemon and sunrise'}).graham,false);
 assert.equal(fields(433,{...f,roast_level:'Medium'}).unsupported_lighter_left_blank,false);
 assert.equal(fields(433,{...f,origin:'Ethiopia'}).no_fabricated_growing_origin,false);
});
test('Sumatra own cup and cultivation evidence rejects grind-aroma flavor and other merchant footer geography',()=>{
 assert.deepEqual(direct(447,product(447,sumatra),['Sumatra Mandheling']),
  {selected_heading:true,own_evidence:true});
 assert.equal(direct(447,product(447,'No selected coffee description',
  '<aside>'+sumatra+'</aside>'),['Sumatra Mandheling']).own_evidence,false);
 const f={name:'Sumatra Mandheling',roaster:'Blue Jazz Coffee',origin:'Jegarang, Sumatra',
  roast_level:'Medium-Dark',elevation_m:'1375 & 1600 meters',tasting_notes:'Deep fruit'};
 assert.ok(Object.values(fields(447,f)).every(Boolean));
 assert.equal(fields(447,{...f,origin:'Topeka, Kansas'}).growing_origin,false);
 assert.equal(fields(447,{...f,tasting_notes:'Sweet and fruity aromatics'}).direct_fruit,false);
});
test('nonretrievable exact original URL can never be marked complete from metadata',()=>{
 for(const n of [433,447]){
  assert.ok(requiredFocusedSourceFailures([n],[{number:n,status:'UNAVAILABLE',parser_ok:false}])
   .some(x=>x.reason==='required_official_source_not_fetched'));
 }
});

test('sky-time metaphors after an actual sensory noun stay as source prose, not autofilled cup notes',()=>{
 for(const scene of ['sunrise','sunset']){
  const p=extractPublicCoffeeFacts(product(433,
   'Graham cracker, cashew, hibiscus, with a hint of lemon and '+scene+
   '. Perfect everyday coffee no matter how you brew.'),{source_url:cases[433].url});
  assert.equal(p.ok,true);
  const taste=String(p.fields?.tasting_notes||'').toLowerCase();
  for(const literal of ['graham cracker','cashew','hibiscus','lemon'])
   assert.ok(taste.includes(literal),'must preserve exact printed gustatory '+literal);
  assert.ok(!taste.includes(scene),'time-of-day metaphor should not be treated as taste '+scene);
 }
});
test('literal direct flavor from selected coffee is not erased by unrelated sky metaphor',()=>{
 const p=extractPublicCoffeeFacts(product(433,'Graham cracker, cashew, hibiscus, lemon',
  '<aside class="related-products">A different coffee has sunrise and sunset flavor.</aside>'),
  {source_url:cases[433].url});
 assert.equal(p.ok,true);
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('sunrise'));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('sunset'));
});
