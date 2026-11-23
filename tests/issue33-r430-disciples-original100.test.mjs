import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedR430Failures as errors} from '../scripts/audit/issue33-r430-disciples-original100-check.mjs';
import {selectedCurrentInlineShopifyRoastTag as selectedTag} from '../src/server/coffee-current-inline-shopify-product.mjs';

const name='Guatemala Honey Process - Organic Coffee Beans';
const url='https://disciplescoffee.com/products/guatemala';
const selected='Guatemala Honey Process - Organic Coffee Beans. Light roast and Honey Process. Single Origin Organic Guatemala coffee from Joyabaj, Quiché. Grown at altitudes between 1,300 and 2,000 meters and honey-processed. Tasting notes of cherry, malt, anise, and cinnamon. Why honey? Washed coffee is clean and classic. Natural keeps whole cherry on. Honey is the middle path.';
const fields={name,origin:'Joyabaj, Quiché, Guatemala',process:'Honey',
 elevation_m:'1300–2000 masl',tasting_notes:'cherry, malt, anise, cinnamon'};
const evidence={inlineRoast:'Medium',conflicts:['roast_level']};
const failures=(f=fields,e=evidence,s=selected)=>errors(100,s,f,e);
const product={id:10408978841896,title:name,handle:'guatemala',vendor:'Disciples Coffee',tags:['Roast:Medium']};
const markup=p=>'<h1>'+name+'</h1><p>Light roast and Honey Process</p><script>_RSConfig.product = '+JSON.stringify(p)+';</script>';
test('same chosen product: direct descriptions retained, actual Medium-vs-Light roast conflict stays blank',()=>assert.deepEqual(failures(),[]));
test('seller direct own roast prose cannot override conflicting exact selected Shopify tag',()=>{
 for(const roast_level of ['Light','Medium','Dark'])
  assert.ok(failures({...fields,roast_level}).includes('contradictory_selected_light_medium_roast_must_stay_blank'));
});
test('conflict must be exposed for manual review, not silently dropped',()=>{
 assert.ok(failures(fields,{inlineRoast:'Medium',conflicts:[]}).includes('selected_same_product_roast_disagreement_not_proven_and_reviewable'));
 assert.ok(failures(fields,{inlineRoast:null,conflicts:['roast_level']}).includes('selected_same_product_roast_disagreement_not_proven_and_reviewable'));
});
test('actual Shopify inline identity requires SAME seller title handle and vendor',()=>{
 assert.equal(selectedTag(markup(product),{name,roaster:'Disciples Coffee',source_url:url})?.value,'Medium');
 for(const mutated of [{...product,title:'Other Guatemala'},{...product,handle:'other'},{...product,vendor:'Other Coffee'},{...product,tags:['Roast:Light','Roast:Medium']}])
  assert.equal(selectedTag(markup(mutated),{name,roaster:'Disciples Coffee',source_url:url}),null);
});
test('current name or changed product fails rather than copying old fields',()=>assert.ok(failures({...fields,name:'Another coffee'}).includes('changed_or_unmatched_selected_product_identity')));
test('selected region Joyabaj Quiché cannot be replaced with country only',()=>assert.ok(failures({...fields,origin:'Guatemala'}).includes('direct_selected_precise_origin_omitted')));
test('Shopify taxonomy mentions Mexico but direct Guatemala bean origin excludes Mexico',()=>assert.ok(failures({...fields,origin:'Joyabaj, Quiché, Guatemala, Mexico'}).includes('shopify_product_tag_geography_not_chosen_bean_origin')));
test('educational Washed and Natural processes are not chosen Honey process',()=>{
 for(const process of ['Washed','Natural','Other/Unknown'])
  assert.ok(failures({...fields,process}).includes('selected_honey_method_misread_as_educational_washed_or_natural'));
});
test('all four direct chosen tasting notes required',()=>assert.ok(failures({...fields,tasting_notes:'cherry, malt, anise'}).includes('selected_direct_taste_omitted_cinnamon')));
test('product taxonomy alternative flavor catalog cannot contaminate direct selected description',()=>{
 for(const word of ['caramel','apricot','milk chocolate','lemon'])
  assert.ok(failures({...fields,tasting_notes:fields.tasting_notes+', '+word}).includes('shopify_taxonomy_flavor_from_different_or_unresolved_roast_tag_leak'));
});
test('absent actual seller Joyabaj claim cannot support guessed region',()=>assert.ok(failures(fields,evidence,selected.replace('Joyabaj, Quiché','a generic Guatemala destination')).includes('missing_selected_own_literal_joyabaj')));
test('altitude from direct prose 1300–2000 not selected tag 1400–1600',()=>assert.ok(failures({...fields,elevation_m:'1400–1600'}).includes('selected_altitude_range_omitted_or_wrong')));
test('no invented grower cultivar decaf or harvest lot',()=>{
 for(const key of ['producer','variety','decaffeination_method','release_label'])
  assert.ok(failures({...fields,[key]:'Not selected'}).includes('unpublished_product_grower_cultivar_decaf_or_lot_invented'));
});
test('HTML accent encoding remains supported without source substitution',()=>assert.deepEqual(failures(fields,evidence,selected.replace('Quiché','Quich&eacute;')),[]));
test('another original case cannot be silently accepted',()=>assert.deepEqual(errors(394,selected,fields,evidence),['not_selected_original603_case']));
