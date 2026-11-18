// Issue #33 R294: original603 #537 single selected product; not 603-row certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='TRES CRUCES, HONEY PROCESSED, GUATEMALA';
const url='https://www.paperplanecoffee.com/products/tres-cruces-honey-processed-guatemala';
const own='<p>TASTING NOTES: GUAVA, PEAR, NOUGAT</p><p>ORIGIN: JOYABAJ, GUATEMALA</p>'+
 '<p>VARIETY: CATURRA, BOURBON, CATUAI</p><p>ALTITUDE: 1,500-1900 METERS</p>'+
 '<p>PROCESS METHOD: HONEY</p>';
const page=(selectedName=name,description=own)=>
 '<html><head><title>Related coffee Wush Wush</title><meta name="description" content="Blueberry Natural Decaf"></head>'+
 '<body><main><article class="product"><h1>'+selectedName+'</h1><div class="description">'+description+
 '</div></article></main><aside class="related-products"><h2>Other Coffee</h2>'+
 '<p>Tasting Notes: Strawberry, Banana</p><p>Process: Natural</p><p>Producer: Different Farm</p></aside></body></html>';

test('R294 focused acceptance rejects absent, unverified or duplicate exact selected sources',()=>{
 const good={number:537,archived_coffee:name,status:'FETCHED',parser_ok:true,
  selected_h1:[name],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([537],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,source_review_rendered:false}],[{...good,add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([537],bad).length>0);
});

test('R294 identity uses exact current selected H1, not related coffee title or old SEO',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[name]);
 assert.equal(identicalCurrentSelectedTitle(name,name,name),true);
 for(const other of ['GUATEMALA TRES CRUCES LOT 2027','GUATEMALA GAISANDO','OTHER COFFEE'])
  assert.equal(identicalCurrentSelectedTitle(name,other,other),false);
});

test('R294 actual parser respects selected direct notes over sibling and old page metadata',()=>{
 const result=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,name);
 for(const note of ['guava','pear','nougat'])
  assert.match(String(result.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(result.fields.tasting_notes||''),/strawberry|banana|blueberry/i);
 assert.doesNotMatch(String(result.fields.producer||''),/different farm/i);
 assert.doesNotMatch(String(result.fields.decaffeination_method||''),/water|sugar process/i);
 assert.match(coffeeUrlPreviewMarkup(result),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...result,source_url:url})?.type,'coffee_source_review');
});

test('R294 changed selected H1 does not falsely certify archived Tres Cruces',()=>{
 const other='OTHER GUATEMALA COFFEE';
 const parsed=extractPublicCoffeeFacts(page(other,
  '<p>Tasting Notes: Guava, Pear, Nougat</p><p>Origin: Guatemala</p>'),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.notEqual(parsed.fields.name,name);
 assert.equal(identicalCurrentSelectedTitle(name,other,parsed.fields.name),false);
});
