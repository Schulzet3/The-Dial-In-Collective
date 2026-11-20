import test from 'node:test';
import assert from 'node:assert/strict';
import {selected38,selectedName,selectedUrl,unsafe38Fields} from '../scripts/audit/issue33-r366-original38-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const own='<p>Discover an extraordinary coffee experience with our latest natural lot from the renowned Shantawane Washing Station in Sidama, Ethiopia.</p>'+
 '<p>Nestled between 2000 and 2200 meters above sea level, near Bombe Mountain.</p>'+
 '<p>The Shantawane Washing Station is paying premiums to smallholder farmers for quality. Cherries arrive from the nearby villages of Shantawene and Bombe.</p>'+
 '<p>This natural lot is lightly roasted, revealing tasting notes of strawberry, peach, and brown sugar.</p>';
const page=(title=selectedName,prose=own,other='')=>'<html><head><title>Other roasts</title></head>'+
 '<body><nav>Espresso and light roast selections</nav><main><article class="product"><h1>'+title+'</h1>'+
 '<div class="product__description">'+prose+'</div></article></main>'+other+
 '<footer>Decaf and latest releases</footer></body></html>';
const good={name:selectedName,origin:'Sidama, Ethiopia',process:'Natural',roast_level:'Light',
 tasting_notes:'strawberry, peach, brown sugar',elevation_m:'2000–2200 masl'};
test('selected original38 own coffee literal natural/elevation/notes and station role',()=>{
 const s=selected38(page());
 assert.equal(s.identity,true);
 for(const k of ['exactNaturalLot','directElevation','stationPaysFarmers','selectedVillages','directRoast','directSensory'])assert.equal(s[k],true,k);
});
test('recycled product slug cannot override selected title',()=>assert.equal(selected38(page('Other Ethiopia Coffee')).identity,false));
test('navigation and unrelated aside cannot provide missing strawberry and brown sugar facts',()=>{
 const p=page(selectedName,own.replace('strawberry, peach, and brown sugar','fruit notes'),'<aside>strawberry peach brown sugar</aside>');
 assert.equal(selected38(p).directSensory,false);
});
test('another offering cannot prove missing selected-process or light roast',()=>{
 const p=page(selectedName,own.replace('latest natural lot','latest lot').replace('This natural lot is lightly roasted','This coffee is roasted'),'<aside>Natural Light Roast</aside>');
 assert.equal(selected38(p).exactNaturalLot,false);
 assert.equal(selected38(p).directRoast,false);
});
test('washing-station processor is not a named individual grower; no release or decaf invention',()=>{
 assert.equal(unsafe38Fields(good),false);
 assert.equal(unsafe38Fields({...good,producer:'Smallholder farmers'}),false);
 for(const f of [{producer:'Shantawane Washing Station'}, {release_label:'2000'}, {decaffeination_method:'Water Process'},
  {espresso_recipe:'18g/36g'}, {process:'Washed'}, {origin:'Bombe Mountain, Kenya'},
  {elevation_m:'2000 masl'}, {roast_level:'Dark'},{tasting_notes:'strawberry, vanilla'}]){
  assert.equal(unsafe38Fields({...good,...f}),true,JSON.stringify(f));
 }
});
test('required guarded official HTML selected H1 and both no-save UI views',()=>{
 const r={number:38,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([38],[r]),[]);
 for(const change of [{status:'UNAVAILABLE'},{selected_heading_identity_verified:false},
  {parser_ok:false},{source_review_rendered:false},{add_coffee_ui_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([38],[{...r,...change}]).length>0);
 }
});
test('the parser still renders read-only Add Coffee and Source Review without saving',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
