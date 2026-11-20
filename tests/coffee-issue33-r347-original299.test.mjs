import test from 'node:test';
import assert from 'node:assert/strict';
import {selected299,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r347-original299-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const own='<p>This coffee is grown by a highly knowledgeable multi-generational Brazilian family in the Minas Gerais region of North Eastern Brazil.</p>'+
 '<p>These farmers combine modern eco-friendly coffee production methods with traditional water-friendly processing to produce sweet, clean, and heavy-bodied coffee.</p>'+
 '<p>We like to brew this coffee to highlight the delicate notes of cherry and milk chocolate, but it can also be prepared as a nutty and creamy single-origin espresso.</p>';
const page=(body=own,title=selectedName,elsewhere='')=>'<html><head><title>Other Coffee Washed Dark</title></head><body>'+
 '<nav>Roast Level: Medium; Process: Washed; Producer: Other Farmer</nav><main><article class="product"><h1>'+title+
 '</h1><div class="product__description">'+body+'</div></article></main>'+elsewhere+
 '<footer>Roast Level: Dark; Process: Natural; Origin: Peru</footer></body></html>';
test('R347 selected original #299 product description direct and exact H1',()=>{
 const s=selected299(page());assert.equal(s.exact,true);assert.equal(s.ownDescription,true);
 assert.equal(s.literalProcess,false);assert.equal(s.literalRoast,false);
});
test('R347 wrong selected H1 cannot pass even if notes and product prose match',()=>{
 assert.equal(selected299(page(own,'A different coffee')).exact,false);
});
test('R347 sibling product cannot supply chosen flavor/process/roast evidence',()=>{
 const s=selected299(page('<p>Selected product has no printed description.</p>',selectedName,'<aside>'+own+'</aside>'));
 assert.equal(s.ownDescription,false);
});
test('R347 water-friendly production wording does not establish a Washed process',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.process),'washed');
});
test('R347 selected description has no actual Medium roast label',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.roast_level),'medium');
});
test('R347 unnamed multigenerational family is not an identified named producer',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.producer||!/multi.generational|highly knowledgeable/i.test(p.fields.producer));
});
test('R347 actual selected direct sensory notes and no-save Add Coffee preview/review',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});assert.equal(p.ok,true);
 assert.ok(['cherry','milk chocolate'].every(x=>norm(p.fields?.tasting_notes).includes(x)));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R347 required original source identity and UI failures cannot be green',()=>{
 const good={number:299,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([299],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([299],[bad]).length>0);
 }
});
