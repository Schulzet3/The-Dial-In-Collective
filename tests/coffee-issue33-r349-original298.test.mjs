import test from 'node:test';
import assert from 'node:assert/strict';
import {selected298,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r349-original298-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const body='<p>The flavor starts off with a dry nutty bite similar to almonds. Lingering brown sugar notes and a lovely slightly tart cherry flavor.</p>'+
 '<p>It is the kind of Central American coffee you like to start and end the day with.</p>'+
 '<p>This coffee is decaffeinated at origin in Colombia through what we loosely call "sugar process".</p>'+
 '<p>This Colombian coffee comes from the Department of Tolima and an association in Planadas of 39 small coffee growers.</p>';
const page=(description=body,title=selectedName,extra='')=>'<html><head><title>Other Coffee Peru Dark</title></head>'+
 '<body><nav>Other coffee roast: Dark; Process: Washed; Origin: Guatemala</nav><main><article class="product"><h1>'+title+
 '</h1><div class="product__description">'+description+'</div></article></main>'+extra+
 '<footer>Other Coffee honey processing and water decaf</footer></body></html>';
test('R349 actual chosen description identifies current Walia product rather than recycled slug',()=>{
 const s=selected298(page());
 assert.equal(s.exact,true);assert.equal(s.directlyColombian,true);assert.equal(s.sellerSugarProcess,true);
 assert.equal(s.directTastes,true);assert.equal(s.conflictingBroadReference,true);assert.equal(s.associationOf39,true);
 assert.equal(selectedUrl.includes('plandanas-reserve'),true);
});
test('R349 a changed product heading fails even when identical selected description appears',()=>{
 assert.equal(selected298(page(body,'Plandanas Reserve - another lot')).exact,false);
});
test('R349 competing product in footer/nav cannot provide chosen Colombian or sugar evidence',()=>{
 const s=selected298(page('<p>Different selected product with no facts.</p>',selectedName,'<aside>'+body+'</aside>'));
 assert.equal(s.directlyColombian,false);assert.equal(s.directTastes,false);assert.equal(s.sellerSugarProcess,false);
});
test('R349 literal Central American sensory comparison does not supply a coffee growing country',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);
 assert.ok(!/\bguatemala\b/i.test(p.fields?.origin||''));
});
test('R349 quoted sugar decaf method cannot be silently treated as coffee-cherry Washed process',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.process),'washed');
});
test('R349 broad descriptors do not falsely set a roast level',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});assert.equal(p.ok,true);
 assert.notEqual(norm(p.fields?.roast_level),'dark');
});
test('R349 real parser selected name and Add Coffee Source Review are no-save only',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R349 source unavailable identity mismatch or invisible UI cannot pass hard afterproof',()=>{
 const good={number:298,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([298],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,parser_ok:false},{...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([298],[bad]).length>0);
 }
});
