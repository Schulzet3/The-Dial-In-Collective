import test from 'node:test';
import assert from 'node:assert/strict';
import {selected37,selectedName,selectedUrl,unsafe37Fields} from '../scripts/audit/issue33-r365-original37-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const own='<p>This Black Honey Processed Coffee series from Dona Francisca and her husband, Oscar Chacon.</p>'+
 '<p>The Cumbres del Poas micro mill is located in Sabanilla, Alajuela, in the Central Valley region of Costa Rica.</p>'+
 '<p>In 2009 they became pioneers of high quality honey and natural process coffees.</p>'+
 '<p>This coffee is lightly roasted with chocolate, black cherry, and strawberry notes.</p>';
const html=(name=selectedName,description=own,other='')=>
 '<html><head><title>Shop Coffee - related roasts</title></head><body><nav>2009 Natural Geisha</nav>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="product__description">'+description+
 '</div></article></main>'+other+'<footer>More coffees: Espresso Decaf</footer></body></html>';

test('selected original37 literal first-party section includes chosen process, own notes, named growers, mill locality',()=>{
 const s=selected37(html());
 assert.equal(s.identity,true);
 for(const k of ['chosenBlackHoney','directSensory','directLight','directPeople','millIsLocation','harvestDoesNotNameRelease'])assert.equal(s[k],true,k);
});
test('different selected title must not inherit old SKU',()=>{
 assert.equal(selected37(html('Other Costa Rica Coffee')).identity,false);
});
test('unrelated aside cannot supply missing direct chosen sensory facts',()=>{
 const s=selected37(html(selectedName,own.replace('chocolate, black cherry, and strawberry notes','a balanced cup'),
 '<aside>chocolate, black cherry, strawberry notes</aside>'));
 assert.equal(s.directSensory,false);
});
test('unrelated navigation cannot supply selected roast or process',()=>{
 const s=selected37(html(selectedName,own.replace('lightly roasted','roasted').replace('Black Honey Processed Coffee','Coffee'),
 '<nav>Light Black Honey</nav>'));
 assert.equal(s.directLight,false);assert.equal(s.chosenBlackHoney,false);
});
test('reject unsupported mill town as farm origin and 2009 as coffee release',()=>{
 const good={name:selectedName,origin:'Central Valley, Costa Rica',process:'Honey',roast_level:'Light',
  tasting_notes:'chocolate, black cherry, strawberry',producer:'Dona Francisca and Oscar Chacon'};
 assert.equal(unsafe37Fields(good),false);
 for(const change of [{origin:'Sabanilla, Alajuela, Central Valley, Costa Rica'},
  {release_label:'2009'},{process:'Natural'},{roast_level:'Dark'},
  {decaffeination_method:'Swiss Water'},{tasting_notes:'vanilla'},
  {producer:'Cumbres del Poas'}]){
  assert.equal(unsafe37Fields({...good,...change}),true,JSON.stringify(change));
 }
});
test('selected official transport, heading, parser and two no-save UI surfaces are all required',()=>{
 const good={number:37,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([37],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'}, {...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false}, {...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([37],[bad]).length>0);
});
test('generic current parser supports read-only Add Coffee and Source Review',()=>{
 const r=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(r.ok,true);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:selectedUrl})?.type,'coffee_source_review');
});
