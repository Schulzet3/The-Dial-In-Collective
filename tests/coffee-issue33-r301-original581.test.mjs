// #33 R301 original603 #581: selected Tandem Heri Agena direct labelled notes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeFieldKey} from '../src/server/coffee-semantic-specs.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Heri Agena - Ethiopia',url='https://www.tandemcoffee.com/products/heri-agena-ethiopia';
const direct='<div class="coffee-details"><h2>Details</h2><dl>'+
 '<dt>Producer</dt><dd>Smallholder Farmers</dd>'+
 '<dt>Varietals</dt><dd>Heirloom</dd>'+
 '<dt>Elevation</dt><dd>2380-2500 MASL</dd>'+
 '<dt>Processing</dt><dd>Washed</dd>'+
 '<dt>We hear</dt><dd>Plum, Lemonade, Wildflower Honey, <a href="https://www.youtube.com/watch?v=music">Cleo</a></dd>'+
 '</dl></div>';
const narrative='<p>This microlot is the first of four coffees from Karamo Coffee, working in Bensa and Bura in Sidama.</p>'+
 '<p>Approximately 500 smallholder farmers contribute to the lot from Agena station.</p>'+
 '<p>The resulting cup is clean, crisp, and complex, with focused stone fruit, dense tropical flavors, white florals, juicy acidity and coating sweetness.</p>';
const build=(name=title,own=direct,story=narrative)=>'<html><head><meta name="description" content="OTHER COFFEE: Espresso 2024 blueberry, dark roast"></head><body><main>'+
 '<article class="product"><h1>'+name+'</h1><p>Bensa, Sidama Ethiopia</p>'+
 '<section class="description">'+story+'</section>'+own+'</article></main>'+
 '<aside class="related-products"><h2>Other coffees</h2><p>Kenya Estate, Blueberry, Decaf.</p></aside></body></html>';
test('R301 direct merchant We hear is an actual selected sensory field, not a generic page title',()=>{
 assert.equal(coffeeFieldKey('We hear'),'tasting_notes');
 assert.equal(coffeeFieldKey('We hear:'),'tasting_notes');
 assert.equal(coffeeFieldKey('Music'),undefined);
});
test('R301 exact selected H1 identity, not an old lot or other product',()=>{
 assert.deepEqual(selectedProductHeadings(productMarkup(build())),[title]);
 for(const other of ['Heri Agena - Ethiopia, 2024','Heri Agena - Ethiopia Decaf','Cleo - Ethiopia'])
  assert.equal(identicalCurrentSelectedTitle(title,other,other),false);
});
test('R301 current selected direct notes outrank secondary narrative; YouTube Cleo is music not a flavor',()=>{
 const r=extractPublicCoffeeFacts(build(),{source_url:url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,title);
 const notes=String(r.fields.tasting_notes||'');
 console.log('[R301 DL CONFLICT DIAGNOSTIC] '+JSON.stringify({fields:r.fields,conflicts:r.conflicts,related:(r.source_facts||[]).filter(f=>/we hear|plum|cleo|tasting/i.test(String(f.label||'')+' '+String(f.value||''))).slice(0,16)}));
 for(const note of ['Plum','Lemonade','Wildflower Honey'])assert.match(notes,new RegExp(note,'i'));
 assert.doesNotMatch(notes,/\bCleo\b|blueberry|dark roast|tropical flavors|stone fruit/i);
 assert.ok(!r.seo_fallback_fields?.includes('tasting_notes'));
 assert.equal(r.fields.process,'Washed');
 assert.ok(!r.fields.roast_level&&!r.fields.release_label&&!r.fields.decaffeination_method);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...r,source_url:url})?.type,'coffee_source_review');
});
test('R301 alternative explicit HTML heading and plain text direct notes remain selected',()=>{
 const own='<section class="coffee-details"><h2>We hear</h2><p>Plum, Lemonade, Wildflower Honey</p></section>';
 const r=extractPublicCoffeeFacts(build(title,own,narrative),{source_url:url});
 assert.equal(r.ok,true);
 for(const note of ['Plum','Lemonade','Wildflower Honey'])
  assert.match(String(r.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/stone fruit|blueberry/i);
});
test('R301 foreign selected title cannot inherit Heri Agena notes or producer',()=>{
 const r=extractPublicCoffeeFacts(build('Different Coffee - Peru','<section><h2>Tasting Notes</h2><p>Cacao, Apple</p></section>',''),{source_url:url});
 assert.equal(r.ok,true);assert.notEqual(r.fields.name,title);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/Plum|Wildflower Honey/i);
 assert.doesNotMatch(String(r.fields.producer||''),/Karamo|Smallholder Farmers/i);
});
test('R301 official-source and selected/Add Coffee review guard rejects missing or misleading evidence',()=>{
 const record={number:581,archived_coffee:title,status:'FETCHED',parser_ok:true,
  selected_h1:[title],selected_h1_present_in_scoped_html:true,
  selected_heading_identity_verified:true,current_fields:{name:title},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([581],[record]),[]);
 for(const bad of [[],[record,record],[{...record,status:'UNAVAILABLE'}],
  [{...record,parser_ok:false}],[{...record,selected_heading_identity_verified:false}],
  [{...record,add_coffee_ui_rendered:false}],[{...record,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([581],bad).length>0);
});

test('R301 actual Shopify pmitem sensory label excludes a linked music title',()=>{
 const own='<div class="prodmeta"><div class="pmitem"><div class="metafield-label">Producer</div>'+
 '<div class="metafield-details"><p>Smallholder Farmers</p></div></div>'+
 '<div class="pmitem"><div class="metafield-label">We hear</div>'+
 '<div class="metafield-details"><p>Plum, Lemonade, Wildflower Honey, '+
 '<a href="https://www.youtube.com/watch?v=music">Cleo</a></p></div></div></div>';
 const r=extractPublicCoffeeFacts(build(title,own,narrative),{source_url:url});
 assert.equal(r.ok,true);
 for(const note of ['Plum','Lemonade','Wildflower Honey'])
  assert.match(String(r.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/\bCleo\b|stone fruit|tropical flavors/i);
});
test('R301 a nonmusic linked actual flavor is not silently dropped',()=>{
 const own='<div class="prodmeta"><div class="pmitem"><div class="metafield-label">We hear</div>'+
 '<div class="metafield-details"><p>Plum, Lemonade, '+
 '<a href="https://example.org/coffee/flavor">Wildflower Honey</a></p></div></div></div>';
 const r=extractPublicCoffeeFacts(build(title,own,''),{source_url:url});
 assert.equal(r.ok,true);
 assert.match(String(r.fields.tasting_notes||''),/Wildflower Honey/i);
});
