import test from 'node:test';
import assert from 'node:assert/strict';
import {selected15,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r361-original15-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const desc='<p>You asked and we answered -- a Gesha from our 2026 Good Food Awards producer, Lisandro Cardenas! Bursting with notes of cranberry and lychee with additional sweet notes of caramelized sugar.</p>'+
 '<p>A coffee-producer son, Lisandro has been around coffee his whole life and said he inherited being a producer from his father.</p>';
const page=(title='Last Roast!! '+selectedName,body=desc,extra='')=>'<html><head><title>Holiday Roast El Salvador Pacamara Black Honey | old stale SEO</title></head><body>'+
 '<nav>El Salvador Holiday Roast</nav><main><article class="product"><h1>'+title+'</h1>'+
 '<div class="product__description">'+body+'</div></article>'+extra+'</main><footer>Old holiday coffee</footer></body></html>';
test('R361 actual selected title and direct Beanstock Gesha producer/tasting description are required',()=>{
 const r=selected15(page());
 assert.equal(r.exact,true);assert.equal(r.currentNarrative,true);assert.equal(r.directTasting,true);
 assert.equal(r.directProducer,true);assert.equal(r.retiredHolidayNotEvidence,true);
 assert.equal(r.headings[0],'Last Roast!! '+selectedName);
});
test('R361 retired holiday handle and SEO cannot override actual selected Gesha H1',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.notEqual(norm(p.fields?.name),'holiday roast el salvador');
});
test('R361 archived identity mismatch fails selected original proof',()=>{
 assert.equal(selected15(page('El Salvador Pacamara Black Honey')).exact,false);
 assert.equal(selected15(page('Last Roast!! El Salvador Pacamara Black Honey')).exact,false);
 assert.equal(selected15(page('Last Roast!! '+selectedName+' (New Lot)')).exact,false);
});
test('R361 other-coffee notes in related cards never establish current direct flavor',()=>{
 const other='<aside><h2>Other product</h2><p>Notes of cranberry and lychee with caramelized sugar</p></aside>';
 const r=selected15(page(selectedName,desc.replace(/notes of cranberry and lychee/g,'different flavors'),other));
 assert.equal(r.directTasting,false);
});
test('R361 award-year text is not an approved release or crop-year assertion',()=>{
 const r=selected15(page());
 assert.equal(r.currentNarrative,true);
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.notEqual(p.fields?.release_label,'2026');
});
test('R361 one missing own product narrative cannot be filled from retired SEO',()=>{
 assert.equal(selected15(page(selectedName,'<p>Only a price and cart.</p>')).currentNarrative,false);
});
test('R361 official source failure and UI or selected identity failure remain hard FAIL',()=>{
 const good={number:15,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([15],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
   {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([15],[bad]).length>0);
});
test('R361 Add Coffee and Source Review remain suggestions and do not save',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
