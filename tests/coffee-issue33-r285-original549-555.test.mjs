// Issue #33 R285: exact selected product synthetic positive/hostile cases.
// Not evidence of independently certified 603 original pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:549,name:'Tanzania Peaberry',url:'https://www.realdope.coffee/products/tanazania-peaberry'},
 {number:555,name:'Organic Timor',url:'https://www.roc2.com/products/organic-timor'}
];
const page=(name,own,siblings='')=>'<html><head><title>Old SEO: other roasts, decaf, mango</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+own+'</div></article></main>'+siblings+'</body></html>';
const rec=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('549/555 selected identity requires both distinct current source pages and editable review',()=>{
 const good=targets.map(rec);
 assert.deepEqual(requiredFocusedSourceFailures([549,555],good),[]);
 for(const bad of [good.slice(0,1),[good[0],good[0]],[{...good[0],status:'UNAVAILABLE'},good[1]],[good[0],{...good[1],selected_heading_identity_verified:false}],[{...good[0],add_coffee_ui_rendered:false},good[1]],[good[0],{...good[1],source_review_rendered:false}]])
   assert.ok(requiredFocusedSourceFailures([549,555],bad).length>0);
});
test('549 selected Tanzania tasting/roast cannot inherit Southern Highlands or recommendation notes',()=>{
 const t=targets[0];
 const own="<p>Single-origin peaberry from Tanzania. Our Tanzania Peaberry is dark roasted but certainly not bitter. This peaberry is full of earth and playful fruity notes with hints of cacao.</p><p>Origin: Tanzania (Peaberry)</p><p>Roast: Dark</p><p>Tasting notes: Earthy, fruity, hints of cacao</p>";
 const html=page(t.name,own,'<aside class="related-products">Burundi Kibingo: peach, raspberry. Previous lot from Southern Highlands. Swiss Water decaf.</aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.roast_level||''),/dark/i);
 assert.match(String(p.fields.tasting_notes||''),/cacao/i);
 assert.doesNotMatch(String(p.fields.origin||''),/southern highlands/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/raspberry|peach/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('555 exact Organic Timor own current sensory arc includes raw sugar finish',()=>{
 const t=targets[1];
 const own="<p>Sourced from the highlands of Timor, this single-origin medium roast offers a bright, clean cup with natural sweetness. Lively notes of pineapple and fresh orange juice lead the way, balanced by a smooth finish of raw sugar. A well-rounded, vibrant coffee that highlights the unique character of its origin in every sip.</p>";
 const html=page(t.name,own,'<aside>Organic Mexican: molasses, caramel and lemongrass; decaf via Swiss Water. Customer reviews say mango.</aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const p=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,t.name);
 assert.match(String(p.fields.roast_level||''),/medium/i);
 for(const note of ['pineapple','fresh orange juice','raw sugar'])assert.ok(String(p.fields.tasting_notes||'').toLowerCase().includes(note),'missing direct current literal '+note);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/molasses|caramel|lemongrass|mango/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:t.url}));
});
test('a recycled original URL cannot make a replacement current H1 equal the archived coffee',()=>{
 for(const t of targets){
  const p=extractPublicCoffeeFacts(page('Another coffee','<p>Roast: Dark. Tasting notes: mango, papaya.</p>'),{source_url:t.url});
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.name,t.name);
 }
});
