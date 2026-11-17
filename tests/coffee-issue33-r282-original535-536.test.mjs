import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const selected=[
 {number:535,name:'-FIRST CLASS - LAS NUBES WUSH WUSH, RISARALDA, COLOMBIA',url:'https://www.paperplanecoffee.com/products/first-class-las-nubes-wush-wush-risaralda-colombia'},
 {number:536,name:'(micro plane) las lajas, alma negra natural, cost rica',url:'https://www.paperplanecoffee.com/products/micro-plane-las-lajas-alma-negra-natural-cost-rica'}
];
const fixture=(name,story,aside='')=>'<html><head><title>Storewide Mexico Cerro Azul seasonal products</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+story+'</div></article></main><aside class="related-products">'+aside+'</aside></body></html>';
const fake=(t)=>({number:t.number,archived_coffee:t.name,status:'FETCHED',parser_ok:true,selected_h1:[t.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:t.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('535/536 source acceptance requires both chosen product identities and an editable review',()=>{
 const rows=selected.map(fake);
 assert.deepEqual(requiredFocusedSourceFailures([535,536],rows),[]);
 for(const bad of [[rows[0]],[rows[0],rows[0]],
  [rows[0],{...rows[1],status:'UNAVAILABLE'}],
  [rows[0],{...rows[1],selected_heading_identity_verified:false}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}],
  [rows[0],{...rows[1],source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([535,536],bad).length>0);
});
test('535 selected Las Nubes stays Colombian and does not borrow the Spanish-locale Cerro Azul product',()=>{
 const t=selected[0];
 const source='<p>TASTING NOTES: MILK CHOCOLATE, ORANGE PEEL, AMBER HONEY, PINK PEPPERCORN.</p><p>ORIGIN COLOMBIA. REGION RISARALDA. FARM LAS NUBES. VARIETY WUSH WUSH. ALTITUDE 2,000 METERS. PROCESS METHOD NATURAL, ANAEROBIC FERMENTATION.</p><p>High in the mountains of Pereira. Returned late 2024 for this final harvest.</p>';
 const markup=fixture(t.name,source,'<h2>-PRIMERA CLASE - CERRO AZUL, MEXICO</h2><p>Strawberry, Yuzu, Plum, Swiss Water decaf and Dark roast.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const r=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,t.name);
 assert.match(String(r.fields.origin||''),/colombia/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/strawberry|yuzu|plum/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('536 chosen Alma Negra is Costa Rican, with no neighboring Las Nubes or merely likely cultivars',()=>{
 const t=selected[1];
 const source='<p>TASTING NOTES: DRIED CRANBERRY, BLACKBERRY, HIBISCUS, LAVENDER.</p><p>ORIGIN COSTA RICA. REGION CENTRAL VALLEY. PRODUCER OSCAR & FRANCISCA CHACÓN - LAS LAJAS MICROMILL. FARM / LOT FINCA MIRELLA - F5.</p><p>VARIETY COMMON COSTA RICAN VARIETIES. Likely a mix of Caturra, Catuai, Bourbon and other local varieties.</p><p>PROCESS METHOD ALMA NEGRA NATURAL. Alma Negra dried cherries in greenhouse and on raised beds.</p>';
 const markup=fixture(t.name,source,'<h2>FIRST CLASS - LAS NUBES</h2><p>Pink peppercorn, milk chocolate, amber honey, anaerobic fermentation.</p>');
 assert.deepEqual(selectedProductHeadings(productMarkup(markup)),[t.name]);
 const r=extractPublicCoffeeFacts(markup,{source_url:t.url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,t.name);
 assert.match(String(r.fields.origin||''),/costa rica/i);
 assert.doesNotMatch(String(r.fields.tasting_notes||''),/pink peppercorn|amber honey/i);
 assert.ok(!r.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(r).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:t.url}));
});
test('recycled SEO and other-locale selected product name cannot qualify as either original',()=>{
 for(const t of selected){
  const other=fixture('-PRIMERA CLASE - CERRO AZUL, MÉXICO NATURAL ANAERÓBICO','<p>Mexico strawberry yuzu chocolate and plum; not Las Nubes or Las Lajas.</p>');
  const p=extractPublicCoffeeFacts(other,{source_url:t.url});
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.name,t.name);
 }
});
