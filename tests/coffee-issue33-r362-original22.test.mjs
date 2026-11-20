import test from 'node:test';
import assert from 'node:assert/strict';
import {selected22,selectedName,selectedUrl,norm} from '../scripts/audit/issue33-r362-original22-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const direct='<h2>A rich and incredibly sweet cup, with fruit-forward notes of raspberry, jam, cranberry and cherry.</h2>'+
 '<p>COMSA is a farmer cooperative in Honduras.</p><p>Altitude: 1220 MASL</p>'+
 '<p>Varietal: Bourbon, Catuai, Caturra, Typica</p><p>Process: Natural</p>'+
 '<p>Harvest: December - April</p>';
const html=(name=selectedName,body=direct,other='')=>'<html><head><title>Light Roast Organic Specialty Coffee — shop</title></head><body>'+
 '<nav>Menu Light Roast Organic Specialty Coffee; Other Beans: Dark Chocolate</nav>'+
 '<main><div class="breadcrumbs"><a href="/">Home</a><a href="/collections/light-roast-organic-specialty-coffee">Light Roast Organic Specialty Coffee</a><span>'+name+'</span></div><article class="product"><h1>'+name+'</h1><div class="product__description">'+body+'</div></article></main>'+
 other+'<footer>Other seasonal products</footer></body></html>';
test('R362 exact own H1 and direct sensory/process/varietal/altitude/harvest facts',()=>{
 const s=selected22(html());assert.equal(s.identity,true);assert.equal(s.notes,true);assert.equal(s.natural,true);
 assert.equal(s.variety,true);assert.equal(s.altitude,true);assert.equal(s.harvest,true);assert.equal(s.ownRoastLiteral,false);
});
test('R362 menu roast and legacy SEO title never constitute selected literal roast',()=>{
 assert.equal(selected22(html()).ownRoastLiteral,false);
 assert.equal(selected22(html(selectedName,direct+'<p>Roast Level: Medium</p>')).ownRoastLiteral,true);
});
test('R362 reject a different selected coffee even with identical old URL',()=>{
 assert.equal(selected22(html('Other Honduras Coffee')).identity,false);
});
test('R362 unrelated coffee notes cannot substitute for missing selected description',()=>{
 assert.equal(selected22(html(selectedName,direct.replace('raspberry, jam, cranberry and cherry','floral aroma'),
   '<aside><p>Raspberry, jam, cranberry and cherry</p></aside>')).notes,false);
});
test('R362 no harvest-as-release semantic promotion in own source classifier',()=>{
 const s=selected22(html());assert.equal(s.harvest,true);
 assert.equal(s.ownRoastLiteral,false);
});
test('R362 source failure, selected identity and no-save UI fail closed',()=>{
 const good={number:22,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
  selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:selectedName},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([22],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([22],[bad]).length>0);
});
test('R362 current parser and no-save UI contracts exist for selected product',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});

test('R362 selected parser excludes named collection breadcrumb, preserving no unsupported roast',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.equal(p.fields?.roast_level,undefined);
});
test('R362 current selected direct Roast Level outranks unrelated Light Roast navigation',()=>{
 const p=extractPublicCoffeeFacts(html(selectedName,direct+'<p>Roast Level: Dark</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(p.fields?.roast_level,'Dark');
});
