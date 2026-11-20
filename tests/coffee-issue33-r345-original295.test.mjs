import test from 'node:test';
import assert from 'node:assert/strict';
import {selected295,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r345-original295-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const own='<h1>Gentle Cove Decaf</h1><p>This decaf is calm and easy, made from a pair of South American beans that naturally lean sweet and smooth. Full flavor, no caffeine, and nothing harsh.</p>'+
 '<h3>Flavor Notes</h3><p>• Smooth body with a soft, rounded feel</p><p>• Light caramel sweetness</p>'+
 '<p>• Gentle cocoa finish</p><p>• Balanced and comforting from start to finish</p>'+
 '<h3>Roast Level</h3><p>Medium, keeping things warm, sweet, and approachable.</p>'+
 '<h3>Materials + Care</h3><p>We prioritize quality in selecting the materials for our items.</p>';
const page=(body=own,title=selectedName,elsewhere='')=>'<html><head><title>Other Coffee Dark Natural Swiss Water</title></head><body>'+
 '<nav>Roast Level: Dark. Producer: Other Farm. Swiss Water Decaf.</nav>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+body+
 '</div></article></main>'+elsewhere+'<footer>Dark Swiss Water Decaf</footer></body></html>';
test('R345 selected product own H1, decaf, direct flavor bullet wording and Medium roast present',()=>{
 const r=selected295(page());
 assert.equal(r.exact,true);assert.equal(r.selectedDecaf,true);
 assert.equal(r.ownLabeledNotes,true);assert.equal(r.explicitMedium,true);assert.equal(r.ownBroadOrigin,true);
});
test('R345 different selected H1 is not certified by details label or nav',()=>{
 const r=selected295(page(own,'Not Gentle Cove'));
 assert.equal(r.exact,false);
});
test('R345 selected-scope negative excludes sibling flavor, roast and origin',()=>{
 const x=selected295(page('<p>No roast or flavor notes published for this chosen coffee.</p>',selectedName,
  '<aside>'+own+'</aside>'));
 assert.equal(x.ownLabeledNotes,false);assert.equal(x.explicitMedium,false);assert.equal(x.ownBroadOrigin,false);
});
test('R345 Light caramel phrase alone does not publish a Light roast',()=>{
 const p=extractPublicCoffeeFacts(page('<p>Flavor Notes: Light caramel sweetness and gentle cocoa finish.</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.roast_level),'light');
});
test('R345 explicitly published Medium prevails over Light adjective and unrelated nav Dark',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.roast_level),'medium');
 assert.ok(!p.fields?.producer&&!p.fields?.process);
});
test('R345 decaf description does not itself specify water, EA or sugar decaffeination method',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R345 Add Coffee/Source Review are diagnostic previews without automatic save',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R345 exact official URL is REQUIRED; unavailable, wrong identity and missing UI fail',()=>{
 const good={number:295,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,selected_h1:[selectedName],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([295],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,source_review_rendered:false},{...good,add_coffee_ui_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([295],[bad]).length>0);
 }
});
