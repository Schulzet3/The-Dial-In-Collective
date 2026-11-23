import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedR434Failures as check} from '../scripts/audit/issue33-r434-south17-selected-check.mjs';
const direct='Rosé & Roots. Discover Rose & Roots, a 72-hour natural process coffee from Honduras Tres Pinos region. Expertly light roasted to highlight delicate floral and fruity notes, an enchanting aroma of strawberry and rose. Taste the complexity of strawberry jam and chocolate. Roasted by our co-owner Ashley to kick off the Pink Bucket Series, highlighting female Roasters.';
const good={name:'Rosé & Roots',roaster:'South 17 Roasters',origin:'Tres Pinos, Honduras',
 process:'Natural',roast_level:'Light',tasting_notes:'strawberry jam and chocolate',release_label:'Pink Bucket Series'};
const fails=(delta={},source=direct)=>check(source,{...good,...delta});
test('original 345 accepts only exact chosen primary description, not generic metadata',()=>assert.deepEqual(fails(),[]));
test('wrong product title is rejected even if some fields seem compatible',()=>assert.ok(fails({name:'Ambition'}).includes('wrong_or_recycled_selected_product')));
test('selected H1 and direct literal both required',()=>assert.ok(fails({},direct.replace(/Rosé & Roots|Rose & Roots/g,'Ambition')).includes('wrong_or_recycled_selected_product')));
test('current direct South 17 source has explicit fermentation, not unique harvest',()=>assert.ok(fails({},direct.replace('72-hour natural process','washed process')).includes('selected_product_direct_literal_missing_72_hour_natural_process')));
test('invented coffee origin fails',()=>assert.ok(fails({origin:'Brazil'}).includes('selected_honduras_tres_pinos_origin_missing')));
test('neighboring same-roaster Sumatra/Dark Raine flavors do not transfer',()=>assert.ok(fails({tasting_notes:'strawberry jam and chocolate, sweet tobacco'}).some(x=>x.startsWith('neighbor_product_flavor_leak'))));
test('selected natural processing cannot be changed to washed',()=>assert.ok(fails({process:'Washed'}).includes('selected_natural_processing_wrong')));
test('direct selected light roast cannot be overwritten with other SKU roast',()=>assert.ok(fails({roast_level:'Dark'}).includes('direct_light_roast_missing_or_swapped')));
test('selected strawberry jam and chocolate both required',()=>assert.ok(fails({tasting_notes:'strawberry jam'}).includes('direct_selected_taste_missing_chocolate')));
test('female roaster is not producer of green coffee',()=>assert.ok(fails({producer:'Ashley'}).includes('female_roaster_wrongly_assigned_as_green_producer')));
test('72-hour fermentation is not Water Process decaffeination',()=>assert.ok(fails({decaffeination_method:'Water Process'}).includes('invented_decaf_from_72_hour_fermentation')));
test('a fermentation duration is not a product release',()=>assert.ok(fails({release_label:'72 hour 2026'}).includes('fabricated_harvest_or_series_release')));
test('unpublished cultivar and altitude remain blank',()=>{
 assert.ok(fails({variety:'Caturra'}).includes('unpublished_cultivar_or_elevation_invented'));
 assert.ok(fails({elevation_m:'1400m'}).includes('unpublished_cultivar_or_elevation_invented'));
});
test('unpublished espresso dose/yield must not be silently imported',()=>assert.ok(fails({roaster_recipe:{dose_g:18,yield_g:36}}).includes('unpublished_espresso_recipe_invented')));
test('seller-selected Pink Bucket series can be reviewable when absent; other release is rejected',()=>{
 assert.deepEqual(fails({release_label:''}),[]);
 assert.ok(fails({release_label:'Fall 2026'}).includes('fabricated_harvest_or_series_release'));
});
test('source must retain actual own selected Pink Bucket series text',()=>assert.ok(fails({},direct.replace('Pink Bucket Series','Other Series')).includes('selected_product_direct_literal_missing_pink_bucket_series')));
