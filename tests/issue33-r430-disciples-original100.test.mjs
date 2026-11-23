import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedR430Failures as errors} from '../scripts/audit/issue33-r430-disciples-original100-check.mjs';

const selected='Guatemala Honey Process - Organic Coffee Beans. Light roast and Honey Process. Single Origin Organic Guatemala coffee from Joyabaj, Quiché. Grown at altitudes between 1,300 and 2,000 meters and honey-processed. Tasting notes of cherry, malt, anise, and cinnamon. Why honey? Washed coffee is clean and classic. Natural keeps whole cherry on. Honey is the middle path.';
const fields={name:'Guatemala Honey Process - Organic Coffee Beans',origin:'Joyabaj, Quiché, Guatemala',
 process:'Honey',roast_level:'Light',elevation_m:'1300–2000 masl',
 tasting_notes:'cherry, malt, anise, cinnamon'};
test('selected #100 exact product direct facts pass, disregarding educational washed/natural',()=>assert.deepEqual(errors(100,selected,fields),[]));
test('unchanged official product title cannot be swapped for another coffee',()=>assert.ok(errors(100,selected,{...fields,name:'Other Guatemala'}).includes('changed_or_unmatched_selected_product_identity')));
test('selected precise Joyabaj Quiché geography cannot be replaced by country-only',()=>assert.ok(errors(100,selected,{...fields,origin:'Guatemala'}).includes('direct_selected_precise_origin_omitted')));
test('educational washed/natural coffee methods cannot supplant selected Honey',()=>{
 for(const process of ['Washed','Natural','Other/Unknown'])
  assert.ok(errors(100,selected,{...fields,process}).includes('selected_honey_method_misread_as_educational_washed_or_natural'));
});
test('explicit Light seller label cannot be lost or borrowed Medium',()=>{
 for(const roast_level of ['', 'Medium'])
  assert.ok(errors(100,selected,{...fields,roast_level}).includes('selected_explicit_light_roast_missing_or_wrong'));
});
test('all four direct selected flavor literals required',()=>assert.ok(errors(100,selected,{...fields,tasting_notes:'cherry, malt, anise'}).includes('selected_direct_taste_omitted_cinnamon')));
test('real selected source missing Joyabaj does not pass a guessed field',()=>assert.ok(errors(100,selected.replace('Joyabaj, Quiché','a generic Guatemala destination'),fields).includes('missing_selected_own_literal_joyabaj')));
test('1200/2000 altitude is not selected 1300/2000',()=>assert.ok(errors(100,selected,{...fields,elevation_m:'1200–2000'}).includes('selected_altitude_range_omitted_or_wrong')));
test('grower/cultivar/decaf/lot cannot be invented from roaster navigation',()=>{
 for(const key of ['producer','variety','decaffeination_method','release_label'])
  assert.ok(errors(100,selected,{...fields,[key]:'Not selected'}).includes('unpublished_product_grower_cultivar_decaf_or_lot_invented'));
});
test('html encoded accented region and old punctuation normalize without guessing',()=>{
 const encoded=selected.replace('Quiché','Quich&eacute;');
 assert.deepEqual(errors(100,encoded,fields),[]);
});
test('different original603 case is not silently certified',()=>assert.deepEqual(errors(394,selected,fields),['not_selected_original603_case']));
