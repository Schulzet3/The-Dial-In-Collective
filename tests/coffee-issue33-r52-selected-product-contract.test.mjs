import test from 'node:test';
import assert from 'node:assert/strict';
import {R52_EXACT_SOURCE_CASES,selectedR52CaseFailures} from '../scripts/audit/issue33-r52-selected-product-contract.mjs';
const good=s=>({number:s.number,official_url:'https://'+s.host+s.path,final_url:'https://'+s.host+s.path,
 status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 current_fields:{name:s.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('R52 only exact three original current selected identities are accepted',()=>{
 for(const spec of R52_EXACT_SOURCE_CASES)assert.deepEqual(selectedR52CaseFailures(good(spec),spec),[]);
});
test('R52 rejects mismatched identity, adjacent coffee, redirect, missing source/parser or unreviewed Add Coffee',()=>{
 const spec=R52_EXACT_SOURCE_CASES[0];
 for(const [alter,label] of [
  [r=>r.final_url='https://www.unlockedcoffee.com/products/honey-sky','selected_url_or_redirect_changed'],
  [r=>r.final_url='http://www.unlockedcoffee.com/products/dedication-costa-rica','selected_url_or_redirect_changed'],
  [r=>r.current_fields.name='Honey Sky- Mexico, Chiapas','current_product_name_changed'],
  [r=>r.selected_heading_identity_verified=false,'selected_visible_identity_not_verified'],
  [r=>r.status='UNAVAILABLE','source_or_real_parser_not_verified'],
  [r=>r.parser_ok=false,'source_or_real_parser_not_verified'],
  [r=>r.source_review_rendered=false,'add_coffee_or_source_review_not_exercised'],
  [r=>r.add_coffee_ui_rendered=false,'add_coffee_or_source_review_not_exercised'],
  [r=>r.original_product_not_certified=true,'negative_identity_exception']
 ]){const rec=good(spec);alter(rec);assert.ok(selectedR52CaseFailures(rec,spec).some(x=>x.startsWith(label)),label);}
});
test('R52 one current roaster product never certifies a sibling product',()=>{
 for(const spec of R52_EXACT_SOURCE_CASES)for(const sibling of R52_EXACT_SOURCE_CASES){
  if(spec.number!==sibling.number)assert.ok(selectedR52CaseFailures(good(sibling),spec).length);
 }
});
