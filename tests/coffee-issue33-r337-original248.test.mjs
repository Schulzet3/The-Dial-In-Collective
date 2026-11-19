import test from 'node:test';
import assert from 'node:assert/strict';
import {selected248} from '../scripts/audit/issue33-r337-original248-check.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://onyxcoffeelab.com/products/ethiopia-agaro-yukro-g1';
const name='Ethiopia Agaro Yukro G1';
const own='<p>Apricot, Barley Tea, Bergamot, Caramel</p><p>Ultra Light roast, Landrace variety, Washed process at 1900 MASL.</p><p>Yukro is produced by 579 smallholder farmers in Wanja Kersa.</p><p>2026 summer coffee program</p>';
const page=(body=own,title=name,extra='')=>'<html><main><article><h1>'+title+'</h1><div class="product__description">This product is archived.'+body+'</div></article>'+extra+'</main></html>';
test('R337 literal original248 chosen H1 and directly selected own specs',()=>{
 const r=selected248(page());assert.equal(r.exact,true);
 for(const key of ['ownFlavor','ownVariety','ownWashed','ownElevation','ownRoast','ownGrowerGroup','archivedBanner','summer2026'])assert.equal(r[key],true,key);
});
test('R337 another Onyx selected H1 is not Yukro',()=>assert.equal(selected248(page(own,'Mexico Finca Santa Cruz Gesha')).exact,false));
test('R337 unrelated footer cannot lend selected flavor or grower',()=>{
 const r=selected248(page('<p>Current product unspecified.</p>',name,'<footer>'+own+'</footer>'));
 for(const key of ['ownFlavor','ownWashed','ownGrowerGroup','ownRoast'])assert.equal(r[key],false,key);
});
test('R337 generic roasting and old SKU cannot fill unknown selected lot',()=>{
 const r=selected248(page('<p>Landrace coffee. No current lot.</p>'));
 assert.equal(r.exact,true);assert.equal(r.ownGrowerGroup,false);assert.equal(r.summer2026,false);
});
test('R337 unrelated guide 0mg caffeine must not fabricate decaffeination',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<p class="guide">Caffeine 0mg / 12oz</p>'),{source_url:url});
 assert.equal(p.ok,true);assert.ok(!p.fields?.decaffeination_method);
});
test('R337 station versus farmer distinction is not a grower group',()=>{
 const r=selected248(page('<p>Yukro washing station processes coffee.</p>'));
 assert.equal(r.ownGrowerGroup,false);
});
test('R337 explicit Add Coffee and review remain human-controlled',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R337 missing, challenge or mismatched source never passes',()=>{
 const r={number:248,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([248],[r]),[]);
 for(const bad of [{...r,status:'UNAVAILABLE'},{...r,selected_heading_identity_verified:false},{...r,add_coffee_ui_rendered:false},{...r,source_review_rendered:false}]){
  assert.ok(requiredFocusedSourceFailures([248],[bad]).length);
 }
 assert.ok(requiredFocusedSourceFailures([248],[]).length);
});
