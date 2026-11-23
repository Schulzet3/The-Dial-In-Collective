import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentOriginalR426Failures as problems} from '../scripts/audit/issue33-r426-kona180-leap194-check.mjs';

const blend='Lū‘au House Blend | 300g Tasting notes: Stone Fruits, Caramel, Cacao More About Lūʻau Origin : Various Varietal: Caturra, Typica, Castillo Elevation: 1300-1650 masl Process: Washed Lū‘au is our signature house blend coffee.';
const bf={name:'Lū‘au',roaster:'Kona Coffee Roasters',tasting_notes:'Stone Fruits, Caramel, Cacao',
  variety:'Caturra, Typica, Castillo',elevation_m:'1300-1650 masl',process:'Washed'};
const decaf='Decaf Coffee The SWISS WATER® Process is a 100% chemical free decaffeination process that delivers coffee that is caffeine-free while protecting the unique origin characteristics and flavor. Tasting Notes: characteristically smooth, mellow, and sweet, with a slight caramel note and pleasant acidity.';
const df={name:'Decaf Coffee',roaster:'Leap Coffee Roasters',
  tasting_notes:'characteristically smooth, mellow, and sweet, with a slight caramel note and pleasant acidity.',
  decaffeination_method:'Water Process'};
test('180 selected house blend own labeled tasting and direct bounded specs accepted',()=>{
 assert.deepEqual(problems(180,blend,bf),[]);
});
test('194 chosen decaf direct Swiss Water treatment separate from green processing',()=>{
 assert.deepEqual(problems(194,decaf,df),[]);
});
test('180 missing direct selected tasting label cannot be filled by menu and SEO',()=>{
 assert.ok(problems(180,blend.replace('Tasting notes:','Related products:'),bf)
  .includes('chosen_blend_direct_description_or_specs_missing'));
});
test('180 another origin is not imported from Kona in the roaster name',()=>{
 assert.ok(problems(180,blend,{...bf,origin:'Hawaii'})
  .includes('blend_unknown_origin_fabricated'));
});
test('180 missing published blend processing and elevation is a failed extraction',()=>{
 assert.ok(problems(180,blend,{...bf,process:'',elevation_m:''})
  .includes('chosen_blend_published_specs_omitted'));
});
test('194 generic Swiss Water roaster FAQ cannot stand in for chosen description',()=>{
 assert.ok(problems(194,decaf.replace('The SWISS WATER® Process','Our FAQ compares SWISS WATER® Process'),df)
  .includes('selected_decaf_direct_description_missing'));
});
test('194 the decaffeination method cannot be mislabeled green Washed',()=>{
 assert.ok(problems(194,decaf,{...df,process:'Washed'})
  .includes('unpublished_decaf_green_process_roast_origin_or_lot_invented'));
});
test('194 unsupported historical Medium roast is not carried into selected decaf',()=>{
 assert.ok(problems(194,decaf,{...df,roast_level:'Medium'})
  .includes('unpublished_decaf_green_process_roast_origin_or_lot_invented'));
});
test('194 missing explicitly named current Swiss Water method remains unresolved',()=>{
 assert.ok(problems(194,decaf,{...df,decaffeination_method:''})
  .includes('selected_named_swiss_water_method_omitted'));
});
test('194 unsupported other coffee and reviewer flavor is never certified',()=>{
 assert.ok(problems(194,decaf,{...df,tasting_notes:'customer reviewer says smooth mellow sweet caramel pleasant acidity'})
  .includes('other_coffee_or_review_notes_contamination'));
});
test('No generic release/roaster recipe extrapolation',()=>{
 assert.ok(problems(180,blend,{...bf,release_label:'2026 lot'})
  .includes('unpublished_lot_or_blend_decaf_invented'));
 assert.ok(problems(194,decaf,{...df,release_label:'2026 lot'})
  .includes('unpublished_decaf_green_process_roast_origin_or_lot_invented'));
});
