import test from 'node:test';
import assert from 'node:assert/strict';
import {selected250} from '../scripts/audit/issue33-r339-original250-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Colombia Supremo Bucaramanga';
const url='https://orleanscoffee.com/product/colombia-supremo-bucaramanga-coffee';
const specs='<p>Colombia Supremo Bucaramanga is a medium roasted Arabica.</p><p>Region: Dept. of Santander</p><p>Altitude: 1,200 - 1,800 meters</p><p>Varieties: Caturra, Castillo, Catimor</p><p>Process: Washed</p><p>Drying: Sun-dried/ Patio</p><p>Notes: Sweet tart, peach, apricot</p><p>Flavor: Hints of tangerine, orange, notes of tobacco</p>';
const page=(body=specs,h1=name,extra='')=>'<html><main><article class="product"><h1>'+h1+'</h1><div class="product__description">'+body+'</div></article>'+extra+'</main></html>';
test('R339 own selected product contains two separately attributed literal flavor captions',()=>{
 const a=selected250(page());assert.equal(a.exact,true);
 for(const k of ['ownRoast','ownWashed','ownSantander','ownElevation','ownVarieties','ownNotes','ownFlavor','ownDrying'])assert.equal(a[k],true,k);
});
test('R339 wrong selected H1 is never accepted as archived Colombia Supremo',()=>{
 assert.equal(selected250(page(specs,'French Roast Sumatra')).exact,false);
});
test('R339 unrelated menu or footer cannot provide source-only second flavor caption',()=>{
 const x=selected250(page(specs.replace('<p>Flavor: Hints of tangerine, orange, notes of tobacco</p>',''),name,
 '<footer><p>Flavor: Hints of tangerine, orange, notes of tobacco</p></footer>'));
 assert.equal(x.ownFlavor,false);
});
test('R339 a different SKU may not borrow chosen product sensory words',()=>{
 const x=selected250(page('<p>Medium roast from Colombia.</p>',name,
 '<aside>'+specs+'</aside>'));assert.equal(x.ownFlavor,false);assert.equal(x.ownWashed,false);
});
test('R339 drying alone does not prove Washed processing',()=>{
 const x=selected250(page('<p>Drying: Sun-dried/ Patio</p>'));assert.equal(x.ownDrying,true);assert.equal(x.ownWashed,false);
});
test('R339 missing explicit roast does not become a roast from generic body prose',()=>{
 const p=extractPublicCoffeeFacts(page('<p>Medium body with balanced taste.</p>'),{source_url:url});
 assert.equal(p.ok,true);assert.ok(!p.fields?.roast_level);
});
test('R339 Add Coffee preview and Source Review remain separate from saving',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R339 any source challenge, heading mismatch or missing UI fails closed',()=>{
 const r={number:250,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([250],[r]),[]);
 for(const bad of [{...r,status:'UNAVAILABLE'},{...r,selected_heading_identity_verified:false},
 {...r,add_coffee_ui_rendered:false},{...r,source_review_rendered:false}]){
 assert.ok(requiredFocusedSourceFailures([250],[bad]).length);
 }
 assert.ok(requiredFocusedSourceFailures([250],[]).length);
});
