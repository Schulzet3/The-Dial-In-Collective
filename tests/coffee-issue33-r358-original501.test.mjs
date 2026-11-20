import test from 'node:test';
import assert from 'node:assert/strict';
import {selected501,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r358-original501-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const notes='<p>This lot hails from Tenejapa—a high-altitude spot in Chiapas.</p>'+
 '<p>Notes Of: Chocolate, creamy caramel, honey, hazelnut.</p>';
const html=(title=selectedName,body=notes,other='')=>'<html><head><title>Other coffee Medium roast</title></head><body>'+
 '<nav><a>Dark Roast</a><a>Other coffees Medium</a></nav><article class="product"><h1>'+title+
 '</h1><div class="product__description">'+body+'</div></article>'+other+
 '<footer>Dark Roast - other coffee / washed / decaf</footer></body></html>';
test('R358 exact selected IXXA H1 and literal current notes are own-page evidence',()=>{
 const v=selected501(html());assert.equal(v.exact,true);assert.equal(v.directTenejapa,true);assert.equal(v.directNotes,true);
});
test('R358 navigation and another coffee Medium or Dark cannot create selected roast',()=>{
 const v=selected501(html());assert.equal(v.ownLabeledRoast,false);
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.equal(Boolean(p.fields?.roast_level),false);
});
test('R358 unrelated coffee H1 cannot certify exact selected identity',()=>{
 assert.equal(selected501(html('Organic Other Lot')).exact,false);
});
test('R358 other coffee sensory and Tenejapa claims cannot replace missing selected prose',()=>{
 const v=selected501(html(selectedName,'<p>No direct coffee details published</p>',
  '<aside>Notes Of: Chocolate, creamy caramel, honey, hazelnut. This lot hails from Tenejapa.</aside>'));
 assert.equal(v.directNotes,false);assert.equal(v.directTenejapa,false);
});
test('R358 explicit selected roast must be observed, never automatically suppressed',()=>{
 assert.equal(selected501(html(selectedName,notes+'<p>ROAST LEVEL: Medium</p>')).ownLabeledRoast,true);
});
test('R358 absent or wrong raw selected source and missing UI fail closed',()=>{
 const good={number:501,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
   selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
   selected_heading_identity_verified:true,current_fields:{name:selectedName},
   add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([501],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
    {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
   assert.ok(requiredFocusedSourceFailures([501],[bad]).length>0);
});
test('R358 Add Coffee preview and Source Review still no-save surfaces',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
