import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
const names={529:'EQUILIBRIO, Medium Roast, 12oz',530:'SUAVIDAD, Medium Roast, 12 oz'};
const row=n=>({number:n,status:'FETCHED',archived_coffee:names[n],parser_ok:true,
 selected_h1:[names[n]],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name:names[n]},
 add_coffee_ui_rendered:true,source_review_rendered:true});
test('both original selected H1s are exact and distinct',()=>{
 for(const n of [529,530])assert.deepEqual(selectedProductHeadings('<article><h1>'+names[n]+'</h1><aside><h1>Other coffee</h1></aside></article>')[0],names[n]);
 assert.notEqual(names[529],names[530]);
});
test('both original identity+parser+Add Coffee+Source Review receipts pass only when complete',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([529,530],[row(529),row(530)]),[]);
 for(const change of [{status:'UNAVAILABLE'},{status:'IDENTITY_MISMATCH'},{parser_ok:false},
 {selected_heading_identity_verified:false},{add_coffee_ui_rendered:false},{source_review_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([529,530],[row(529),{...row(530),...change}]).length,JSON.stringify(change));
 }
});
test('missing duplicate and swapped selected identities cannot certify both original cases',()=>{
 assert.ok(requiredFocusedSourceFailures([529,530],[row(529)]).length);
 assert.ok(requiredFocusedSourceFailures([529,530],[row(529),row(529)]).length);
 assert.ok(requiredFocusedSourceFailures([529,530],[row(529),{...row(530),selected_heading_identity_verified:false,current_fields:{name:names[529]}}]).length);
});
