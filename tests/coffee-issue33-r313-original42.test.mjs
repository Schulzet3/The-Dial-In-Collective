// #33 R313: original603 #42 exact-selected El Corazon green-process vs drying/sibling guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://brickhouseroasters.com/products/el-corazon-certified-organic-coffee';
const name='El Corazón';
const bean='<section><h2>BEAN PROFILE</h2><h3>Country of Origin</h3><p>Honduras</p><h3>Region</h3><p>Lempira</p><h3>Producer</h3><p>Flor del Cafe</p><h3>Elevation</h3><p>1650 MASL</p><h3>Processing Method</h3><p>Washed</p><h3>Drying Method</h3><p>Patio-Dried</p><h3>Harvest</h3><p>October – March</p></section>';
const own='<p>Lightly roasted, flavorful, and highly satisfying, each bean is a gift from our Honduran brothers and sisters.</p><p>*Market conditions may result in product substitution.</p><p>Origin: Honduras</p><p>Process: Washed</p>'+bean;
const html=(body=own,head='',outside='')=>'<html><head><meta property="og:site_name" content="Brickhouse Coffee Co.">'+head+'</head><body><main><article class="product"><h1>'+name+'</h1>'+body+'</article></main>'+outside+'</body></html>';
test('R313 original selected identity and explicit member preview/review',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,name);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R313 selected explicitly Washed is not changed to Natural by Patio-Dried',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.process||''),/washed/i);
 assert.doesNotMatch(String(p.fields.process||''),/natural|honey|anaerobic/i);
});
test('R313 explicit seller geography and producer do not become roaster city',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/honduras/i);
 assert.doesNotMatch(String(p.fields.origin||''),/indianapolis|united states/i);
 assert.doesNotMatch(String(p.fields.producer||''),/brickhouse|roastery/i);
});
test('R313 related decaf and organic wellness marketing cannot become selected sensory or decaf',()=>{
 const related='<aside class="related-products"><h3>OTHER ROASTS YOU\'LL LOVE</h3><h3>Descafeinado</h3><p>Decaf, naturally processed; notes of blueberries and pralines.</p></aside><section class="education"><h2>ORGANIC COFFEE</h2><p>Stress reducing antioxidants, nutrient rich coffee.</p></section>';
 const seo='<meta name="description" content="Descafeinado naturally processed blueberry praline Guatemala, dark roast">';
 const p=extractPublicCoffeeFacts(html(own,seo,related),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.process||''),/natural/i);
 assert.doesNotMatch(String(p.fields.origin||''),/guatemala/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberr|praline|antioxidant|stress reducing/i);
 assert.ok(!p.fields.decaffeination_method,'unrelated Descafeinado does not decaffeinate El Corazon');
});
test('R313 substitution warning never certifies lot, wrong identity and absent pages fail closed',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.ok(!p.fields.release_label,'no named release in merchant substitution disclaimer');
 assert.equal(identicalCurrentSelectedTitle(name,'Descafeinado','Descafeinado'),false);
 const good={number:42,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
  current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([42],[good]),[]);
 for(const bad of [[],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],
  [{...good,selected_heading_identity_verified:false}],[{...good,add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([42],bad).length>0);
});

test('R313 source review semantic profile facts identify their OWN captions',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 for(const [field,value,heading] of [
  ['origin','Honduras','Country of Origin'],
  ['producer','Flor del Cafe','Producer'],
  ['process','Washed','Processing Method']
 ]){
  const rows=(p.source_facts||[]).filter(f=>f.field===field&&f.value===value);
  assert.ok(rows.length>0,'review evidence for '+field);
  assert.ok(rows.some(f=>String(f.section||'').includes(heading)),
   'source review heading '+heading+' must follow matched own fact');
 }
});
