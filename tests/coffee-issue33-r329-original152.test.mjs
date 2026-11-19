import test from 'node:test';
import assert from 'node:assert/strict';
import {selected152} from '../scripts/audit/issue33-r329-original152-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://hilltreeroastery.com/products/ethiopia-yirgacheffe-banko-chelchele-supernatural-anaerobic-coffee';
const name='ETHIOPIA YIRGACHEFFE BANKO CHELCHELE SUPERNATURAL ANAEROBIC COFFEE';
const details='<p>FLAVOR: Strawberry / Blackberry / Toffee / Chocolate</p><p>BODY: Light to Medium</p><p>PROCESS: Anaerobic Natural</p><p>Roast: Light</p><p>Origin: Yirgacheffe, Ethiopia</p><p>Elevation: 1,900–2,200 meters</p><p>Producers: Various Smallholder Farmers</p><p>Varieties: Ethiopian Heirloom Varieties</p><p>Produced in the Gedeb district of the Gedeo Zone.</p>';
const fixture=(own=details,heading=name,extra='')=>'<html><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+own+'</div></article>'+extra+'</main></html>';
const parsed=h=>extractPublicCoffeeFacts(h,{source_url:url});
test('R329 selected exact original152 direct labeled source',()=>{
 const s=selected152(fixture());assert.equal(s.exact,true);
 for(const k of ['ownFlavor','labeledProcess','labeledLightRoast','lightToMediumBody','sourceOrigin','sourceSmallholders','sourceHeirloom','sourceElevation'])
  assert.equal(s[k],true,k);
});
test('R329 changed original selected H1 fails rather than recycling original data',()=>{
 assert.equal(selected152(fixture(details,'Different Ethiopia Lot')).exact,false);
});
test('R329 unrelated sidebars cannot establish missing selected notes or process',()=>{
 const s=selected152(fixture('<p>Roast: Light</p>',name,'<aside>'+details+'</aside><footer>'+details+'</footer>'));
 assert.equal(s.ownFlavor,false);assert.equal(s.labeledProcess,false);assert.equal(s.sourceSmallholders,false);
});
test('R329 Light to Medium body cannot be sold as a Medium roast',()=>{
 const s=selected152(fixture());assert.equal(s.labeledLightRoast,true);assert.equal(s.lightToMediumBody,true);
 const p=parsed(fixture());assert.equal(p.ok,true);assert.notEqual(p.fields?.roast_level,'Medium');
});
test('R329 source explicitly says Anaerobic Natural, not washed or water-decaf',()=>{
 const s=selected152(fixture());assert.equal(s.labeledProcess,true);
 const p=parsed(fixture());assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Washed');
 assert.ok(!p.fields?.decaffeination_method);
});
test('R329 form-wrapped selected official coffee description remains in own product scope',()=>{
 const wrapped='<html><main><article class="product"><h1>'+name+'</h1><form class="product-form"><div class="product__description">'+details+'</div></form></article></main></html>';
 const selected=selected152(wrapped);
 for(const key of ['ownFlavor','labeledProcess','labeledLightRoast','lightToMediumBody','sourceOrigin','sourceSmallholders','sourceHeirloom','sourceElevation'])assert.equal(selected[key],true,key);
});
test('R329 synthetic unnamed smallholder selected description must not borrow sidebar named producer',()=>{
 const s=selected152(fixture());assert.equal(s.sourceSmallholders,true);
 const p=parsed(fixture(details,name,'<aside>Other coffee Producer: John Doe</aside>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.producer,'John Doe');
});
test('R329 missing own process stays unsubstantiated by unrelated SEO',()=>{
 const s=selected152(fixture('<p>Roast: Light</p>',name,'<aside><p>PROCESS: Anaerobic Natural</p></aside>'));
 assert.equal(s.labeledProcess,false);
});
test('R329 current exact selected coffee parser permits Add Coffee and Source Review without save',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R329 unavailable source or missing H1/preview must fail strict acceptance',()=>{
 const good={number:152,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([152],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([152],[bad]).length);
});
