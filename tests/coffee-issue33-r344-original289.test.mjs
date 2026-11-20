import test from 'node:test';
import assert from 'node:assert/strict';
import {selected289,selectedUrl,selectedName} from '../scripts/audit/issue33-r344-original289-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const story='<p>Rare, small-lot coffee with a delicate, tea-like body and vibrant notes of jasmine, bergamot, and stone fruit.</p>'+
 '<p>This Geisha offers a floral, jasmine-forward aroma with vibrant notes of bergamot, ripe stone fruit, and honeysuckle.</p>'+
 '<p>Tasting Notes: Acidity: Bright and citrusy; Body: Light and tea-like; Flavor: Jasmine, bergamot, and stone fruit; Finish: Long, delicate, and sweet.</p>'+
 '<p>Origin: Guatemala | Process: Washed | Altitude: 5,500+ feet | Variety: Geisha | Limited Edition</p>';
const page=(own=story,title=selectedName,more='')=>'<html><head><title>Other Dark Natural Roast</title></head>'+
 '<body><nav>Producer: Other Estate; Decaf: Swiss Water</nav><main><article class="product"><h1>'+title+
 '</h1><div class="product__description">'+own+'</div></article></main>'+more+'<footer>Dark Natural Decaf</footer></body></html>';
test('R344 exact current selected H1 and its own labeled flavor and process are distinct from narrative',()=>{
 const p=selected289(page());assert.equal(p.exact,true);assert.equal(p.selectedSpecs,true);assert.equal(p.labeledFlavor,true);
 assert.equal(p.ownDistinctContext,true);assert.equal(p.genericBody,true);
});
test('R344 unrelated product or recycled title cannot stand in for the selected coffee',()=>{
 assert.equal(selected289(page(story,'Colombia Medium Roast')).exact,false);
});
test('R344 sibling/SEO/footer cannot supply missing selected specs',()=>{
 const p=selected289(page('<p>No process published for this selected coffee.</p>',selectedName,'<aside>'+story+'</aside>'));
 assert.equal(p.selectedSpecs,false);assert.equal(p.labeledFlavor,false);
});
test('R344 tea-like body is not a Light roast classification, and unsupported private metadata stays blank',()=>{
 const p=extractPublicCoffeeFacts(page('<p>This coffee has a delicate, tea-like body.</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.roast_level&&!p.fields?.producer&&!p.fields?.decaffeination_method);
});
test('R344 selected literal Washed can be parsed without silently using nav Natural',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(p.fields?.process,'Washed');
 assert.ok(!p.fields?.producer&&!p.fields?.decaffeination_method);
});
test('R344 Add Coffee preview and Source Review require explicit user action, not save',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R344 exact official source is hard-required, and unavailable/identity/UI fail closed',()=>{
 const good={number:289,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,selected_h1:[selectedName],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([289],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([289],[bad]).length>0);
});
