import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedKingsPeakDirectFailures as problems} from '../scripts/audit/issue33-r425-kingspeak176-177-check.mjs';

const mexico='Mexico Finca Santa Cruz Geisha Single Origin: Chiapas Region Producer: José Argüello Tasting Notes: Sweet berries, Honey & Fig This coffee was allowed to ferment in cherry for up to 200 hours before being washed';
const mx={name:'Mexico Finca Santa Cruz Geisha',origin:'Chiapas, Mexico',process:'Washed',
 producer:'José Argüello',variety:'Geisha',tasting_notes:'Sweet berries, Honey & Fig'};
const nicaragua='Nicaragua La Bastilla Coffee Estates Process: Natural Varietal: Catuai & Caturra Tasting Notes: Strawberries & Honey This coffee comes from the La Bastilla farm in the Jinotega region of Nicaragua and we roasted this light';
const ni={name:'Nicaragua La Bastilla Coffee Estates',origin:'Jinotega, Nicaragua',
 producer:'La Bastilla farm',process:'Natural',variety:'Catuai & Caturra',
 tasting_notes:'Strawberries & Honey',roast_level:'Light'};
test('176 direct seller selected current Mexican geisha passes, not stale URL label',()=>{
 assert.deepEqual(problems(176,mexico,mx),[]);
});
test('177 selected La Bastilla natural process and named farm pass',()=>{
 assert.deepEqual(problems(177,nicaragua,ni),[]);
});
test('archived Nayarit slug is not direct selected process',()=>{
 assert.ok(problems(176,mexico,{...mx,process:'Anaerobic'}).includes('direct_processing_not_retained'));
});
test('stale Finca Idealista title cannot replace current La Bastilla',()=>{
 assert.ok(problems(177,nicaragua,{...ni,name:'Nicaragua Finca Idealista'})
  .includes('selected_current_coffee_identity'));
});
test('other-coffee tasting notes cannot certify source-blank selected notes',()=>{
 assert.ok(problems(176,mexico.replace('Tasting Notes: Sweet berries, Honey & Fig',''),mx)
  .includes('direct_mx_specs_missing'));
});
test('unpublished Mexican roast or elevation must remain blank',()=>{
 const f=problems(176,mexico,{...mx,roast_level:'Medium',elevation_m:'2000'});
 assert.ok(f.includes('unpublished_mexico_roast_assumed'));
 assert.ok(f.includes('unpublished_elevation_decaf_or_lot_inferred'));
});
test('process and roast of Nicaragua cannot be borrowed from another product',()=>{
 assert.ok(problems(177,nicaragua,{...ni,process:'Washed',roast_level:'Dark'})
  .includes('direct_processing_not_retained'));
});
test('individual grower is not manufactured from La Bastilla farm',()=>{
 assert.ok(problems(177,nicaragua,{...ni,producer:'John Doe'})
  .includes('current_farm_variety_or_direct_light_missing'));
});
test('unpublished espresso recipe is not in selected field acceptance',()=>{
 assert.ok(problems(177,nicaragua,{...ni,release_label:'2026 crop'})
  .includes('unpublished_elevation_decaf_or_lot_inferred'));
});
