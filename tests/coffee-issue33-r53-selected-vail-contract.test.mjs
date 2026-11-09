import test from 'node:test';
import assert from 'node:assert/strict';
import {R53_EXACT_CASES,selectedR53Failures} from '../scripts/audit/issue33-r53-selected-vail-contract.mjs';
const good=s=>({number:s.number,official_url:'https://'+s.host+s.path,
 final_url:'https://'+s.host+s.path,status:'FETCHED',parser_ok:true,
 selected_heading_identity_verified:true,current_fields:{name:s.selected},
 add_coffee_ui_rendered:true,source_review_rendered:true});
test('R53 scoped Vail products keep distinct exact current original identities',()=>{
 for(const spec of R53_EXACT_CASES)assert.deepEqual(selectedR53Failures(good(spec),spec),[]);
 for(const a of R53_EXACT_CASES)for(const b of R53_EXACT_CASES){
  if(a.number!==b.number)assert.ok(selectedR53Failures(good(b),a).length);
 }
});
test('R53 fails closed for sibling/redirect/changed product, unverifiable source, UI or source review',()=>{
 const s=R53_EXACT_CASES[0];
 const mutations=[
  r=>r.current_fields.name='Decaf Ethiopian Yirgacheffe SW',
  r=>r.official_url='https://www.vailcoffee.com/products/reserve-coffee-4',
  r=>r.final_url='https://www.vailcoffee.com/products/reserve-coffee-4',
  r=>r.final_url='http://www.vailcoffee.com/products/reserve-coffee-3',
  r=>r.final_url+='?variant=unverified',
  r=>r.selected_heading_identity_verified=false,
  r=>r.parser_ok=false,
  r=>r.status='UNAVAILABLE',
  r=>r.add_coffee_ui_rendered=false,
  r=>r.source_review_rendered=false,
  r=>r.original_product_not_certified=true
 ];
 for(const mutate of mutations){const r=good(s);mutate(r);assert.ok(selectedR53Failures(r,s).length);}
});
test('R53 accepts formatting-only whitespace while rejecting changed product identity',()=>{
 const s=R53_EXACT_CASES[0],r=good(s);
 r.current_fields.name='Honduras Finca Quebrada Onda  - HONEY';
 assert.deepEqual(selectedR53Failures(r,s),[]);
 r.current_fields.name='Honduras Finca Quebrada Onda - NATURAL';
 assert.ok(selectedR53Failures(r,s).includes('current_selected_name_mismatch_590'));
});
