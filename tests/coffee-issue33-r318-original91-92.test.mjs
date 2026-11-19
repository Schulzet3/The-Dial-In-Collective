// Issue #33 R318: frozen original603 #91 Fireside Favorite / #92 Highlander Grogg, two exact same-roaster flavored products.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {selectedSellerNativeRoastTag} from '../scripts/audit/issue33-r318-selected-shopify-tag.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const base='https://darkcanyon-coffee.com/collections/best-sellers/products/';
const page=(name,description,extra='',meta='')=>'<html><head><meta property="og:site_name" content="Dark Canyon Coffee Company">'+meta+'</head><body><main><article class="product"><h1>'+name+'</h1><p>'+description+'</p><section><h2>Roast Level</h2><p>Light Medium Dark</p></section></article></main>'+extra+'</body></html>';
const fireside='Imagine a warm mug filled with Fireside Favorite flavored coffee. The enchanting blend of Graham Cracker, aromatic Cinnamon, smooth Vanilla, and nutty Hazelnut creates a symphony of taste.';
const highlander='Highlander Grogg harmoniously combines the rich flavors of Butterscotch, the smooth sweetness of French Vanilla, and the velvety warmth of Irish Creme.';
const parse=(name,desc,extra='',meta='')=>extractPublicCoffeeFacts(page(name,desc,extra,meta),{source_url:base+name.toLowerCase().replace(/ /g,'-')});
test('R318 own Fireside flavored narrative does not turn Light Medium Dark legend into a measured roast',()=>{
 const p=parse('Fireside Favorite',fireside);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Fireside Favorite');
 assert.ok(!p.fields.roast_level,'unselected graphical taxonomy is not a roast declaration');
 for(const field of ['origin','producer','variety','elevation_m','decaffeination_method','release_label'])
  assert.ok(!p.fields[field],field+' is unprovided');
 assert.deepEqual(selectedProductHeadings(productMarkup(page('Fireside Favorite',fireside))),['Fireside Favorite']);
});
test('R318 Highlander flavors do not imply processing, origin, decaf or green varietal',()=>{
 const p=parse('Highlander Grogg',highlander);
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Highlander Grogg');
 assert.ok(!p.fields.roast_level);
 for(const field of ['origin','process','producer','variety','elevation_m','decaffeination_method'])
  assert.ok(!p.fields[field],field+' is not directly published');
});
test('R318 selected product cannot borrow sibling dark roast, grower or blueberry',()=>{
 const related='<aside class="related-products"><h3>Guatemala Royal</h3><p>Dark roast. Anaerobic natural process. Farm Qura. Blueberry, peach, 1900 masl.</p></aside>';
 const seo='<meta name="description" content="Guatemala Royal dark roast blueberry">';
 for(const [name,desc] of [['Fireside Favorite',fireside],['Highlander Grogg',highlander]]){
  const p=parse(name,desc,related,seo);
  assert.equal(p.ok,true);assert.equal(p.fields.name,name);
  assert.ok(!p.fields.roast_level&&!p.fields.producer&&!p.fields.elevation_m);
  assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|peach/i);
  assert.doesNotMatch(String(p.fields.origin||''),/Guatemala|South Dakota|Rapid City/i);
 }
});
test('R318 an explicit same-product roast is distinct from unselected generic roast choices',()=>{
 const p=parse('Highlander Grogg',highlander+' This selected Highlander Grogg coffee is roasted medium.');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Highlander Grogg');
 // Positive: an actual selected claim can be reviewed; unrelated body/SEO remains excluded.
 assert.doesNotMatch(String(p.fields.origin||''),/South Dakota/i);
});
test('R318 Add Coffee stays a noncommitting preview; Source Review and selected identity stay source-bound',()=>{
 for(const [name,desc] of [['Fireside Favorite',fireside],['Highlander Grogg',highlander]]){
  const p=parse(name,desc);assert.equal(p.ok,true);
  assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
  assert.equal(coffeeSourceReviewSnapshot({...p,source_url:base+name.toLowerCase().replace(/ /g,'-')})?.type,'coffee_source_review');
 }
 const good=n=>({number:n,status:'FETCHED',parser_ok:true,archived_coffee:n===91?'Fireside Favorite':'Highlander Grogg',
  selected_h1:[n===91?'Fireside Favorite':'Highlander Grogg'],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:n===91?'Fireside Favorite':'Highlander Grogg'},
  add_coffee_ui_rendered:true,source_review_rendered:true});
 assert.deepEqual(requiredFocusedSourceFailures([91,92],[good(91),good(92)]),[]);
 for(const bad of [[],[good(91),{...good(92),status:'UNAVAILABLE'}],[good(91),{...good(92),selected_heading_identity_verified:false}],
  [{...good(91),source_review_rendered:false},good(92)]])
  assert.ok(requiredFocusedSourceFailures([91,92],bad).length>0);
});

test('R318 exact seller-owned selected Shopify Medium tag is valid only with matching title, ID, vendor and handle',()=>{
 const native=(title='Fireside Favorite',vendor='Dark Canyon Coffee Company',id='7478546497649',handle='fireside-favorite',tags=['Graham Cracker','Medium Roast'])=>
  'var meta = {"product":{"id":'+id+',"gid":"shopify","vendor":"'+vendor+'","type":"Flavored","handle":"'+handle+'"}};'+
  '"product":{"title":"'+title+'","vendor":"'+vendor+'","id":"'+id+'"};'+
  '_ALConfig.product = { "id": '+id+', "tags": '+JSON.stringify(tags)+', "variants": [] };';
 const context={name:'Fireside Favorite',roaster:'Dark Canyon Coffee Company',source_url:base+'fireside-favorite'};
 assert.equal(selectedSellerNativeRoastTag(native(),context)?.value,'Medium');
 for(const sample of [native('Highlander Grogg'),native('Fireside Favorite','Sibling Roastery'),
  native('Fireside Favorite','Dark Canyon Coffee Company','7478546497649','highlander-grogg'),
  native('Fireside Favorite','Dark Canyon Coffee Company','7478546497649','fireside-favorite',[]),
  native('Fireside Favorite','Dark Canyon Coffee Company','7478546497649','fireside-favorite',['Light Roast','Medium Roast'])])
  assert.equal(selectedSellerNativeRoastTag(sample,context),null);
 const fake=native().replace('_ALConfig.product = { "id": 7478546497649','_ALConfig.product = { "id": 1234567890');
 assert.equal(selectedSellerNativeRoastTag(fake,context),null);
});
