import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedKatiDirectFailures} from '../scripts/audit/issue33-r424-kati173-174-check.mjs';
test('current own Tanzania Medium and three named notes accepted',()=>{
 const t='TANZANIA Peaberry Roast Level: Medium Tasting Notes: Blackberry, Nutmeg, and Floral';
 assert.deepEqual(selectedKatiDirectFailures(174,t,{name:'TANZANIA Peaberry',roast_level:'Medium',tasting_notes:'Blackberry, Nutmeg, Floral'}),[]);
});
test('archived lighter roast cannot overwrite exact current Medium',()=>{
 const t='TANZANIA Peaberry Roast Level: Medium Tasting Notes: Blackberry, Nutmeg, and Floral';
 assert.ok(selectedKatiDirectFailures(174,t,{roast_level:'Light',tasting_notes:'Blackberry, Nutmeg, Floral'}).includes('current_seller_medium_not_retained_or_stale_lighter'));
});
test('other product and customer review notes are rejected',()=>{
 const t='PAPUA NEW GUINEA Highlands Roast Level: Darker Tasting Notes: Dark Chocolate, Black Cherry, and Mild Spice';
 assert.ok(selectedKatiDirectFailures(173,t,{tasting_notes:'Dark Chocolate, Black Cherry, Mild Spice, Caramel'}).includes('shopper_review_or_other_coffee_sensory_contamination'));
});
test('unpublished producer and espresso processing are not inferred',()=>{
 const t='PAPUA NEW GUINEA Highlands Roast Level: Darker Tasting Notes: Dark Chocolate, Black Cherry, and Mild Spice';
 assert.ok(selectedKatiDirectFailures(173,t,{tasting_notes:'Dark Chocolate, Black Cherry, Mild Spice',producer:'customer reviewer'}).includes('unpublished_grower_elevation_variety_process_release_decaf'));
});
test('selected seller notes must be present even if archived metadata matches',()=>{
 assert.ok(selectedKatiDirectFailures(174,'TANZANIA Peaberry Roast Level: Medium',{roast_level:'Medium',tasting_notes:'Blackberry, Nutmeg, Floral'}).includes('seller_direct_tasting_not_printed'));
});
