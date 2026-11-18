// Issue #33 R311: original603 #2 selected durable Brazil/Colombia blend, no stale country or menu leakage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Durable Solution Blend', url='https://1951coffee.com/products/durable-solution';
const own='<p>Approachable yet complex, our blend of South American coffees is currently made up of washed process Brazil and Colombian coffees. Our tasters get caramel, toffee and dark chocolate.</p><p>Roast: Medium</p><p>Origin: Brazi/ Colombian Blend</p><p>Tasting Notes: Caramel, Toffee, Dark Chocolate</p>';
const html=(ownBody=own,extra='',outside='')=>'<html><head><meta property="og:site_name" content="1951 Coffee Company">'+extra+'</head><body><main><article class="product"><h1>'+name+'</h1>'+ownBody+'</article></main>'+outside+'</body></html>';
test('R311 selected original #2 product H1 and explicit member review',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,name);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R311 direct currently Brazil Colombia origin excludes obsolete Guatemala metadata',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/braz/i);
 assert.match(String(p.fields.origin||''),/colomb/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Guatemala|Central America/i);
});
test('R311 directly labeled own medium roast washed and dark chocolate tasting',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(String(p.fields.roast_level||''),/medium/i);
 assert.match(String(p.fields.process||''),/washed/i);
 for(const word of ['caramel','toffee','chocolate'])assert.match(String(p.fields.tasting_notes||'').toLowerCase(),new RegExp(word));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|praline/i);
});
test('R311 unrelated SEO and related coffees cannot inject Guatemala, blueberry, dark roast',()=>{
 const seo='<meta name="description" content="Guatemala Ethiopia dark roast blueberry praline"><meta property="og:description" content="Other 1951 coffee in Central America">';
 const outside='<aside class="related-products"><h2>Other Coffee - Guatemala</h2><p>Dark roast Blueberry Praline natural process</p></aside>';
 const p=extractPublicCoffeeFacts(html(own,seo,outside),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.origin||''),/Guatemala|Central America|Ethiopia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberry|praline/i);
 assert.doesNotMatch(String(p.fields.process||''),/natural/i);
});
test('R311 grind Medium is not roast; switched selected identity and source failure stay reviewable',()=>{
 const onlyGrind='<p>Grind: Whole Bean, Medium (Drip Coffee), Fine (Aeropress)</p><p>Origin: Brazil and Colombia</p>';
 const p=extractPublicCoffeeFacts(html(onlyGrind),{source_url:url});
 assert.equal(p.ok,true);
 assert.ok(!p.fields.roast_level||!String(p.fields.roast_level).toLowerCase().includes('medium'),'Grind Medium is not an explicit Medium roast');
 assert.equal(identicalCurrentSelectedTitle(name,'Different Coffee', 'Different Coffee'),false);
 const good={number:2,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([2],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}]])
  assert.ok(requiredFocusedSourceFailures([2],bad).length>0);
});
