import test from 'node:test';
import assert from 'node:assert/strict';
import {selected296,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r346-original296-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const own='<h2>House Blend</h2><h3>Flavor Notes</h3><p>Smooth, medium body</p>'+
 '<p>Light, fruit-sweet lift</p><p>Soft cocoa and toasted nut</p><p>Clean, balanced finish</p>'+
 '<h3>Roast Level</h3><p>Medium, balanced and approachable.</p><h3>Materials + Care</h3><p>Premium fabrics and shipping.</p>';
const page=(body=own,title=selectedName,elsewhere='')=>'<html><head><title>Other Coffee Dark Swiss Water</title></head><body>'+
 '<nav>Roast Level: Dark; Producer: Another Estate; Origin: Peru</nav><main><article class="product"><h1>'+title+
 '</h1><div class="product__description">'+body+'</div></article></main>'+elsewhere+
 '<footer>Roast Level: Light; Swiss Water</footer></body></html>';
test('R346 selected current exact House Blend H1 and own labeled sensory + roast',()=>{
 const x=selected296(page());assert.equal(x.exact,true);assert.equal(x.ownLabeledNotes,true);
 assert.equal(x.explicitMedium,true);assert.equal(x.adjectiveLight,true);
});
test('R346 wrong current selected coffee H1 fails regardless of matching product prose',()=>{
 assert.equal(selected296(page(own,'Not House Blend')).exact,false);
});
test('R346 only sibling notes cannot certify selected product',()=>{
 const x=selected296(page('<p>Selected product has no published tasting or roast specification.</p>',selectedName,'<aside>'+own+'</aside>'));
 assert.equal(x.ownLabeledNotes,false);assert.equal(x.explicitMedium,false);
});
test('R346 bare Light fruit adjective does not establish Light roast',()=>{
 const p=extractPublicCoffeeFacts(page('<p>Light, fruit-sweet lift and cocoa.</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.roast_level),'light');
});
test('R346 own Medium roast prevails over Light sensory and footer Dark',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.roast_level),'medium');
});
test('R346 no unsupported decaffeination/process/producer/variety from merchant navigation',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method&&!p.fields?.producer);
});
test('R346 Add Coffee preview and review are not a save or Verified promotion',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R346 original selected fetch and identity/UI are hard required and fail closed',()=>{
 const good={number:296,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,selected_h1:[selectedName],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([296],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([296],[bad]).length>0);
 }
});
