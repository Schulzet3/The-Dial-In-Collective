import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

const good=number=>({number,status:'FETCHED',parser_ok:true,add_coffee_ui_rendered:true,
 source_review_rendered:true,selected_price_badge_accepted:true});

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
 assert.match(source,/requiredFocusedSourceFailures\(targetNumbers,records\)/);
 assert.match(source,/if\(requiredSourceFailures\.length\)/);
 assert.match(source,/manual_certified:0/);
 assert.doesNotMatch(source,/records\.some\(x=>x\.status==='FETCHED'&&/);
});
