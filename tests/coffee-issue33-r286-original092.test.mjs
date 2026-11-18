// Issue #33 R286: original #92 selected flavored coffee; future current-source CI proves actual page.
// Do not use menu, pods, review, generic roast gradient or SEO to invent selected facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {refineSelectedCoordinatedFlavoredSubstances} from '../src/server/coffee-selected-description-sensory.mjs';
const name='Highlander Grogg';
const url='https://darkcanyon-coffee.com/collections/best-sellers/products/highlander-grogg';
const page=(selected,body,other='')=>'<html><head><title>Old SEO: other coffee, dark roast, Swiss Water</title></head><body><main><article class="product"><h1>'+selected+'</h1><div class="description"><p>'+body+'</p><p>Roast Level</p><p>Light Medium Dark</p></div></article></main><aside class="related-products">'+other+'</aside></body></html>';
const own='Our top-selling coffee, Highlander Grogg, harmoniously combines the rich flavors of Butterscotch, the smooth sweetness of French Vanilla, and the velvety warmth of Irish Crème. Once you welcome this captivating combination into your home, you will find it disappears faster than you can imagine.';
test('92 selected own current flavored-coffee wording preserves literal trio without SEO, pod or sibling borrowing',()=>{
 const html=page(name,own,'Highlander Grogg Single Serve Pods: no decaf. Fireside Favorite: Graham Cracker, Cinnamon, Vanilla, Hazelnut. Dark roast Swiss Water.');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[name]);
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,name);
 const notes=String(p.fields.tasting_notes||'').toLowerCase();
 for(const w of ['butterscotch','french vanilla','irish crème'])assert.ok(notes.includes(w.toLowerCase()),'missing selected literal '+w+': '+notes);
 assert.equal(p.fields.tasting_notes,'Butterscotch, French Vanilla, Irish Crème','canonical flavor list drops ornamental source connectors');
 assert.doesNotMatch(notes,/graham cracker|hazelnut|cinnamon|swiss water/);
 assert.ok(!p.fields.decaffeination_method,'pod sibling cannot supply method');
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('92 source acceptance rejects unavailable, duplicate, changed identity and absent explicit review',()=>{
 const good={number:92,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([92],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,selected_heading_identity_verified:false}],[{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]]){
  assert.ok(requiredFocusedSourceFailures([92],bad).length>0);
 }
 const changed=extractPublicCoffeeFacts(page('Highlander Grogg Single Serve Pod',own),{source_url:url});
 assert.equal(changed.ok,true);
 assert.notEqual(changed.fields.name,name);
});
test('92 only unselected roast scale cannot itself certify original Medium roast',()=>{
 const p=extractPublicCoffeeFacts(page(name,own),{source_url:url});
 assert.equal(p.ok,true);
 assert.ok(!p.fields.decaffeination_method);
 // No selected roast label is marked by this synthetic scale; do not guess from options.
 assert.ok(!p.fields.roast_level,'unselected Light Medium Dark scale is not a roast choice: '+p.fields.roast_level);
});

test('92 exact selected flavor substance normalization rejects old, serving-conditional and sibling prose',()=>{
 const clean=(s,n=1000)=>String(s).replace(/<[^<>]{0,1200}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const notes='Butterscotch, the smooth sweetness of French Vanilla, and the velvety warmth of Irish Crème';
 const run=html=>refineSelectedCoordinatedFlavoredSubstances(productMarkup(html),{clean,notes});
 assert.equal(run(page(name,own)),'Butterscotch, French Vanilla, Irish Crème');
 for(const bad of [page(name,'Previously, '+own),page(name,'When served with milk, '+own),
   page(name,'Other coffees: '+own),page('Another coffee',own),
   page(name,'Our coffee tastes of chocolate, honey and citrus.',own)])
   assert.equal(run(bad),'','no borrowed, stale or conditional current flavor');
});
