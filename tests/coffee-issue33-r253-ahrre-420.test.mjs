import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {selectedShopifyPurchaseH3Identity} from '../scripts/audit/issue33-shopify-selected-product-h3.mjs';
import {cases,selectedDirect,canonical} from '../scripts/audit/issue33-r253-ahrre-420-check.mjs';
const target=cases[420];
function parsed(paragraphs=[],aside=''){
 const ld=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:target.name,url:target.url});
 const html='<html><head><title>'+target.name+' | Ahrre\'s Coffee Roastery</title>'+
  '<script type="application/ld+json">'+ld+'</script></head><body><main><article class="product">'+
  '<h1>'+target.name+'</h1><div class="product-description">'+paragraphs.map(x=>'<p>'+x+'</p>').join('')+
  '</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:target.url});
}
test('selected literal Full City is Medium-Dark; selected label is not sibling roast',()=>{
 const p=parsed(['COFFEE DETAILS','FLAVOR NOTES: Floral, Fruity, Berry',
  'REGION: Africa','ROAST: Full City','Tanzanian Peaberry coffee is grown in Tanzania.']);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,target.name);
 assert.equal(p.fields.roast_level,'Medium-Dark');
 assert.ok(/berry/i.test(p.fields.tasting_notes||'')||(p.conflicts||[]).includes('tasting_notes'));
});
test('an unrelated product or generic educational decaf cannot autofill this selected regular coffee',()=>{
 const p=parsed(['ROAST: Full City','FLAVOR NOTES: Floral, Fruity, Berry',
  'African Coffees often have fruity flavors.','A peaberry is a bean shape.'],
  '<aside class="related-products">TANZANIAN PEABERRY KILIMANJARO ROAST: Dark; SWISS WATER Decaf</aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.notEqual(p.fields.roast_level,'Dark');
 assert.ok(!/Dark Chocolate/i.test(p.fields.tasting_notes||''));
});
test('selected 420 direct text excludes absent or sibling-only labeled flavors',()=>{
 const source='<article class="product"><h3>TANZANIAN PEABERRY</h3>'+
  '<div class="product__description">COFFEE DETAILS FLAVOR NOTES Floral, Fruity, Berry REGION Africa ROAST Full City</div></article>';
 assert.equal(selectedDirect(source).own_facts,true);
 assert.equal(selectedDirect(source.replace('Floral, Fruity, Berry','UNPUBLISHED')).own_facts,false);
 assert.equal(selectedDirect('<article class="product"><div class="product__description">NO DETAILS</div></article>'+
  '<aside>FLAVOR NOTES Floral, Fruity, Berry ROAST Full City</aside>').own_facts,false);
});
test('420 canonical result rejects invented method, other nation, farmer, lot and conflicting selected category',()=>{
 const f={name:target.name,roaster:"Ahrre's Coffee Roastery",origin:'Tanzania',
  roast_level:'Medium-Dark',tasting_notes:'Floral, Fruity, Berry'};
 assert.ok(Object.values(canonical(f)).every(Boolean));
 assert.equal(canonical({...f,decaffeination_method:'Water Process'}).no_unpublished_decaf,false);
 assert.equal(canonical({...f,origin:'Kenya'}).tanzania,false);
 assert.equal(canonical({...f,roast_level:'Dark'}).full_city,false);
 assert.equal(canonical({...f,harvest_year:'2026'}).no_fabricated_lot,false);
 assert.equal(canonical({...f,producer:'Kenyan farmers'}).no_unrelated_grower,false);
});
function h3({name=target.name,id=7438983954689,handle='test',title=name,visible=name,
 cart='/cart/add',trackerId=id,formId=id,formProductId=id}={}){
 const section='sw-product-template';
 const tracker=JSON.stringify({p:'product',rtyp:'product',rid:trackerId,pageurl:'www.ahrre.com/products/'+handle});
 const product=JSON.stringify({id,title,handle,description:'Selected synthetic fixture'});
 return '<html><head><script id="__st">var __st='+tracker+';</script></head><body>'+
  '<div id="shopify-section-'+section+'"><div id="ProductSection" itemtype="http://schema.org/Product">'+
  '<div class="product-single"><div class="product-single__hero">'+
  '<h3 class="product-single__title" itemprop="name">'+visible+'</h3>'+
  '<form class="product-form--wide" action="'+cart+'" id="product_form_'+formId+'">'+
  '<input name="form_type" value="product"><input name="product-id" value="'+formProductId+'">'+
  '<input name="section-id" value="'+section+'"></form></div></div></div>'+
  '<script id="ProductJson-'+section+'" type="application/json">'+product+'</script></div></body></html>';
}
const identity=html=>selectedShopifyPurchaseH3Identity(html,{source_url:target.url,
 expected_name:target.name,parsed_name:target.name});
test('exact selected H3 source has purchase-bound identity, not SKU/SEO alone',()=>{
 assert.equal(identity(h3())?.method,'shopify_current_tracker_product_json_visible_h3_and_cart_form');
 for(const html of [h3({visible:'TANZANIAN PEABERRY KILIMANJARO'}),
  h3({title:'TANZANIAN PEABERRY KILIMANJARO'}),h3({handle:'tanzanian-peaberry-kilimanjaro'}),
  h3({trackerId:7438983954688}),h3({formProductId:7438983954688}),
  h3({formId:7438983954688}),h3({cart:'/other/cart'})])assert.equal(identity(html),null);
});
test('same merchant, shared product tag and similar SKU are not proof of chosen release',()=>{
 const sibling=h3({name:'TANZANIAN PEABERRY KILIMANJARO',handle:'tanzanian-peaberry-kilimanjaro'});
 assert.equal(identity(sibling),null);
 assert.equal(selectedShopifyPurchaseH3Identity(h3(),{source_url:
  'https://www.ahrre.com/products/tanzanian-peaberry-kilimanjaro',
  expected_name:target.name,parsed_name:target.name}),null);
});
test('unavailable exact source or nonselected H3 must not pass original case 420',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  assert.ok(requiredFocusedSourceFailures([420],[{number:420,status,parser_ok:false}])
   .some(x=>x.reason==='required_official_source_not_fetched'));
 }
 assert.ok(requiredFocusedSourceFailures([420],[{number:420,status:'FETCHED',parser_ok:true,
  selected_heading_identity_verified:false,add_coffee_ui_rendered:true,
  source_review_rendered:true}]).some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
