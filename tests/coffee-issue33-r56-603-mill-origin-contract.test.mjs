import test from 'node:test';
import assert from 'node:assert/strict';
import {R56_SELECTED,r56IdentityFailures,r56DryMillProvenance} from '../scripts/audit/issue33-r56-603-mill-origin-contract.mjs';
const s=R56_SELECTED;
const fixture=()=>({
 number:603,official_url:'https://'+s.host+s.path,final_url:'https://'+s.host+s.path,
 status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 selected_h1:[s.name],current_fields:{name:s.name,origin:'Nicaragua'},
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('R56 correct original603 selected source and actual Add Coffee review contract',()=>{
 assert.deepEqual(r56IdentityFailures(fixture()),[]);
});
test('R56 rejects wrong coffee, SEO-only, sibling URL, query, source and preview failures',()=>{
 const mutations=[
 r=>r.number=602,r=>r.official_url='https://wrong.example/products/x',
 r=>r.final_url+='?variant=old',r=>r.final_url='https://other.example/products/x',
 r=>r.selected_h1=['Related Coffee'],r=>r.selected_h1=[],
 r=>r.current_fields.name='Old SEO name',r=>r.selected_heading_identity_verified=false,
 r=>r.status='UNAVAILABLE',r=>r.parser_ok=false,
 r=>r.add_coffee_ui_rendered=false,r=>r.source_review_rendered=false
 ];
 for(const mutate of mutations){const r=fixture();mutate(r);
  assert.ok(r56IdentityFailures(r).length,JSON.stringify(r));
 }
});
test('R56 distinguishes current selected cooperative dry mill town from a growing farm',()=>{
 const mill='Initial processing happens on individual farms. Sun-drying and final processing takes place at the coop’s dry mill, Las Segovias, located in the town of Palacaguina.';
 assert.deepEqual(r56DryMillProvenance(mill),
  {selectedDryMillTown:true,expresslyGrownInThatTown:false});
 assert.equal(r56DryMillProvenance('Our coffee farms in Palacaguina produce the selected lot.').expresslyGrownInThatTown,true);
 assert.equal(r56DryMillProvenance('Origin Palacaguina, Nicaragua.').selectedDryMillTown,false);
 assert.equal(r56DryMillProvenance('Related coffee dry mill, Palacaguina.').expresslyGrownInThatTown,false);
});
