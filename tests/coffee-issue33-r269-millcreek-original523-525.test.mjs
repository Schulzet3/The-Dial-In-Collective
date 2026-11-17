import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const cases=[{number:523,name:'Guatemalan'},{number:524,name:'Kona'},{number:525,name:'Mexican'}];
const row=c=>({number:c.number,archived_coffee:c.name,status:'FETCHED',parser_ok:true,selected_h1:[c.name],selected_heading_identity_verified:true,selected_h1_present_in_scoped_html:true,current_fields:{name:c.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('every original selected source requires uniquely matched live heading',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([523,524,525],cases.map(row)),[]);
 for(const c of cases)assert.ok(requiredFocusedSourceFailures([c.number],[{...row(c),selected_heading_identity_verified:false}]).length>0);
});
test('unavailable source or parser failure must fail closed',()=>{
 for(const c of cases){
  assert.ok(requiredFocusedSourceFailures([c.number],[{...row(c),status:'UNAVAILABLE'}]).length>0);
  assert.ok(requiredFocusedSourceFailures([c.number],[{...row(c),parser_ok:false}]).length>0);
 }
});
test('no preview or Source Review is never a verified extraction',()=>{
 for(const c of cases){
  assert.ok(requiredFocusedSourceFailures([c.number],[{...row(c),add_coffee_ui_rendered:false}]).length>0);
  assert.ok(requiredFocusedSourceFailures([c.number],[{...row(c),source_review_rendered:false}]).length>0);
 }
});
test('regular selected coffees cannot inherit unrelated decaf processing',()=>{
 for(const c of cases)assert.equal(inferDecaffeinationMethod({name:c.name,selectedMethod:'Swiss Water / Sugar Cane Process'}),'');
});
test('conflicting roast is reviewable, never automatic save',()=>{
 const p={ok:true,fields:{name:'Kona',tasting_notes:'nutty, earthy, citrus'},conflicts:['roast_level'],source_url:'https://www.millcreekcoffee.com/products/kona'};
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot(p));
});
