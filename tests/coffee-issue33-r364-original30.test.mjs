import test from 'node:test';
import assert from 'node:assert/strict';
import {selected30,selectedName,selectedUrl,unsafeUnsupportedValues} from '../scripts/audit/issue33-r364-original30-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const own='<p>Costa Rica West Valley San Rafael de San Ramón family farms Julia Vega Rodríguez, Olman Cruz Vega, Ricardo Chávez Garita and Juan Bautista Mejia Rojas.</p>'+
 '<p>Elevation: 5,200 Feet (1,100 MASL). Process: Fully Washed & Sun Dried. Varietals Catuai & Caturra.</p>'+
 '<p>Quality Grade: Gold Collection (Strictly Hard Bean).</p><h2>Flavor Notes</h2>'+
 '<p>Brown Sugar, Hibiscus, Raspberry, Honey</p>';
const html=(name=selectedName,description=own,side='')=>'<html><head><title>Old Guatemala Finca El Rincon Copy</title></head><body>'+
 '<nav>Medium Roast Coffees</nav><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description">'+description+'</div></article></main>'+
 side+'<footer>Related Medium Roast Coffees</footer></body></html>';
test('R364 selected coffee direct own facts and inconsistent elevation',()=>{
 const x=selected30(html());assert.equal(x.identity,true);assert.equal(x.notes,true);assert.equal(x.origin,true);
 assert.equal(x.process,true);assert.equal(x.variety,true);assert.equal(x.growers,true);
 assert.equal(x.grade,true);assert.equal(x.elevationInconsistent,true);
});
test('R364 recycled original Guatemala slug cannot replace current H1',()=>{
 assert.equal(selected30(html('Guatemala Finca El Rincon')).identity,false);
});
test('R364 sibling note card cannot supply missing own notes',()=>{
 assert.equal(selected30(html(selectedName,own.replace('Brown Sugar, Hibiscus, Raspberry, Honey','Only mild flavors'),
 '<aside>Brown Sugar, Hibiscus, Raspberry, Honey</aside>')).notes,false);
});
test('R364 unrelated grower card cannot supply missing current farmer',()=>{
 assert.equal(selected30(html(selectedName,own.replace('Julia Vega Rodríguez','a different grower'),
 '<aside>Julia Vega Rodríguez</aside>')).growers,false);
});
test('R364 no silently selected roast/tier release or contradictory altitude',()=>{
 assert.equal(unsafeUnsupportedValues({},['elevation_m']),false);
 for(const f of [{roast_level:'Medium'},{release_label:'Gold Collection'},{elevation_m:'1100m'}])
  assert.equal(unsafeUnsupportedValues(f,['elevation_m']),true);
 assert.equal(unsafeUnsupportedValues({},[]),true);
});
test('R364 source unavailable, identity mismatch or review absent fail closed',()=>{
 const good={number:30,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,selected_h1:[selectedName],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name:selectedName},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([30],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([30],[bad]).length>0);
});
test('R364 parser no-save Add Coffee and Source Review synthetic smoke',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});