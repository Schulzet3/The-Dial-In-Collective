import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedR431Failures as failures} from '../scripts/audit/issue33-r431-staccato-original354-check.mjs';
const chosen='Honduras Elvin Suazo Coffee Beans. La Paz, Honduras | Light Roast | Natural Process. This naturally processed coffee comes from producer Elvin Suazo and his family farm, Finca Rancho Escondido. Elvin grows trees at around 1,600 meters. This particular lot is composed of IHCAFE 90. Altitude: Approximately 1,600 MASL. Variety: IHCAFE 90. The farm cultivates Red Bourbon, Yellow Bourbon, Pacas, and IHCAFE 90. Tasting Notes: Bright Citrus, Subtle Blueberry, Sweet Finish. Harvest: December-March. V60 tasting anecdote about pineapple.';
const good={name:'Honduras Elvin Suazo Coffee Beans',roaster:'Staccato Roasters',origin:'La Paz, Honduras',
 producer:'Elvin Suazo',process:'Natural',roast_level:'Light',variety:'IHCAFE 90',
 elevation_m:'Approximately 1,600 MASL',tasting_notes:'Bright Citrus, Subtle Blueberry, Sweet Finish'};
const bad=(fields=good,text=chosen)=>failures(354,text,fields);
test('current chosen lot has direct identity, farm context and exact own specs',()=>assert.deepEqual(bad(),[]));
test('case number cannot be borrowed from another original',()=>assert.deepEqual(failures(353,chosen,good),['wrong_original603_coffee']));
test('renamed/replaced selected product is not accepted',()=>assert.ok(bad({...good,name:'Other coffee'}).includes('selected_h1_or_name_changed')));
test('chosen current source must literally mention lot-specific IHCAFE 90',()=>assert.ok(bad(good,chosen.replace('This particular lot is composed of IHCAFE 90','This particular lot is unknown')).some(x=>x.startsWith('current_selected_literal_missing_'))));
test('current chosen region is not generic Honduras-only or another country',()=>assert.ok(bad({...good,origin:'Honduras'}).includes('selected_origin_missing_or_borrowed')));
test('farmer and exact chosen selected light roast cannot be borrowed',()=>{
 assert.ok(bad({...good,producer:'Someone else'}).includes('selected_grower_missing_or_borrowed'));
 assert.ok(bad({...good,roast_level:'Medium'}).includes('selected_light_roast_missing'));
});
test('chosen natural method is not a farmwide process guess',()=>assert.ok(bad({...good,process:'Washed'}).includes('selected_green_process_not_natural')));
test('do not substitute farm-wide Bourbon/Pacas varieties for this IHCAFE 90 lot',()=>{
 for(const variety of ['Red Bourbon, Yellow Bourbon, Pacas, IHCAFE 90','Red Bourbon','Pacas'])
  assert.ok(bad({...good,variety}).includes('this_lot_ihcafe90_not_farmwide_bourbon_pacas_or_other_varieties'));
});
test('require direct labeled tasting list',()=>assert.ok(bad({...good,tasting_notes:'Bright Citrus, Subtle Blueberry'}).includes('selected_tasting_list_missing_sweet_finish')));
test('exclude roaster V60 tasting anecdote and unrelated farm trees from canonical tasting list',()=>{
 for(const word of ['pineapple','V60','banana','Red Bourbon'])
  assert.ok(bad({...good,tasting_notes:good.tasting_notes+', '+word}).some(x=>x.includes('leaked_into_tasting_list')));
});
test('harvest calendar is not a unique harvest release or lot id',()=>assert.ok(bad({...good,release_label:'December–March'}).includes('recurring_harvest_months_not_unique_release_or_lot')));
test('no invented decaf and no misattributed farm',()=>{
 assert.ok(bad({...good,decaffeination_method:'Water Process'}).includes('unpublished_decaf_method_invented'));
 assert.ok(bad({...good,farm:'Finca Elsewhere'}).includes('wrong_selected_farm'));
});
test('product source missing directly selected flavor makes afterproof fail closed',()=>assert.ok(bad(good,chosen.replace('Subtle Blueberry','Other Coffee')).some(x=>x.startsWith('current_selected_literal_missing_'))));
