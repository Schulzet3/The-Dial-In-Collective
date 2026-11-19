import test from 'node:test';
import assert from 'node:assert/strict';
import {own138} from '../scripts/audit/issue33-r327-original138-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://gnosiscoffee.com/products/red-bourbon-decaf',name='Red Bourbon DECAF';
const own='<p>Colombia</p><p>Piendamó, Cauca / Producer: Wilton Benítez and Paraíso 92</p><p>Red Bourbon</p><p>Sugarcane Decaffeination (EA)</p><p>Bergamot, Red Fruit, Cola, Peach, Caramel</p><p>Roast Level: Light</p>';
const fixture=(desc=own,h1=name,extra='')=>'<main><article class="product"><h1>'+h1+'</h1><div class="product__description">'+desc+'</div></article>'+extra+'</main>';
test('R327 direct selected title and five own flavor signals',()=>{const d=own138(fixture());assert.equal(d.exact,true);assert.equal(d.notes,true)});
test('R327 distinct own decaf, grower, region and roast evidence',()=>{const d=own138(fixture());for(const k of ['method','producer','roast','origin'])assert.equal(d[k],true,k)});
test('R327 unrelated sidebar/footer flavors cannot fill missing selected flavor',()=>{const d=own138(fixture('<p>Colombia Red Bourbon</p>',name,'<aside>'+own+'</aside><footer>'+own+'</footer>'));assert.equal(d.notes,false);assert.equal(d.method,false)});
test('R327 changed selected H1 cannot be certified from original slug',()=>{assert.equal(own138(fixture(own,'Other Coffee')).exact,false)});
test('R327 parser and explicit Add Coffee review controls remain available',()=>{const p=extractPublicCoffeeFacts(fixture(),{source_url:url});assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review')});
test('R327 source fail closed on unavailable, changed identity and absent review',()=>{
const good={number:138,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
assert.deepEqual(requiredFocusedSourceFailures([138],[good]),[]);
for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},{...good,source_review_rendered:false}])assert.ok(requiredFocusedSourceFailures([138],[bad]).length);
});
