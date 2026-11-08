import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

const good=number=>({number,status:'FETCHED',parser_ok:true,add_coffee_ui_rendered:true,
 source_review_rendered:true,selected_price_badge_accepted:true,
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true});

test('required exact selected public probe accepts only all fetched, parsed, Add Coffee/source-review rendered',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([19,25],[good(19),good(25)]),[]);
 assert.deepEqual(requiredFocusedSourceFailures([19],[{...good(19),selected_price_badge_accepted:undefined}]),[]);
});

test('unavailable, thrown error, not fetched and identity-mismatched cases fail closed instead of false green',()=>{
 for(const status of ['UNAVAILABLE','ERROR','NOT_FETCHED','IDENTITY_MISMATCH']){
  const failures=requiredFocusedSourceFailures([19],[{...good(19),status}]);
  assert.equal(failures.length,1,status);
  assert.equal(failures[0].reason,'required_official_source_not_fetched');
  assert.equal(failures[0].status,status);
 }
});

test('fetched but invalid parser or missing Add Coffee/source-review or rejected price fails',()=>{
 for(const [field,value,reason] of [
  ['parser_ok',false,'selected_product_parser_not_verified'],
  ['add_coffee_ui_rendered',false,'add_coffee_preview_not_rendered'],
  ['source_review_rendered',false,'source_review_not_rendered'],
  ['selected_price_badge_accepted',false,'selected_price_badge_rejected']
 ]){
  const failures=requiredFocusedSourceFailures([19],[{...good(19),[field]:value}]);
  assert.ok(failures.some(x=>x.reason===reason),field);
 }
});

test('expected case missing, duplicate, or surplus cannot pass',()=>{
 assert.ok(requiredFocusedSourceFailures([19,25],[good(19)]).some(x=>x.reason==='case_missing_or_duplicated'));
 assert.ok(requiredFocusedSourceFailures([19],[good(19),good(19)]).some(x=>x.reason==='case_missing_or_duplicated'));
 assert.ok(requiredFocusedSourceFailures([19],[good(19),good(25)]).some(x=>x.reason==='unexpected_record_count'));
 assert.deepEqual(requiredFocusedSourceFailures([19],null),[{reason:'records_missing'}]);
});

test('the real focused public script invokes fail-closed predicate and keeps original603 automatic certification zero',()=>{
 const source=readFileSync(new URL('../scripts/audit/issue33-original603-focused-source-review.mjs',import.meta.url),'utf8');
 assert.match(source,/requiredFocusedSourceFailures\(targetNumbers,records,\{negativeIdentityNumbers\}\)/);
 assert.match(source,/if\(requiredSourceFailures\.length\)/);
 assert.match(source,/manual_certified:0/);
 assert.doesNotMatch(source,/records\.some\(x=>x\.status==='FETCHED'&&/);
});

test('present selected original heading must be exact-product identity, not an unverified empty/changed animated H1',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([247],[{...good(247),
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true}]),[]);
 for(const value of [false,null,undefined]){
  const failures=requiredFocusedSourceFailures([247],[{...good(247),
    selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:value}]);
  assert.ok(failures.some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 }
 assert.ok(requiredFocusedSourceFailures([247],[{...good(247),
  selected_h1_present_in_scoped_html:false,selected_heading_identity_verified:null}])
  .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 assert.deepEqual(requiredFocusedSourceFailures([480],[{...good(480),
  selected_h1_present_in_scoped_html:false,
  selected_page_h2:['Strawberry Fields Forever (seasonal release)'],
  selected_heading_identity_verified:true}]),[]);
});


test('explicit source-bound changed-product NEGATIVE proves current H1, never certifies archived original',()=>{
 const changed={...good(362),archived_coffee:'ethiopia sidama ayla bombe natural light roast',
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,
  selected_h1:['ethiopia guji hambela natural light roast'],
  current_fields:{name:'ethiopia guji hambela natural light roast'},original_product_not_certified:true};
 assert.deepEqual(requiredFocusedSourceFailures([362],[changed],{negativeIdentityNumbers:[362]}),[]);
 assert.ok(requiredFocusedSourceFailures([362],[changed]).some(x=>
  x.reason==='selected_original_product_heading_identity_unverified'));
 for(const modified of [
  {...changed,selected_heading_identity_verified:true},
  {...changed,selected_h1:['other product']},
  {...changed,current_fields:{name:changed.archived_coffee}},
  {...changed,selected_h1_present_in_scoped_html:false},
  {...changed,archived_coffee:''},
  {...changed,status:'ERROR'},
 ]){
  assert.ok(requiredFocusedSourceFailures([362],[modified],{negativeIdentityNumbers:[362]}).length>0);
 }
 assert.ok(requiredFocusedSourceFailures([376],[good(376)],{negativeIdentityNumbers:[362]})
  .some(x=>x.reason==='negative_identity_case_not_requested'));
 assert.deepEqual(requiredFocusedSourceFailures([376,380],[good(376),good(380)]),[]);
});

test('missing selected H1 and no bound product H2 must fail closed',()=>{
 for(const v of [null,undefined,false]){
  const failures=requiredFocusedSourceFailures([480],[{...good(480),
   selected_h1_present_in_scoped_html:false,selected_h1:[],selected_page_h2:[],
   selected_form_h2:[],selected_heading_identity_verified:v}]);
  assert.ok(failures.some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
 }
});
