import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {normalizeExplicitCoffeeTastingNotes} from '../src/server/coffee-flavor-evidence.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const cases=[
 {n:520,name:'Ethiopia, Dry Processed - Sulladjah',flavors:['caramel','fig']},
 {n:521,name:'Colombia Select Decaf',flavors:['chocolate','ripe berries']},
 {n:522,name:'Ethiopia, Bishaan',flavors:['red fruit','starfruit']}
];
const row=({n,name})=>({
 number:n,archived_coffee:name,status:'FETCHED',parser_ok:true,
 selected_heading_identity_verified:true,selected_h1_present_in_scoped_html:true,
 selected_h1:[name+' Coffee Beans'],current_fields:{name:name+' Coffee Beans'},
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('three distinct original selected sources must each independently pass identity and preview gates',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([520,521,522],cases.map(row)),[]);
 for(const c of cases){
  const rows=cases.map(row).map(x=>x.number===c.n?{...x,selected_heading_identity_verified:false}:{...x});
  assert.ok(requiredFocusedSourceFailures([520,521,522],rows).some(x=>x.number===c.n&&x.reason==='selected_original_product_heading_identity_unverified'));
 }
});
test('missing source, changed selected coffee and missing Add Coffee/Source Review cannot be certified',()=>{
 const rows=cases.map(row);
 for(const c of cases){
  assert.ok(requiredFocusedSourceFailures([c.n],[{number:c.n,status:'UNAVAILABLE',parser_ok:false}]).some(x=>x.reason==='required_official_source_not_fetched'));
  assert.ok(requiredFocusedSourceFailures([c.n],[{...row(c),parser_ok:false}]).some(x=>x.reason==='selected_product_parser_not_verified'));
  assert.ok(requiredFocusedSourceFailures([c.n],[{...row(c),add_coffee_ui_rendered:false,source_review_rendered:false}]).some(x=>x.reason==='add_coffee_preview_not_rendered'));
 }
});
test('selected direct tasting notes are distinct, not sibling flavor or unsupported original blank fill',()=>{
 for(const c of cases){
  const note=normalizeExplicitCoffeeTastingNotes(c.flavors.join(', '));
  assert.ok(c.flavors.every(x=>note.toLowerCase().includes(x)),JSON.stringify({c,note}));
  const others=cases.filter(x=>x.n!==c.n).flatMap(x=>x.flavors);
  assert.ok(others.every(x=>!note.toLowerCase().includes(x)),JSON.stringify({c,note}));
 }
 assert.equal(normalizeExplicitCoffeeTastingNotes('Floral'), 'Floral');
 // A historically asserted "Floral" may be an intentional blank today when
 // selected current merchant only lists Caramel/Fig; do not append it.
 const current=normalizeExplicitCoffeeTastingNotes('Caramel, Fig');
 assert.doesNotMatch(current,/floral|starfruit|berries/i);
});
test('preview and Source Review remain explicit editable UI, not automatic Add Coffee',()=>{
 const preview={ok:true,fields:{name:'Colombia Select Decaf Coffee Beans',tasting_notes:'Chocolate, Ripe Berries',process:'Washed',decaffeination_method:'Sugar Process'},conflicts:[],source_url:'https://www.lineageroasting.com/products/decaf'};
 assert.ok(coffeeUrlPreviewMarkup(preview).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot(preview));
});
