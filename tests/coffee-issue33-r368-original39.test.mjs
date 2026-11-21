import test from 'node:test';
import assert from 'node:assert/strict';
import {selected39,selectedName,selectedUrl,unsafe39Fields} from '../scripts/audit/issue33-r368-original39-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const direct='<p>We are thrilled to introduce our newest selection at Brewtus Roasting: Kenya AA!</p>'+
 '<p>To bring out its most intricate and bright characteristics, we have redone the profile to a Nordic roasting style. Sourced from the high-altitude hills surrounding Mount Kenya.</p>'+
 '<p>Tasting Notes:-Wine, Lemon, Grapefruit, and Cherry</p>'+
 '<p>This lot is fully washed and dried on raised beds, ensuring the cleanest expression of its unique varietals (SL28, SL34, and Ruiru 11).</p>';
const page=(title=selectedName,prose=direct,extra='')=>'<html><head><title>All coffees and roasts</title></head><body>'+
 '<nav>Kenya AB Nyeri Kiangundo Dark Decaf</nav><main><article class="product"><h1>'+title+'</h1>'+
 '<div class="product__description">'+prose+'</div></article></main>'+extra+
 '<footer>Light roast and seasonal programs</footer></body></html>';
test('original39 current selected product H1 and direct AA facts are real, archived AB slug is not lot proof',()=>{
 const r=selected39(page());assert.equal(r.identity,true);
 for(const k of ['selectedNowAA','explicitMountKenya','styleNotRoastScale','directSensory','directWashed','directVarieties'])
  assert.equal(r[k],true,k);
});
test('other-current-product heading is never original Kenya identity',()=>{
 assert.equal(selected39(page('Ethiopia Natural')).identity,false);
});
test('navigation and other coffee cannot supply missing selected AA',()=>{
 const changed=direct.replace('newest selection at Brewtus Roasting: Kenya AA!','newest selection!');
 assert.equal(selected39(page(selectedName,changed,'<aside>Kenya AA</aside>')).selectedNowAA,false);
});
test('related offer cannot establish the selected four tasting notes or wash process',()=>{
 const p=page(selectedName,direct.replace('Tasting Notes:-Wine, Lemon, Grapefruit, and Cherry','Tasting Notes:').replace('fully washed','gently dried'),
   '<aside>Wine, Lemon, Grapefruit, and Cherry. Fully washed.</aside>');
 assert.equal(selected39(p).directSensory,false);
 assert.equal(selected39(p).directWashed,false);
});
test('Nordic roasting style, URL AB/Nyeri/Kiangundo and unselected footer cannot become roast, farm or harvest facts',()=>{
 const good={name:selectedName,origin:'Mount Kenya, Kenya',process:'Washed',
   tasting_notes:'Wine, Lemon, Grapefruit, Cherry'};
 assert.equal(unsafe39Fields(good),false);
 for(const f of [{roast_level:'Light'},{producer:'Kiangundo Farmers'},{farm:'Nyeri Kiangundo'},
  {release_label:'2026'},{harvest_year:'2026'},{decaffeination_method:'Water Process'},
  {espresso_recipe:'18g to 36g'}, {process:'Natural'},{origin:'Nyeri, Ethiopia'},
  {tasting_notes:'wine, vanilla'}])
  assert.equal(unsafe39Fields({...good,...f}),true,JSON.stringify(f));
});
test('guard rejects UNAVAILABLE, wrong H1, missing actual parser and either no-save UI',()=>{
 const r={number:39,status:'FETCHED',archived_coffee:'Kenya',parser_ok:true,selected_h1:['Kenya'],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name:'Kenya'},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([39],[r]),[]);
 for(const changed of [{status:'UNAVAILABLE'},{selected_heading_identity_verified:false},
   {parser_ok:false},{add_coffee_ui_rendered:false},{source_review_rendered:false}])
   assert.ok(requiredFocusedSourceFailures([39],[{...r,...changed}]).length>0);
});
test('actual selected parser and no-save UI can be exercised without a live network request',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(r.ok,true);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:selectedUrl})?.type,'coffee_source_review');
});
