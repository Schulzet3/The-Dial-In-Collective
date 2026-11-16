import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {selectedShopifyPurchaseH3Identity} from '../scripts/audit/issue33-shopify-selected-product-h3.mjs';
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

function h3Fixture({name='AFRICAN BLEND',id=7438983954689,handle='african-blend',
 h3Name=name,formId=id,productId=id,trackerId=id,jsonHandle=handle,section='sw-product-template',
 cart='/cart/add',additionalTitle='',hiddenRoot=false}={}){
 const url='https://www.ahrre.com/products/'+handle;
 const tracker=JSON.stringify({p:'product',rtyp:'product',rid:trackerId,pageurl:'www.ahrre.com/products/'+handle});
 const product=JSON.stringify({id,title:name,handle:jsonHandle,description:'Selected current coffee'});
 return '<html><head><script id="__st">var __st='+tracker+';</script></head><body>'+
  '<div id="shopify-section-'+section+'"><div id="ProductSection" itemtype="http://schema.org/Product">'+
  '<div class="product-single"><div class="product-single__hero"><h3 class="product-single__title" itemprop="name">'+h3Name+'</h3>'+
  '<form action="'+cart+'" id="product_form_'+formId+'" class="product-form--wide">'+
  '<input name="form_type" value="product"><input name="product-id" value="'+productId+'">'+
  '<input name="section-id" value="'+section+'"></form></div></div></div>'+
  '<script id="ProductJson-'+section+'" type="application/json">'+product+'</script>'+
  (hiddenRoot?'<aside><h3 class="product-single__title" itemprop="name">Other Coffee</h3></aside>':'')+
  additionalTitle+'</div></body></html>';
}
test('Ahrre genuine current Shopify H3 selected purchase identity requires four linked proofs',()=>{
 const selected='https://www.ahrre.com/products/african-blend';
 const html=h3Fixture();
 const r=selectedShopifyPurchaseH3Identity(html,{source_url:selected,
  expected_name:'AFRICAN BLEND',parsed_name:'AFRICAN BLEND'});
 assert.equal(r?.method,'shopify_current_tracker_product_json_visible_h3_and_cart_form');
 assert.equal(r?.verified_product_id,'7438983954689');
});
test('H3 identity rejects changed selected product, wrong current JSON or mismatched direct cart',()=>{
 const selected='https://www.ahrre.com/products/african-blend';
 const cases=[
  h3Fixture({h3Name:'OTHER COFFEE'}),h3Fixture({jsonHandle:'other-coffee'}),
  h3Fixture({productId:7438983954688}),h3Fixture({formId:7438983954688}),
  h3Fixture({trackerId:7438983954688}),h3Fixture({cart:'/cart/add-other'}),
  h3Fixture({hiddenRoot:true}),
  h3Fixture({additionalTitle:'<aside><h3 class="product-single__title" itemprop="name">Other Coffee</h3></aside>'})
 ];
 for(const html of cases)assert.equal(selectedShopifyPurchaseH3Identity(html,{
  source_url:selected,expected_name:'AFRICAN BLEND',parsed_name:'AFRICAN BLEND'}),null);
 assert.equal(selectedShopifyPurchaseH3Identity(h3Fixture(),{
  source_url:'https://www.ahrre.com/products/unrelated-coffee',
  expected_name:'AFRICAN BLEND',parsed_name:'AFRICAN BLEND'}),null);
});
