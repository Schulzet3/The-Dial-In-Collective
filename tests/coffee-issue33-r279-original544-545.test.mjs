import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {selectedFlavoredProductLiteralNotes,isCoarseFlavoredProductTaxonomy} from '../src/server/coffee-selected-flavored-taxonomy.mjs';

const targets=[
 {number:544,archived:'Chai Cheesecake Fall Season Premium Flavored Coffee',current:'Chai Cheesecake — Fall Coffee',url:'https://www.readingcoffee.com/products/chai-cheesecake-fall-season-premium-flavored-coffee'},
 {number:545,archived:"It's Bourbon & Bacon, Hon! Fall Season Premium Flavored Coffee",current:"It's Bourbon & Bacon, Hon! — Fall Coffee",url:'https://www.readingcoffee.com/products/its-bourbon-bacon-hon-fall-season-premium-flavored-coffee'}
];
const row=t=>({number:t.number,archived_coffee:t.archived,status:'FETCHED',parser_ok:true,selected_h1:[t.current],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,current_fields:{name:t.current},original_product_not_certified:true,current_identity_exception:'CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS',add_coffee_ui_rendered:true,source_review_rendered:true});
const page=(name,description,other='')=>'<html><head><title>Old seasonal coffee SEO title: dark roast mango</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description"><p>'+description+'</p></div></article></main>'+other+'</body></html>';

test('original 544/545 changed selected H1s are explicit NEGATIVE identity evidence, not archived coffee certification',()=>{
 const rows=targets.map(row);
 assert.deepEqual(requiredFocusedSourceFailures([544,545],rows,{negativeIdentityNumbers:[544,545]}),[]);
 assert.ok(requiredFocusedSourceFailures([544,545],rows).length>0);
 for(const wrong of [[rows[0]], [rows[0],rows[0]], [rows[0],{...rows[1],selected_heading_identity_verified:true}],
  [rows[0],{...rows[1],current_fields:{name:rows[1].archived_coffee}}],
  [rows[0],{...rows[1],add_coffee_ui_rendered:false}],
  [rows[0],{...rows[1],source_review_rendered:false}]])
   assert.ok(requiredFocusedSourceFailures([544,545],wrong,{negativeIdentityNumbers:[544,545]}).length>0);
});

test('historical titles are not silently treated as current chosen 2026 seasonal identity',()=>{
 for(const t of targets){
  assert.equal(identicalCurrentSelectedTitle(t.archived,t.current,t.current),false);
  assert.equal(identicalCurrentSelectedTitle(t.current,t.current,t.current),true);
  assert.deepEqual(selectedProductHeadings(productMarkup(page(t.current,'Medium roast seasonal flavored coffee'))),[t.current]);
  assert.equal(identicalCurrentSelectedTitle(t.archived,t.archived,t.current),false);
 }
});

test('selected chai-cheesecake spice prose is not evidence for a sibling coffee, decaf method or changed original identity',()=>{
 const t=targets[0];
 const html=page(t.current,'This medium roast is flavored with chai cheesecake, cinnamon, cardamom, ginger and cloves. Optional decaf can be special ordered.',
   '<aside class="related-products"><h2>Other coffee</h2><p>Guatemala mango raspberry natural 1900m Swiss Water decaf</p></aside>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,t.current);
 assert.notEqual(parsed.fields.name,t.archived);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/mango|raspberry/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:t.url}));
});

test('selected Bourbon & Bacon flavor description does not prove real ingredients, a default decaf, or sibling flavors',()=>{
 const t=targets[1];
 const html=page(t.current,'Medium roast with oaky bourbon-like and smoky bacon-like flavors. Available as regular or decaf on special order.',
   '<aside class="related-products">Other espresso: mango, raspberry, Swiss Water, Colombia.</aside>');
 const parsed=extractPublicCoffeeFacts(html,{source_url:t.url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,t.current);
 assert.notEqual(parsed.fields.name,t.archived);
 assert.doesNotMatch(String(parsed.fields.tasting_notes||''),/mango|raspberry/i);
 assert.ok(!parsed.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:t.url}));
});

test('only selected literal flavored-product notes can supersede a broad Flavors taxonomy',()=>{
 const clean=(s,n=6001)=>String(s||'').replace(/<[^<>]{0,1200}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const facts=[{field:'tasting_notes',label:'Flavors',value:'Sweet & Sugary, Spice, Earthy, Savory',source_type:'html'}];
 const actual='<main><h1>Chai Cheesecake — Fall Coffee</h1><h3>Chai Cheesecake - Fall Season Premium Flavored Coffee</h3>'+
 '<p>Exotic warming spices yield notes of cinnamon, cardamom, and ginger balanced with a smooth sweetness.</p>'+
 '<p>This chai cheesecake flavored coffee has creamy notes of velvety cheesecake blended with hints of cinnamon, cardamom, and cloves.</p></main>';
 assert.equal(isCoarseFlavoredProductTaxonomy('Sweet & Sugary, Spice, Earthy, Savory'),true);
 assert.equal(isCoarseFlavoredProductTaxonomy('Chocolate, Lemon, Orange'),false);
 const r=selectedFlavoredProductLiteralNotes(actual,{clean,existing:'Sweet & Sugary, Spice, Earthy, Savory',sourceFacts:facts});
 assert.ok(r,'literal current product flavor evidence');
 for(const literal of ['cinnamon','cardamom','ginger','cloves','cheesecake'])
  assert.match(r.value,new RegExp(literal,'i'));
 assert.equal(selectedFlavoredProductLiteralNotes(actual,{clean,existing:'Chocolate, Lemon, Orange',sourceFacts:facts}),null);
 assert.equal(selectedFlavoredProductLiteralNotes(actual.replace('flavored coffee','coffee'),{clean,existing:'Sweet & Sugary, Spice, Earthy, Savory',sourceFacts:facts}),null);
 assert.equal(selectedFlavoredProductLiteralNotes(actual.replace('<h1>Chai Cheesecake — Fall Coffee</h1>',''),{clean,existing:'Sweet & Sugary, Spice, Earthy, Savory',sourceFacts:facts}),null);
 assert.equal(selectedFlavoredProductLiteralNotes(actual,{clean,existing:'Sweet & Sugary, Spice, Earthy, Savory',sourceFacts:[...facts,{field:'tasting_notes',label:'Cupping Notes',value:'Apple, Cherry',source_type:'html'}]}),null);
});

test('infused current direct bourbon and bacon impressions are flavor notes, not ingredients',()=>{
 const clean=(s,n=6001)=>String(s||'').replace(/<[^<>]{0,1200}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const h='<main><h1>Autumn Bourbon Blend</h1><h3>Autumn Bourbon Blend - Seasonal</h3>'+
 '<p>Smooth oaky notes of bourbon with the smoky richness of crispy bacon, create an unforgettable cup.</p>'+
 '<p>Our Bourbon Blend infused medium roast coffee celebrates autumn richness.</p></main>';
 const facts=[{field:'tasting_notes',label:'Flavors',value:'Spice, Grain & Cereal',source_type:'html'}];
 const r=selectedFlavoredProductLiteralNotes(h,{clean,existing:'Spice, Grain & Cereal',sourceFacts:facts});
 assert.ok(r);
 assert.match(r.value,/bourbon/i);assert.match(r.value,/bacon/i);
 const unsafe=h.replace('Smooth oaky notes','When served with milk, smooth oaky notes');
 assert.equal(selectedFlavoredProductLiteralNotes(unsafe,{clean,existing:'Spice, Grain & Cereal',sourceFacts:facts}),null);
 const sibling='<aside class="related-products"><p>Smooth oaky notes of bourbon with the smoky richness of crispy bacon</p></aside>';
 assert.equal(selectedFlavoredProductLiteralNotes('<main><h1>Autumn Bourbon Blend</h1><h3>Autumn Bourbon Blend</h3><p>Our Bourbon Blend infused medium roast coffee celebrates autumn richness.</p>'+sibling+'</main>',{clean,existing:'Spice, Grain & Cereal',sourceFacts:facts}),null);
});

test('apostrophized selected titles retain an exact current product section prefix',()=>{
 const clean=(s,n=6001)=>String(s||'').replace(/<[^<>]{0,1200}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const markup='<main><h1>It&#39;s Bourbon &amp; Bacon, Hon! — Fall Coffee</h1><h3>It&#39;s Bourbon &amp; Bacon, Hon! - Fall Season Premium Flavored Coffee</h3>'+
 '<p>Smooth, oaky notes of bourbon with the smoky richness of crispy bacon, create a daring cup.</p>'+
 '<p>Discover our Bourbon &amp; Bacon infused medium roast coffee with an unmistakable sensory experience.</p></main>';
 const r=selectedFlavoredProductLiteralNotes(markup,{clean,existing:'Spice, Grain & Cereal',
 sourceFacts:[{field:'tasting_notes',label:'Flavors',value:'Spice, Grain & Cereal',source_type:'html'}]});
 assert.ok(r);
 assert.match(r.value,/bourbon/i);
 assert.match(r.value,/bacon/i);
});

test('a later nonflavor negative sentence never erases earlier positive flavored-coffee description',()=>{
 const clean=(s,n=6001)=>String(s||'').replace(/<[^<>]{0,1200}>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const facts=[{field:'tasting_notes',label:'Flavors',value:'Spice, Grain & Cereal',source_type:'html'}];
 const own='<main><h1>It&#39;s Bourbon &amp; Bacon, Hon! - Fall Coffee</h1>'+
 '<h3>It&#39;s Bourbon &amp; Bacon, Hon! - Fall Season Premium Flavored Coffee</h3>'+
 '<p>Smooth, oaky notes of bourbon with the smoky richness of crispy bacon, create an unforgettable cup.</p>'+
 '<p>Discover our Bourbon &amp; Bacon infused medium roast coffee. The infusion of flavors shines without overpowering the palate. The cup is balanced.</p></main>';
 const actual=selectedFlavoredProductLiteralNotes(own,{clean,existing:'Spice, Grain & Cereal',sourceFacts:facts});
 assert.ok(actual);
 assert.match(actual.value,/bourbon/i);assert.match(actual.value,/bacon/i);
 const unsupported=own.replace('Discover our Bourbon &amp; Bacon infused medium roast coffee.',
   'Previously, the other coffee was a Bourbon &amp; Bacon infused medium roast coffee.');
 assert.equal(selectedFlavoredProductLiteralNotes(unsupported,{clean,existing:'Spice, Grain & Cereal',sourceFacts:facts}),null);
});
