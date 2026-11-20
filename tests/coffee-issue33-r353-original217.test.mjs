import test from 'node:test';
import assert from 'node:assert/strict';
import {selected217,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r353-original217-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const own='<p>The organic green coffee from the Guji zone in Ethiopia comes from approximately 450 smallholder farms. '+
 'These cherries are then delivered to the Dambi Uddo Station. The natural dry processing method produces '+
 'notes of strawberry, dried fruit, rose, and green tea.</p>'+
 '<p>CUPPING NOTES: Strawberry, Dried Fruit, Rose, Green Tea. BODY: Light. ACIDITY: Medium. PROCESS: Natural.</p>';
const page=(body=own,name=selectedName,other='')=>'<html><head><title>Other Coffee: Dark</title></head><body>'+
 '<nav>Other Coffee producer: Andrew; Decaf Swiss Water; origin Guatemala</nav>'+
 '<article class="product"><h1>'+name+'</h1><div class="product__description">'+body+'</div></article>'+
 other+'<footer>Other coffee was roasted Dark in Central America</footer></body></html>';

test('R353 selected exact identity and Guji/Dambi 450 farms Natural four-note direct selected facts',()=>{
 const x=selected217(page());assert.equal(x.exact,true);
 for(const k of ['guji','farms','natural','notes','ownCupping','bodyAndAcidity'])assert.equal(x[k],true,k);
});
test('R353 a different product heading fails even when prose is copied',()=>{
 assert.equal(selected217(page(own,'Unrelated 2026 Ethiopia Coffee')).exact,false);
});
test('R353 sibling/SEO/footer facts excluded from selected product facts',()=>{
 const s=selected217(page('<p>Selected coffee has no published origin or process.</p>',selectedName,'<aside>'+own+'</aside>'));
 assert.equal(s.exact,true);assert.equal(s.guji,false);assert.equal(s.natural,false);assert.equal(s.notes,false);
});
test('R353 selected Natural is not inferred merely from floating and drying cherries',()=>{
 const p=extractPublicCoffeeFacts(page('<p>Guji zone Ethiopia. Cherries float and dry on raised beds.</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.process),'natural');
});
test('R353 Body Light and Acidity Medium cannot be treated as a roast level',()=>{
 const x=extractPublicCoffeeFacts(page('<p>Origin: Guji, Ethiopia. CUPPING NOTES: Strawberry. BODY: Light. ACIDITY: Medium. PROCESS: Natural.</p>'),{source_url:selectedUrl});
 assert.equal(x.ok,true);assert.ok(!x.fields?.roast_level);
});
test('R353 two unselected sale roast options do not authorize a default Light or Medium roast',()=>{
 const x=extractPublicCoffeeFacts(page(own.replace('BODY: Light','BODY: Light')+'<p>Roast choices: Medium; Medium-Dark</p>'),{source_url:selectedUrl});
 assert.equal(x.ok,true);assert.ok(!x.fields?.roast_level);
});
test('R353 Add Coffee preview and Source Review no-save preserve explicit selected product',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R353 required current actual official gate rejects missing, wrong identity or missing UI',()=>{
 const good={number:217,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
 selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name:selectedName},
 add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([217],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
   {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
   assert.ok(requiredFocusedSourceFailures([217],[bad]).length>0);
});
