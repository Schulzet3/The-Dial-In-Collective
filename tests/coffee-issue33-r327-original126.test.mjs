import test from 'node:test';
import assert from 'node:assert/strict';
import {selected126} from '../scripts/audit/issue33-r327-original126-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://fostercoffee.co/products/yes-its-decaf-decaf',name="Yes It's Decaf (Decaf)";
const own='<p>Country Mexico</p><p>Region Amatenago</p><p>Producer Smallholder Farms</p><p>Altitude 1200 - 2000 MASL</p><p>Processing Washed: Mountain Water Decaf</p><p>WHAT WE’RE TASTING: Sweet, Smooth, Bright, Floral</p>';
const fixture=(body=own,h1=name,extras='')=>'<html><body><main><article class="product"><h1>'+h1+'</h1><div class="product__description">'+body+'</div></article>'+extras+'</main></body></html>';
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});
test('R327 selected exact source, own country/producer/region/elevation/method and notes',()=>{
 const s=selected126(fixture());assert.equal(s.exact,true);
 for(const k of ['mexico','region','farmer','elevation','dualMethod','notes'])assert.equal(s[k],true,k);
});
test('R327 selected heading substitution fails original identity',()=>assert.equal(selected126(fixture(own,'Another Decaf')).exact,false));
test('R327 sibling educational and other-coffee text cannot count as own selected evidence',()=>{
 const s=selected126(fixture('<p>No own selected specs</p>',name,'<aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(s.dualMethod,false);assert.equal(s.notes,false);assert.equal(s.farmer,false);
});
test('R327 Water Process remains distinct from green Washed in combined selected method',()=>{
 const p=parse(fixture());
 assert.equal(p.ok,true);assert.equal(p.fields?.decaffeination_method,'Water Process');
 assert.equal(p.fields?.process,'Washed');
});
test('R327 unrelated EA educational link cannot turn exact selected Mountain Water into Sugar Process',()=>{
 const p=parse(fixture(own,'Yes It&#39;s Decaf (Decaf)','<aside><a>Comparing Ethyl Acetate and Mountain Water Process Decaffeination</a></aside>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.decaffeination_method,'Sugar Process');
});
test('R327 absent own decaf method must not be filled by education or related product',()=>{
 const p=parse(fixture('<p>Country Mexico</p><p>Process: Washed</p>',name,'<footer><p>Mountain Water Decaf</p><p>Ethyl Acetate</p></footer>'));
 assert.equal(p.ok,true);assert.equal(p.fields?.decaffeination_method,undefined);
});
test('R327 no invented roast, variety or processing category from generic coffee description',()=>{
 const p=parse(fixture());assert.equal(p.ok,true);
 assert.equal(p.fields?.roast_level,undefined);assert.equal(p.fields?.variety,undefined);
});
test('R327 Add Coffee and Source Review render, never auto-save',()=>{
 const p=parse(fixture());assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R327 unavailable official or missing Source Review is a hard failure',()=>{
 const good={number:126,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([126],[good]),[]);
 assert.ok(requiredFocusedSourceFailures([126],[{...good,status:'UNAVAILABLE'}]).length);
 assert.ok(requiredFocusedSourceFailures([126],[{...good,source_review_rendered:false}]).length);
});
