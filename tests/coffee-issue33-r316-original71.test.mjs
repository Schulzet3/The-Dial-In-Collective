// Issue #33 R316: original603 #71, exact Nicaragua selected product. Nonproduction synthetic controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://coppercanyoncoffee.com/products/nicaragua',name='Nicaragua';
const own='<p>Nicaragua has five growing regions. We source our coffee from the Jinotega region, with volcanic soils.</p>'+
 '<p>Country of Origin: Nicaragua</p><p>Region: Jinotega</p>'+
 '<p>Roast Level: Medium</p><p>In the Cup: Nutty, Chocolate, Sweet Acidity, Raspberry, Lemon</p>';
const html=(body=own,extra='',head='')=>'<html><head><meta property="og:site_name" content="Copper Canyon Coffee Roasters">'+head+'</head>'+
 '<body><main><article class="product"><h1>'+name+'</h1>'+body+'</article></main>'+extra+'</body></html>';
const parse=(markup=html())=>extractPublicCoffeeFacts(markup,{source_url:url});
test('R316 exact selected Nicaragua identity, direct flavor and Add Coffee/Source Review',()=>{
 const p=parse();assert.equal(p.ok,true);assert.equal(p.fields.name,name);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[name]);
 for(const note of ['nutty','chocolate','sweet','raspberry','lemon'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R316 direct selected Jinotega Nicaragua, Medium, not roastery city',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.match(String(p.fields.origin||''),/jinotega/i);
 assert.match(String(p.fields.origin||''),/nicaragua/i);
 assert.doesNotMatch(String(p.fields.origin||''),/missouri|battlefield|guatemala/i);
 assert.equal(p.fields.roast_level,'Medium');
 assert.ok(!(p.conflicts||[]).includes('roast_level'));
});
test('R316 unpublished processing, variety, producer, elevation and decaf stay reviewable',()=>{
 const p=parse();assert.equal(p.ok,true);
 for(const key of ['process','variety','producer','decaffeination_method','elevation_m','release_label'])
  assert.ok(!p.fields[key]||key==='process'&&p.fields[key]==='Other/Unknown',key+' is not published');
});
test('R316 exclude related Guatemala Natural, metadata and Missouri roastery from selected facts',()=>{
 const related='<aside class="related-products"><h3>Another coffee</h3><p>Natural processed Guatemala coffee, Dark roast, pineapple, blueberry, named farmer Martin, 1900 masl.</p></aside>';
 const seo='<meta name="description" content="Another coffee: Guatemala, Natural, Dark, blueberry, pineapple">';
 const p=parse(html(own,related,seo));assert.equal(p.ok,true);assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.origin||''),/jinotega/i);
 assert.doesNotMatch(String(p.fields.origin||''),/guatemala|missouri|battlefield/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/blueberr|pineapple/i);
 assert.ok(!/^(Natural|Washed)$/i.test(String(p.fields.process||'')));
});
test('R316 unavailable or substituted selected identity is not accepted as certified original',()=>{
 assert.equal(identicalCurrentSelectedTitle(name,'Guatemala','Guatemala'),false);
 const good={number:71,archived_coffee:name,status:'FETCHED',parser_ok:true,
 selected_h1:[name],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name},
 add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([71],[good]),[]);
 for(const bad of [[],[{...good,status:'UNAVAILABLE'}],[{...good,parser_ok:false}],
  [{...good,selected_heading_identity_verified:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([71],bad).length>0);
});
