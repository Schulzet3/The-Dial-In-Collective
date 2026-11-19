// #33 R322: original603 #95 Daylily Finca la Esperanza; current selected farmer versus farm.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://daylily.coffee/products/colombia-finca-la-esperanza';
const name='Colombia Finca la Esperanza';
const details='<p>Farm: Finca la Esperanza</p><p>Growing Region - San Agustin, Huila</p><p>Cultivar - Caturra</p><p>Growing Elevation - 1400 - 2000 Meters</p><p>Processing Method - Anaerobic Washed</p><p>Tasting Notes: Fruit Punch, Raspberry, Dried Fruit, Caramel, Toffee, Silky Body</p>';
const direct='<p>Faiber Bolanos is a third-generation coffee producer who has been farming in San Agustin, Huila since 1998. He owns the 1.5-hectare Finca La Esperanza and also manages another 2.5 hectares for his mother. Faiber grows Caturra, Pink Bourbon, and Gesha.</p>';
const page=(description=direct,other='')=>'<html><head><meta property="og:site_name" content="Daylily"></head><body><main><article class="product"><h1>'+name+'</h1><h2>Origin Info</h2>'+details+description+'</article></main>'+other+'</body></html>';
const parse=(description=direct,other='')=>extractPublicCoffeeFacts(page(description,other),{source_url:url});

test('R322 exact selected named current grower takes precedence over different Farm caption',()=>{
 const p=parse();
 assert.equal(p.ok,true);assert.equal(p.fields.name,name);
 assert.equal(p.fields.producer,'Faiber Bolanos');
 assert.equal(p.roaster_details?.farm,'Finca la Esperanza');
 assert.deepEqual(selectedProductHeadings(productMarkup(page())),[name]);
});

test('R322 source provides only current selected cultivar, origin, elevation and processing',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/Huila|Colombia/i);
 assert.match(String(p.fields.variety||''),/Caturra/i);
 assert.match(String(p.fields.elevation_m||''),/1400|2000/);
 assert.match(String(p.fields.process||''),/Anaerobic/i);
 assert.match(String(p.fields.tasting_notes||''),/Raspberry|Caramel/i);
 assert.ok(!p.fields.decaffeination_method&&!p.fields.release_label);
});

test('R322 unrelated SKU/SEO cannot supply extra product flavor, person, region or decaf',()=>{
 const related='<aside class="related-products"><h2>Kenya Karindundu</h2><p>Blackberry, Currant, Mango, producer John Karanja. Swiss Water decaf, Kenya.</p></aside>';
 const p=parse(direct,related);assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blackberry|Currant|Mango/i);
 assert.doesNotMatch(String(p.fields.producer||''),/John Karanja/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Kenya/i);
 assert.ok(!p.fields.decaffeination_method);
});

test('R322 a farm caption does not alone establish an individual grower',()=>{
 const p=parse('<p>This selected coffee is from Finca la Esperanza.</p>');
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.producer,'Faiber Bolanos');
});

test('R322 Add Coffee preview remains editable and Source Review retains provenance',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});

test('R322 actual selected official source gate fails closed on unavailable/mismatched source',()=>{
 const good={number:95,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([95],[good]),[]);
 for(const bad of [[],[{...good,status:'UNAVAILABLE'}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([95],bad).length>0);
});
