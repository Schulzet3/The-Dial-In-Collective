import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWestrockFailures as problems,selectedWestrockProductJsonRoast as roastProof} from '../scripts/audit/issue33-r427-westrock322-323-check.mjs';

const campo="Raiz Campo Sur Whole Bean Coffee Pack SKU#: 37096. Campo sur is inspired by the Brazilian countryside where the majority of the world's coffee is grown. What's better than spending your morning overlooking the countryside with a warm cup of rich coffee in your hands watching the sun rise over the hills.";
const cb={name:'Raiz Campo Sur Whole Bean Coffee Pack',roast_level:'Medium'};
const palmera="Raiz Palmera Whole Bean Coffee Pack SKU#: 37095. Palmera reminds us of those warm, sunny days with a cool breeze. This 100% Central/South American Arabica is blended for a medium roast and body, with a nice sweet caramel flavor, and a nutty lingering finish that is perfect for your iced or hot drinks.";
const pb={name:'Raiz Palmera Whole Bean Coffee Pack',origin:'Central America, South America',
  roast_level:'Medium',tasting_notes:'sweet caramel, nutty'};

test('322 seller Brazilian countryside is inspiration not bean origin',()=>{
  assert.deepEqual(problems(322,campo,cb),[]);
});
test('323 exact selected multi-region blend Medium and caramel nutty finish',()=>{
  assert.deepEqual(problems(323,palmera,pb),[]);
});
test('322 Brazil cannot be inherited as origin from marketing country',()=>{
  assert.ok(problems(322,campo,{...cb,origin:'Brazil'})
    .includes('brazilian_inspiration_falsely_mapped_as_bean_origin'));
});
test('322 invented farm or process is not in this selected description',()=>{
  assert.ok(problems(322,campo,{...cb,process:'Natural',producer:'Brazilian countryside'})
    .includes('unpublished_campo_sur_selected_coffee_spec_invented'));
});
test('322 coffee adjective and neighboring Palmera flavor cannot be imported',()=>{
  assert.ok(problems(322,campo,{...cb,tasting_notes:'caramel, nutty'})
    .includes('foreign_flavor_or_adjective_as_campo_sur_tasting_notes'));
});
test('322 merchant identity must not be replaced with neighboring blend',()=>{
  assert.ok(problems(322,palmera,cb)
    .includes('selected_campo_sur_marketing_context_not_confirmed'));
});
test('323 missing own nutty finish is a selected source omission',()=>{
  assert.ok(problems(323,palmera,{...pb,tasting_notes:'sweet caramel'})
    .includes('direct_selected_caramel_or_nutty_finish_omitted'));
});
test('323 generic Medium body is not enough without selected Medium roast',()=>{
  const altered=palmera.replace('medium roast and body','medium body');
  assert.ok(problems(323,altered,pb)
    .includes('selected_palmera_region_roast_or_sensory_description_missing'));
});
test('323 published broad regions cannot become a guessed single country',()=>{
  assert.ok(problems(323,palmera,{...pb,origin:'Brazil'})
    .includes('selected_multi_region_origin_lost_or_country_invented'));
});
test('323 current selected Medium cannot be guessed Dark',()=>{
  assert.ok(problems(323,palmera,{...pb,roast_level:'Dark'})
    .includes('direct_selected_medium_roast_omitted_or_wrong'));
});
test('323 selected product cannot borrow another lot or a grower',()=>{
  assert.ok(problems(323,palmera,{...pb,producer:'S&D',release_label:'2026 crop'})
    .includes('unpublished_palmera_producer_process_lot_or_elevation'));
});
test('323 source must retain both exact description and correct chosen identity',()=>{
  assert.ok(problems(323,campo,{...pb,name:'Raiz Campo Sur Whole Bean Coffee Pack'})
    .includes('selected_product_identity_not_proven'));
});
test('322 and 323 seller review and other product contamination forbidden',()=>{
  assert.ok(problems(323,palmera,{...pb,tasting_notes:'customer review sweet caramel nutty'})
    .includes('other_product_or_review_as_selected_tasting'));
});
test('Neither unrelated corpus index nor invalid coffee number qualifies',()=>{
  assert.deepEqual(problems(324,palmera,pb),['unknown_original603_case']);
});

const mkShopify=(id,title,handle,tag='Medium Roast',vendor='S&D Coffee & Tea')=>
  '<script type="application/json" id="ProductJson-'+id+'">'+JSON.stringify({
    id,title,handle,vendor,tags:['Coffee',tag,'Sustainability']})+'</script>';
const opts={name:'Raiz Campo Sur Whole Bean Coffee Pack',roaster:'S&D Coffee & Tea',
  source_url:'https://shop.westrockcoffee.com/products/raiz-campo-sur-whole-bean-coffee'};
test('322 matching selected ProductJson tag, vendor, handle, unique id proves Medium',()=>{
  assert.deepEqual(roastProof(mkShopify(7151264497851,opts.name,
    'raiz-campo-sur-whole-bean-coffee'),opts),{
      value:'Medium',source:'exact_selected_shopify_ProductJson_id_title_handle_vendor_tags',
      product_id:7151264497851});
});
test('322 another product handle and mismatched vendor cannot borrow Medium',()=>{
  assert.equal(roastProof(mkShopify(7151264497851,opts.name,'palmera'),opts),null);
  assert.equal(roastProof(mkShopify(7151264497851,opts.name,
    'raiz-campo-sur-whole-bean-coffee','Medium Roast','Other Coffee'),opts),null);
});
test('322 altered product id and contradictory roast tags fail closed',()=>{
  assert.equal(roastProof(mkShopify(123,opts.name,
    'raiz-campo-sur-whole-bean-coffee').replace('ProductJson-123','ProductJson-456'),opts),null);
  assert.equal(roastProof(mkShopify(123,opts.name,'raiz-campo-sur-whole-bean-coffee')
    .replace('"Sustainability"','"Dark Roast"'),opts),null);
});
test('322 no chosen Medium or duplicated matching inline ProductJson is not proof',()=>{
  assert.equal(roastProof(mkShopify(123,opts.name,
    'raiz-campo-sur-whole-bean-coffee','Medium Body'),opts),null);
  const a=mkShopify(123,opts.name,'raiz-campo-sur-whole-bean-coffee');
  assert.equal(roastProof(a+a,opts),null);
});
test('322 canonical Medium must exist alongside the exact literal tag',()=>{
  assert.ok(problems(322,campo,{...cb,roast_level:''})
    .includes('selected_campo_sur_exact_product_tag_roast_omitted_or_wrong'));
});
