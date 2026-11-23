import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedR433Failures as check} from '../scripts/audit/issue33-r433-duesouth-selected-check.mjs';
const samples={
 103:['Brazil | Cerrado Mineiro (formerly Paubrasil). Tasting Notes: Cocoa Nibs | Toasted Almond | Smooth. Producer: Various Producers. Region: Cerrado Mineiro, Brazil. Process: Natural. Variety: Various. Altitude 1100 Meters. Harvest: Year-round.',
 {name:'Brazil | Cerrado Mineiro (formerly Paubrasil)',roaster:'Due South Coffee Roasters',origin:'Cerrado Mineiro, Brazil',process:'Natural',variety:'Various',elevation_m:'1100 Meters',tasting_notes:'Cocoa Nibs, Toasted Almond, Smooth'}],
 104:['Colombia Aponte Reserve. Tasting Notes: Citrus | Red Apple | Cane Sugar. Producer: Inga Reserve. Region: Nariño, Colombia. Processing Method: Washed. Variety: Caturra. Elevation: 2050 masl.',
 {name:'Colombia Aponte Reserve',roaster:'Due South Coffee Roasters',origin:'Nariño, Colombia',producer:'Inga Reserve',process:'Washed',variety:'Caturra',elevation_m:'2050 masl',tasting_notes:'Citrus, Red Apple, Cane Sugar'}],
 105:['Selva Negra | Nicaragua. Tasting Notes: Red Apple | Citrus | Praline. Producer: The Kühl family. Region: Matagalpa, Nicaragua. Process: Washed. Variety: Caturra. Altitude 1220 MASL. The family uses a water-saving processing method.',
 {name:'Selva Negra | Nicaragua',roaster:'Due South Coffee Roasters',origin:'Matagalpa, Nicaragua',producer:'The Kühl family',process:'Washed',variety:'Caturra',elevation_m:'1220 MASL',tasting_notes:'Red Apple, Citrus, Praline'}]
};
for(const n of [103,104,105]){
 const [source,good]=samples[n],f=(delta,src=source)=>check(n,src,{...good,...delta});
 test('original '+n+' accepts only selected direct product fields',()=>assert.deepEqual(f({}),[]));
 test('original '+n+' rejects renamed product and wrong origin',()=>{
  assert.ok(f({name:'Different coffee'}).includes('wrong_selected_product_identity'));
  assert.ok(f({origin:'Unknown'}).some(x=>x.startsWith('wrong_or_missing_selected_origin')));
 });
 test('original '+n+' rejects missing own flavor and cross-coffee notes',()=>{
  assert.ok(f({tasting_notes:'Citrus'}).some(x=>x.startsWith('missing_selected_tasting_note')));
  assert.ok(f({tasting_notes:good.tasting_notes+', Other Coffee'}).includes('other_context_leaked_into_tasting'));
 });
 test('original '+n+' rejects fabricated harvest, roast and decaf',()=>{
  assert.ok(f({release_label:'2026'}).includes('historical_year_or_year_round_as_release'));
  assert.ok(f({roast_level:'Medium'}).includes('unpublished_roast_assigned_without_current_direct_source'));
  assert.ok(f({decaffeination_method:'Water Process'}).includes('water_saving_or_unpublished_decaf_invented'));
 });
 test('original '+n+' rejects undocumented producer and swapped green process',()=>{
  assert.ok(f({producer:'Other person'}).includes(n===103?'fabricated_single_brazil_grower':'producer_collective_or_family_misattributed'));
  assert.ok(f({process:'Natural'===good.process?'Washed':'Natural'}).includes('wrong_green_processing_or_water_saving_conflation'));
 });
}
test('other number and neighboring selected coffee cannot reuse original identities',()=>{
 assert.deepEqual(check(106,...samples[103]),['unknown_original603_case']);
 assert.ok(check(103,...samples[104]).includes('wrong_selected_product_identity'));
});
test('Brazil year-round must stay a calendar, not a lot or release',()=>{
 const [s,f]=samples[103];assert.deepEqual(check(103,s,f),[]);
 assert.ok(check(103,s,{...f,release_label:'Year-round'}).includes('historical_year_or_year_round_as_release'));
});
test('Colombia Aponte Inga Reserve is not a fabricated individual grower',()=>{
 const [s,f]=samples[104];assert.ok(check(104,s,{...f,producer:'Inga Farmer'}).includes('fabricated_individual_aponte_grower'));
});
test('Nicaragua water-saving farm paragraph cannot be marked Water Process decaf',()=>{
 const [s,f]=samples[105];assert.deepEqual(check(105,s,f),[]);
 assert.ok(check(105,s,{...f,process:'Water Process'}).includes('farm_water_conservation_misread_as_process'));
 assert.ok(check(105,s,{...f,decaffeination_method:'Water Process'}).includes('water_saving_or_unpublished_decaf_invented'));
});

test('selected literal Various Producers is source evidence only, not a named grower',()=>{
 const [selected,good]=samples[103];
 assert.ok(selected.includes('Producer: Various Producers'));
 assert.deepEqual(check(103,selected,good),[]);
 for(const invented of ['Various Producers','Farmer Smith'])
  assert.ok(check(103,selected,{...good,producer:invented}).includes('fabricated_single_brazil_grower'));
});
