import test from 'node:test';
import assert from 'node:assert/strict';
import {selected142} from '../scripts/audit/issue33-r328-original142-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://heinebroscoffee.com/products/guatemala-san-marcos',name='Guatemala San Marcos';
const own='<p>Light Roast and Medium Body.</p><p>Milk chocolate, cherry, and hazelnut taste notes with a sweet finish.</p><p>Grown by the APECAFORM cooperative in San Marcos, Guatemala.</p>';
const fixture=(desc=own,heading=name,other='')=>'<html><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+desc+'</div></article>'+other+'</main></html>';
const parsed=h=>extractPublicCoffeeFacts(h,{source_url:url});
test('R328 exact current selected product and direct own signals',()=>{
 const d=selected142(fixture());assert.equal(d.exact,true);
 for(const key of ['lightRoast','mediumBody','notes','cooperative','origin'])assert.equal(d[key],true,key);
});
test('R328 Medium Body is not a Medium Roast',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);assert.equal(p.fields?.roast_level,'Light');
});
test('R328 selected own milk chocolate cherry hazelnut are not SEO notes',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.match(String(p.fields?.tasting_notes||''),/cherry/i);
});
test('R328 sidebar and footer cannot supply unrelated official fields',()=>{
 const d=selected142(fixture('<p>Light Roast and Medium Body.</p>',name,'<aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(d.notes,false);assert.equal(d.cooperative,false);
});
test('R328 recycled or changed selected H1 is not certified',()=>{
 assert.equal(selected142(fixture(own,'Guatemala Other Lot')).exact,false);
});
test('R328 preserve named cooperative as organizational fact, not invented person',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.ok(!/^(?:john|jane|hector|maria)/i.test(String(p.fields?.producer||'')));
});
test('R328 unpublished decaf and green processing remain blank',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.ok(!p.fields?.decaffeination_method);assert.ok(!p.fields?.process);
});
test('R328 Add Coffee preview and Source Review without automatic save',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R328 no official fetch or identity or UI fails closed',()=>{
 const good={number:142,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([142],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([142],[bad]).length);
});
