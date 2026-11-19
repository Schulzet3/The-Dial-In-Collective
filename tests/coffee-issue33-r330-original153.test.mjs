import test from 'node:test';
import assert from 'node:assert/strict';
import {selected153} from '../scripts/audit/issue33-r330-original153-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://hilltreeroastery.com/products/mexico-nayarit-natural-anaerobic-dragon';
const name='MEXICO NAYARIT NATURAL ANAEROBIC DRAGON';
const own='<p>FLAVOR: Raspberry • Winey • Cinnamon • Orange</p><p>BODY: Medium</p><p>ACIDITY: Medium</p><p>PROCESS: Natural Anaerobic Dragon</p><p>Roast: Light</p><p>Origin: Tepic, Nayarit, Mexico</p><p>Elevation: 1,400 meters</p><p>Producers: Various Smallholders</p><p>Varieties: Caturra • Bourbon</p>';
const page=(s=own,h=name,extra='')=>'<html><main><article class="product"><h1>'+h+'</h1><form><div class="product__description">'+s+'</div></form></article>'+extra+'</main></html>';
const parse=s=>extractPublicCoffeeFacts(s,{source_url:url});
test('R330 exact selected H1 and all directly labeled product facts',()=>{
 const s=selected153(page());assert.equal(s.exact,true);
 for(const key of ['labeledFlavor','bodyMedium','ownAnaerobic','ownLightRoast','ownOrigin','ownElevation','genericSmallholders','ownVarieties'])assert.equal(s[key],true,key);
});
test('R330 recycled identity cannot inherit old product',()=>{assert.equal(selected153(page(own,'Other Mexico Lot')).exact,false)});
test('R330 unrelated sidebar, footer and navigation cannot source missing selected details',()=>{
 const s=selected153(page('<p>Roast: Light</p>',name,'<aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(s.labeledFlavor,false);assert.equal(s.ownAnaerobic,false);assert.equal(s.genericSmallholders,false);
});
test('R330 direct Medium body must not become Medium roast',()=>{
 const s=selected153(page());assert.equal(s.bodyMedium,true);assert.equal(s.ownLightRoast,true);
 const p=parse(page());assert.equal(p.ok,true);assert.notEqual(p.fields?.roast_level,'Medium');
});
test('R330 washed-only educational FAQ must not override own anaerobic process',()=>{
 const s=selected153(page(own+'<h3>FAQ</h3><p>How is natural anaerobic different from washed coffee?</p>'));
 assert.equal(s.ownAnaerobic,true);const p=parse(page(own+'<h3>FAQ</h3><p>Washed coffee is another process.</p>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Washed');
});
test('R330 generic current product cannot borrow other coffee named farmer',()=>{
 const p=parse(page(own,name,'<aside>Other coffee producer: John Doe</aside>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.producer,'John Doe');
});
test('R330 no Water Process or chemical decaf inferred from anaerobic fermentation',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R330 Add Coffee preview and Source Review remain explicit, unsaved',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R330 missing official source, selected identity, or review fail closed',()=>{
 const good={number:153,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([153],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},{...good,source_review_rendered:false}])
 assert.ok(requiredFocusedSourceFailures([153],[bad]).length);
});
