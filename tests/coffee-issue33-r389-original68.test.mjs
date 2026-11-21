// Issue #33 R389: current selected roles and source priority, no cross-product promotion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Black Honey Berries',url='https://contemporoast.com/products/black-honey-berries';
const own='<p>This coffee is dried, depulped and washed before ten days of anaerobic fermentation.</p><p>Region: Buesaco, Nariño, Colombia</p><p>Producer: Forest</p><p>Farmer/Farm: Huver Castillo, El Paseo farm</p><p>Altitude: 1800m</p><p>Process: Anaerobic</p><p>Varietal: Caturra</p><p>Notes from Our Roaster: a delicate body, notes of mixed berries, honey and floral.</p>';
const html=(title=name,sibling='')=>'<html><head><meta property="og:site_name" content="ContempoRoast Coffee & Roastery"></head><body><main><article class="product"><h1>'+title+'</h1>'+own+'</article></main>'+sibling+'</body></html>';
test('R389 one exact selected product heading and unsaved member UI',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
 assert.equal(identicalCurrentSelectedTitle(name,name,p.fields.name),true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R389 selected explicit processing takes priority over washed earlier stage',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.process||''),/^Washed$/i);
 assert.doesNotMatch(String(p.fields.process||''),/^Natural$/i);
});
test('R389 related-product and footer attributes never fill the selected flavor/process',()=>{
 const related='<aside class="related-products"><h2>Juicy Passion Fruit</h2><p>Natural process, Pineapple, dark roast, Ethiopian beans</p></aside><footer>Made in Ohio</footer>';
 const p=extractPublicCoffeeFacts(html(name,related),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/pineapple/i);
 assert.doesNotMatch(String(p.fields.origin||''),/ethiopia|ohio/i);
 assert.doesNotMatch(String(p.fields.process||''),/^Natural$/i);
});
test('R389 changed selected coffee identity is not original603 evidence',()=>{
 const other='Juicy Passion Fruit',p=extractPublicCoffeeFacts(html(other),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(name,other,p.fields.name),false);
});
test('R389 source identity, missing official HTML, parser and UI negatives fail closed',()=>{
 const good={number:68,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([68],[good]),[]);
 for(const invalid of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([68],invalid).length>0);
});
