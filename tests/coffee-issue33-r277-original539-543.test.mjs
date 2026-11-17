import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const targets=[
 {number:539,name:'Cosa Nueva — Flagship Blend',url:'https://www.radialcoffee.com/products/cosa-nueva-flagship-blend'},
 {number:543,name:'Mexico Chiapas Seasonal Espresso',url:'https://www.rallycoffee.co/products/mexico-chiapas-seasonal-espresso'}
];
const page=(name,description,other='')=>'<html><head><title>Unrelated old espresso: mango, dark roast</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description"><p>'+description+'</p></div></article></main>'+other+'</body></html>';
const row=t=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});

test('original 539/543 require two distinct verified selected identities and review surfaces',()=>{
 const rows=targets.map(row);
 assert.deepEqual(requiredFocusedSourceFailures([539,543],rows),[]);
 for(const wrong of [[rows[0]],[rows[0],rows[0]],[rows[0],{...rows[1],status:'UNAVAILABLE'}],
  [rows[0],{...rows[1],selected_heading_identity_verified:false}],
  [rows[0],{...rows[1],source_review_rendered:false}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([539,543],wrong).length>0);
});

test('current Cosa Nueva own milk-chocolate base outranks stale two-note history',()=>{
 const t=targets[0];
 const story="Discover Cosa Nueva, a powerhouse blend intertwining seasonal coffees sourced from our revered partners. Its milk chocolate base is complemented with notes of stone fruit and honey, culminating in a refreshing, sweet acidity.";
 const html=page(t.name,story,'<aside class="related-products"><h2>Other coffee</h2><p>Guatemala, mango, natural, Swiss Water, 1900m</p></aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const r=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,t.name);
 assert.match(String(r.fields.tasting_notes||''),/milk chocolate/i);
 assert.match(String(r.fields.tasting_notes||''),/stone fruit/i);
 assert.match(String(r.fields.tasting_notes||''),/honey/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/mango/i);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});

test('selected Chiapas cooperative and geographic neighbor do not prove cultivar or park origin',()=>{
 const t=targets[1];
 const story="This coffee comes from Chiapas, Mexico, grown in the highlands near the El Triunfo Biosphere Reserve—one of the most biodiverse cloud forest regions in the world. The lush environment, high elevation, and traditional varieties like Typica, Bourbon, and Caturra create ideal conditions for producing clean, sweet, high-quality coffee. Sourced through the Comon Yaj Noptic cooperative, a group of smallholder farmers founded in 1995, this lot reflects strong regional character.";
 const html=page(t.name,story,'<aside class="related-products">Other coffee: Ethiopia, mango, washed, 2000 masl</aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[t.name]);
 const r=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(r.ok,true);assert.equal(r.fields.name,t.name);
 assert.match(String(r.fields.origin||''),/Chiapas/i);
 assert.match(String(r.fields.origin||''),/Mexico/i);
 assert.doesNotMatch(String(r.fields.origin||''),/El Triunfo|Biosphere/i);
 assert.doesNotMatch(String(r.fields.variety||''),/Typica|Bourbon|Caturra/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/mango/i);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});

test('a recycled product URL, another H1 and unrelated reviews never prove selected identity',()=>{
 const t=targets[0];
 const wrong=extractPublicCoffeeFacts(page('Other Espresso','Milk chocolate, stone fruit, honey'),{source_url:t.url});
 assert.equal(wrong.ok,true);assert.notEqual(wrong.fields.name,t.name);
 const polluted=extractPublicCoffeeFacts(page(t.name,'We roast our flagship coffee for a balanced cup.','<aside class="related-products"><p>Other seasonal coffee: jasmine, berry candy, Swiss Water decaf.</p></aside>'),{source_url:t.url});
 assert.equal(polluted.ok,true);
 assert.doesNotMatch(String(polluted.fields.tasting_notes||''),/jasmine|berry candy/i);
 assert.ok(!polluted.fields.decaffeination_method);
});