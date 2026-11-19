// #33 R321: original603 #93 My Girlfriend's Blend, selected-product Medium/flavors, negative provenance controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://darkcanyon-coffee.com/collections/best-sellers/products/my-girlfriends-blend';
const name="My Girlfriend's Blend";
const own="Indulge in a warm embrace with My Girlfriend's Blend medium roast coffee! This delightful fusion of rich caramel and smooth French vanilla creates an irresistible flavor.";
const html=(description=own,other='',meta='')=>'<html><head><meta property="og:site_name" content="Dark Canyon Coffee Company">'+meta+'</head><body><main><article class="product"><h1>'+name+'</h1><p>'+description+'</p></article></main>'+other+'</body></html>';
const parse=(description=own,other='',meta='')=>extractPublicCoffeeFacts(html(description,other,meta),{source_url:url});

test('R321 source-literal medium roast and caramel/French vanilla belong to exact selected coffee',()=>{
 const p=parse();
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,name);
 assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.tasting_notes||''),/caramel/i);
 assert.match(String(p.fields.tasting_notes||''),/french vanilla/i);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
});

test('R321 sibling coffee and SEO cannot change selected roast, origin, process or flavor',()=>{
 const sibling='<aside class="related-products"><h2>Guatemala Royal</h2><p>Dark roast. Natural anaerobic. Blueberry, peach. Farm Alto, 1900 masl.</p></aside>';
 const seo='<meta name="description" content="Guatemala Royal dark roast blueberry from Guatemala">';
 const p=parse(own,sibling,seo);
 assert.equal(p.ok,true); assert.equal(p.fields.name,name);
 assert.equal(p.fields.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|peach/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Guatemala|South Dakota|Rapid City/i);
 assert.ok(!p.fields.producer && !p.fields.elevation_m);
});

test('R321 body/roast phrase must not manufacture green-coffee processing, cultivar or lot',()=>{
 const p=parse(own+' Smooth body and rich sweetness.');
 assert.equal(p.ok,true);
 for(const field of ['process','variety','producer','elevation_m','decaffeination_method','release_label'])
  assert.ok(!p.fields[field],field+' was not supplied');
});

test('R321 selected explicit Medium is not the generic Light Medium Dark catalog legend',()=>{
 const p=extractPublicCoffeeFacts(html('A sweet flavored coffee with caramel and vanilla.','<aside class="related-products">Light Medium Dark</aside>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,name);
 assert.ok(!p.fields.roast_level,'unselected legend has no selected roast');
});

test('R321 Add Coffee remains a preview and Source Review retains selected source',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});

test('R321 required original current source gate fails closed on UNAVAILABLE, mismatch and missing UI',()=>{
 const good={number:93,status:'FETCHED',archived_coffee:name,parser_ok:true,
  selected_h1:[name],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([93],[good]),[]);
 for(const bad of [[],[{...good,status:'UNAVAILABLE'}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([93],bad).length>0);
});
