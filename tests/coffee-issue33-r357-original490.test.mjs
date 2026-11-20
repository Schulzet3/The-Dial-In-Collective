import test from 'node:test';
import assert from 'node:assert/strict';
import {selected490,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r357-original490-check.mjs';
import {selectedCurrentCoffeeReleaseBadge} from '../src/server/coffee-selected-source-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const facts='<section><p>ORIGIN: Ecuador. PRODUCER: Leopoldo Andrade / Ligia Merizalde. VARIETY: Sudan Rume.</p>'+
 '<p>PROCESS: Anaerobic Natural. TASTING NOTES: Natural Wine / Cacao / Cherry Cordial.</p>'+
 '<p>ROAST LEVEL: Light. The cherry undergoes 120-hour anaerobic fermentation.</p></section>';
const price='<div class="product-price-container"><div class="badge" data-badge="next-level">NEXT LEVEL</div><strong>$32</strong></div>';
const page=(title=selectedName,ownPrice=price,body=facts,other='')=>
 '<html><head><title>Another coffee shop Dark roast</title></head><body><nav>Other coffee NEXT LEVEL</nav>'+
 '<article class="product"><h1>'+title+'</h1>'+ownPrice+'<div class="product__description">'+body+'</div></article>'+
 other+'<footer>Other coffee from Guatemala, Washed, Decaf</footer></body></html>';

test('R357 correct selected price panel yields exactly Next Level',()=>{
 assert.equal(selectedCurrentCoffeeReleaseBadge(page(),{name:selectedName}),'Next Level');
});
test('R357 exact selected H1 and direct sensory/producer/process remain scoped',()=>{
 const x=selected490(page());assert.equal(x.exact,true);
 for(const k of ['ownOrigin','ownGrowers','ownVariety','ownProcess','ownNotes','ownRoast'])assert.equal(x[k],true,k);
});
test('R357 missing selected price badge cannot borrow navigation or review text',()=>{
 assert.equal(selectedCurrentCoffeeReleaseBadge(page(selectedName,'',facts,'<aside>'+price+'</aside>'),{name:selectedName}),'');
});
test('R357 different coffee cannot borrow an otherwise identical release badge',()=>{
 assert.equal(selectedCurrentCoffeeReleaseBadge(page('Different Farm - Ethiopia'),{name:selectedName}),'');
 assert.equal(selected490(page('Different Farm - Ethiopia')).exact,false);
});
test('R357 ambiguous duplicate selected H1 cannot certify badge',()=>{
 assert.equal(selectedCurrentCoffeeReleaseBadge(page()+ '<h1>'+selectedName+'</h1>',{name:selectedName}),'');
});
test('R357 unmarked or mislabeled price badge must not elevate release',()=>{
 assert.equal(selectedCurrentCoffeeReleaseBadge(page(selectedName,'<div class="product-price-container"><div class="badge">NEXT LEVEL</div></div>'),{name:selectedName}),'');
 assert.equal(selectedCurrentCoffeeReleaseBadge(page(selectedName,'<div class="product-price-container"><div class="badge" data-badge="next-level">Other Tier</div></div>'),{name:selectedName}),'');
});
test('R357 current Add Coffee preview and Source Review remain explicit no-save surfaces',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R357 source guard rejects unavailable, wrong identity, missing UI and rejected badge',()=>{
 const good={number:490,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true,selected_price_badge_accepted:true};
 assert.deepEqual(requiredFocusedSourceFailures([490],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false},
  {...good,selected_price_badge_accepted:false}])
  assert.ok(requiredFocusedSourceFailures([490],[bad]).length>0);
});

test('R357 selected Anaerobic Natural retains direct literal while approved Process category is Anaerobic',()=>{
 const x=selected490(page());assert.equal(x.ownProcess,true);
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(p.fields?.process,'Anaerobic');
});
