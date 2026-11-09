import test from 'node:test';
import assert from 'node:assert/strict';
import {R51_EXACT_SOURCE_CASES,selectedR51CaseFailures} from '../scripts/audit/issue33-r51-selected-product-contract.mjs';
const good=s=>({
 number:s.number,official_url:'https://'+s.host+s.path,final_url:'https://'+s.host+s.path,
 status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 current_fields:{name:s.name,process:s.process},conflicts:[],
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('R51 three distinct original selected processes require actual selected identity and review',()=>{
 for(const s of R51_EXACT_SOURCE_CASES)assert.deepEqual(selectedR51CaseFailures(good(s),s),[]);
});
test('R51 fail closed on meta/SEO-only identity, recycled URL, different coffee, missing/contradictory process or absent review',()=>{
 const s=R51_EXACT_SOURCE_CASES[0];
 for(const [mutate,reason] of [
  [r=>{r.selected_heading_identity_verified=false},'current_selected_product_identity_unverified'],
  [r=>{r.final_url='https://www.thecoffeeexchange.com/products/other-coffee'},'redirect_or_identity_page_changed'],
  [r=>{r.current_fields.name='Unrelated Decaf'},'current_product_name_changed'],
  [r=>{delete r.current_fields.process},'selected_literal_process_missing_or_changed'],
  [r=>{r.current_fields.process='Washed'},'selected_literal_process_missing_or_changed'],
  [r=>{r.conflicts=['process']},'contradictory_selected_process'],
  [r=>{r.source_review_rendered=false},'add_coffee_or_source_review_not_exercised'],
  [r=>{r.parser_ok=false},'actual_selected_source_or_parser_unverified']
 ]){const r=good(s);mutate(r);assert.ok(selectedR51CaseFailures(r,s).some(v=>v.startsWith(reason)),reason);}
});
test('R51 one correct roaster does not certify another coffee or another process',()=>{
 for(const a of R51_EXACT_SOURCE_CASES)for(const b of R51_EXACT_SOURCE_CASES){
  if(a.number===b.number)continue;
  assert.ok(selectedR51CaseFailures(good(b),a).length>0);
 }
});
