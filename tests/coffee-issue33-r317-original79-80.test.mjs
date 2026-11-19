// Issue #33 R317: frozen originals #79 Burundi and #80 Costa Rica, same exact merchant, unrelated/metadata negatives.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const base='https://csrcoffee.com/products/';
const page=(name,body,extra='',meta='')=>'<html><head><meta property="og:site_name" content="Columbia Street Roastery">'+meta+'</head><body><main><article class="product"><h1>'+name+'</h1>'+body+'</article></main>'+extra+'</body></html>';
const parse=(name,body,extra='',meta='')=>extractPublicCoffeeFacts(page(name,body,extra,meta),{source_url:base+name.toLowerCase().replace(/ /g,'-')});
const costa='<h2>Costa Rica Single Origin Coffee – Sweet, Chocolaty, and Bold</h2>'+
 '<p>In the quiet corners of the Costa Rican mountains, a secret was roasting.</p>'+
 '<p>Perfect for home brewers, this washed processed coffee delivers a sweet, chocolaty flavor with a bright, tangy edge. Its medium to heavy body leaves a rich trail of flavor.</p>';
const burundi='<h2>Burundi Single Origin Coffee – Bright, Creamy, and Bold</h2>'+
 '<p>Deep in the rolling hills of Burundi, where mist hugs coffee trees.</p>'+
 '<p>This roast bursts with bright acidity and finishes with a luxuriously creamy body.</p>';
test('R317 current Costa Rica description is washed, but medium-to-heavy BODY is not medium ROAST',()=>{
 const p=parse('Costa Rica',costa);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Costa Rica');
 assert.match(String(p.fields.origin||''),/Costa Rica/i);
 assert.equal(p.fields.process,'Washed');
 assert.ok(!p.fields.roast_level,'unpublished roast must remain editable and blank');
 assert.match(String(p.fields.tasting_notes||''),/chocolat/i);
 assert.deepEqual(selectedProductHeadings(productMarkup(page('Costa Rica',costa))),['Costa Rica']);
});
test('R317 current Burundi acidity and creamy body do not fabricate roast, green process or farm',()=>{
 const p=parse('Burundi',burundi);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Burundi');
 assert.match(String(p.fields.origin||''),/Burundi/i);
 for(const field of ['roast_level','variety','producer','elevation_m','decaffeination_method','release_label'])
  assert.ok(!p.fields[field],field+' is not published');
 assert.ok(!p.fields.process||p.fields.process==='Other/Unknown');
});
test('R317 related dark Kenyan natural and merchant Illinois must not override Costa Rica selected',()=>{
 const related='<aside class="related-products"><h3>Kenya Night</h3><p>Dark Roast, Natural process, cranberry, peach, producer Kameja; 1950 masl</p></aside>';
 const seo='<meta name="description" content="Kenya Night dark roast natural blueberry">';
 const p=parse('Costa Rica',costa,related,seo);
 assert.equal(p.ok,true); assert.equal(p.fields.name,'Costa Rica');
 assert.equal(p.fields.process,'Washed');
 assert.ok(!p.fields.roast_level);
 assert.doesNotMatch(String(p.fields.origin||''),/Illinois|Champaign|Kenya/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|cranberry|peach/i);
 assert.ok(!p.fields.producer&&!p.fields.elevation_m);
});
test('R317 Burundi does not borrow adjacent decaf or tasting notes from another selected coffee',()=>{
 const related='<aside class="product-recommendations"><h3>Other Coffee: Ethiopia Decaf</h3><p>Water Process; Medium roast; blueberry, jasmine; farm Bero</p></aside>';
 const p=parse('Burundi',burundi,related);
 assert.equal(p.ok,true);
 assert.ok(!p.fields.decaffeination_method&&!p.fields.roast_level&&!p.fields.producer);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|jasmine/i);
});
test('R317 Add Coffee and Source Review still require member action and source identity',()=>{
 for(const [n,b] of [['Burundi',burundi],['Costa Rica',costa]]){
  const p=parse(n,b);assert.equal(p.ok,true);
  assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
  assert.equal(coffeeSourceReviewSnapshot({...p,source_url:base+n.toLowerCase().replace(' ','-')})?.type,'coffee_source_review');
 }
 const good=n=>({number:n,archived_coffee:n===79?'Burundi':'Costa Rica',status:'FETCHED',parser_ok:true,
  selected_h1:[n===79?'Burundi':'Costa Rica'],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:n===79?'Burundi':'Costa Rica'},
  add_coffee_ui_rendered:true,source_review_rendered:true});
 assert.deepEqual(requiredFocusedSourceFailures([79,80],[good(79),good(80)]),[]);
 for(const bad of [[],[{...good(79),status:'UNAVAILABLE'},good(80)],[good(79),{...good(80),parser_ok:false}],
  [good(79),{...good(80),selected_heading_identity_verified:false}]])
  assert.ok(requiredFocusedSourceFailures([79,80],bad).length>0);
});
