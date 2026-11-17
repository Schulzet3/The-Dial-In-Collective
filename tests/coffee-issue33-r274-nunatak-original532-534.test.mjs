import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCoffeeMilkSensoryContext} from '../src/server/coffee-selected-milk-sensory-context.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const ravenUrl='https://www.nunatakcoffee.com/products/raven-espresso';
const wildUrl='https://www.nunatakcoffee.com/products/blends';
const ravenStory="Straight shots mysteriously balance different worlds. They begin with a profound dark chocolate sweetness that is tamed with a velvet-like nuttiness, and end with a bright effervescent finish. Raven's brilliance is truly revealed when layered with milk, showcasing an artistic dance of creamy chocolate, blueberry preserves, and hazelnut liqueur.";
const wildStory="Untamed, yet restrained, Wild seeks to take you on a journey...somewhere new and different. After all, coffee doesn't have to taste ordinary. Jammy blueberry notes of our natural Ethiopia are intricately layered with the sweet pepper and subtle, ginger-like spice from our Sumatra. Proudly small batch roasted and hand blended.";
const clean=(s,max=6001)=>String(s).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const page=(name,story,related='')=>'<html><body><main><article class="product"><h1>'+name+'</h1><ul><li><p>Product Info</p>'+story+'</li></ul></article></main>'+related+'</body></html>';
const row=(number,name)=>({number,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('exact original identity and UI/Source Review fail closed for either selected product',()=>{
 const good=[row(532,'Wild'),row(534,'Raven Espresso')];
 assert.deepEqual(requiredFocusedSourceFailures([532,534],good),[]);
 for(const modification of [{status:'UNAVAILABLE'},{status:'IDENTITY_MISMATCH'},{parser_ok:false},{selected_heading_identity_verified:false},{source_review_rendered:false},{add_coffee_ui_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([532,534],[good[0],{...good[1],...modification}]).length,JSON.stringify(modification));
 assert.ok(requiredFocusedSourceFailures([532,534],[good[0]]).length);
 assert.ok(requiredFocusedSourceFailures([532,534],[good[0],good[0]]).length);
});
test('Raven selected straight-shot and milk-conditioned flavor sentences remain distinct',()=>{
 const html=page('Raven Espresso',ravenStory);
 const conditional=selectedCoffeeMilkSensoryContext(html,{name:'Raven Espresso',clean});
 assert.match(conditional,/Raven.s brilliance.*layered with milk.*blueberry preserves.*hazelnut liqueur/i);
 const r=extractPublicCoffeeFacts(html,{source_url:ravenUrl});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Raven Espresso');
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/blueberry preserves|hazelnut liqueur/i);
 assert.ok(r.source_facts?.some(f=>f.field==='sensory_context'&&f.label==='Selected product with-milk sensory description'&&/blueberry preserves/i.test(f.value)));
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:ravenUrl}));
});
test('milk qualification is not transferred from unrelated, historical or generic passages',()=>{
 const cases=[
  page('Raven Espresso','This is a normal selected coffee.', '<aside class="related-products"><h2>Other Coffee</h2><p>'+ravenStory+'</p></aside>'),
  page('Other Espresso',ravenStory),
  page('Raven Espresso',ravenStory.replace("Raven's brilliance","Dove's brilliance")),
  page('Raven Espresso',ravenStory.replace("Raven's brilliance is truly revealed","Last year Raven's brilliance was truly revealed")),
  page('Raven Espresso',"Raven's brilliance is hypothetical when layered with milk, showcasing blueberry preserves and hazelnut liqueur.")
 ];
 for(const html of cases)assert.equal(selectedCoffeeMilkSensoryContext(html,{name:'Raven Espresso',clean}),'');
});
test('Wild named component natural Ethiopia does not establish whole-blend Natural processing',()=>{
 const html=page('Wild',wildStory);
 const r=extractPublicCoffeeFacts(html,{source_url:wildUrl});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Wild');
 assert.notEqual(r.fields.process,'Natural',JSON.stringify(r));
 assert.ok(!r.fields.decaffeination_method);
 const other=page('Wild','A small-batch house blend.','<aside class="related-products"><h2>Other Coffee</h2><p>Process: Natural. Tasting Notes: Pear, Lemon.</p></aside>');
 const p=extractPublicCoffeeFacts(other,{source_url:wildUrl});
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.process,'Natural');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/pear|lemon/i);
});
