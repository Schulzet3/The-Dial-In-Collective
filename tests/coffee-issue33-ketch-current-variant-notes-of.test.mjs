// Issue #33 original603 Ketch #507: two purchasable roasts, each with
// different CURRENT official flavor notes, never one global default.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedCoffeeRoastVariants,extractSelectedCoffeeRoastVariantsFromHtml} from '../src/server/coffee-roast-variants.mjs';
import {shopifyProductRequest,extractShopifyAjaxData} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://www.ketchcoffee.com/products/tier-3-mexico-san-isidro-zoquiapan';
const name='Tier 3: Mexico San Isidro Zoquiapan';
const options=[{name:'Roast Level',values:['Light','Medium-dark']},{name:'Amount',values:['8 oz Bag','16 oz Bag','5lb Bag']}];
const prose=[
 '<h3>FLAVOR PROFILE (What we taste)</h3>',
 '<p>We purchased this coffee primarily to be the new base of our Dark Expressions Blend, but we always seek interesting single origins.</p>',
 '<p>As a light roast, this coffee had notes of chocolate, red apple, and mild nuttiness. As it aged, the cup became more complex with citric notes like grapefruit.</p>',
 '<p>As a medium-dark roast, this coffee has traditional coffee notes of chocolate and caramel and is just a really good cup of coffee.</p>',
 '<h3>RECOMMENDED BREWING METHODS</h3>',
 '<p>As a light roast, we have only brewed it as a filter and immersion. If you decide to brew it as espresso, we recommend 203-205F and a 1:3 ratio.</p>',
 '<p>As a medium-dark roast, this coffee is versatile. For espresso, use 200-202F and a 1:2 ratio.</p>',
 '<h3>ABOUT THIS COFFEE</h3><p>Country: Mexico</p><p>Process: Washed</p>'
].join('');
const selectedHtml=(body=prose,control='<fieldset class="product-form__input"><legend>Roast Level</legend><input type="radio" name="Roast Level" value="Light"><input type="radio" name="Roast Level" value="Medium-dark"></fieldset>')=>
 '<html><head><meta property="og:type" content="product"></head><body><main id="MainContent"><h1>'+name+'</h1>'+control+'<section class="product__description">'+body+'</section></main></body></html>';

test('current Ketch Tier 3 per-roast notes-of sentences map to their own variants',()=>{
 const rows=extractSelectedCoffeeRoastVariants({description:prose,options});
 assert.deepEqual(rows.map(row=>[row.id,row.fields.roast_level,row.fields.tasting_notes]),[
  ['light','Light','Chocolate, red apple, mild nuttiness'],
  ['medium-dark','Medium-Dark','Chocolate, caramel']]);
 assert.deepEqual(rows.map(row=>row.roaster_recipe?.ratio),[3,2]);
 assert.ok(rows.every(row=>!JSON.stringify(row.fields).includes('Grapefruit')));
});
test('actual Add Coffee Shopify URL preview withholds unspecified roast and selects only its notes',()=>{
 const request=shopifyProductRequest(url);
 const data={title:name,handle:'tier-3-mexico-san-isidro-zoquiapan',
  vendor:'Ketch Coffee Roasters',options,description:prose};
 const parsed=extractShopifyAjaxData(data,request);
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.roast_level,undefined);
 assert.equal(parsed.fields.tasting_notes,undefined);
 assert.equal(parsed.roaster_recipe,undefined);
 assert.deepEqual(parsed.roast_variants.map(row=>row.fields.tasting_notes),[
  'Chocolate, red apple, mild nuttiness','Chocolate, caramel']);
 assert.match(coffeeUrlPreviewMarkup(parsed),/Which roast did you buy\?/);
 for(const [id,notes] of [['light','Chocolate, red apple, mild nuttiness'],['medium-dark','Chocolate, caramel']]){
  const chosen=coffeeRoastVariantPreview(parsed,id);
  assert.equal(chosen.fields.tasting_notes,notes);
  assert.match(coffeeUrlPreviewMarkup(chosen),/Selected roast:/);
 }
});
test('visible selected product Roast Level options permit HTML-only fallback',()=>{
 const rows=extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml());
 assert.deepEqual(rows.map(row=>row.fields.tasting_notes),[
  'Chocolate, red apple, mild nuttiness','Chocolate, caramel']);
});
test('generic roast prose or unrelated purchase options never invent variant notes',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:prose}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:prose,options:[{name:'Grind',values:['Light','Medium-dark']}]}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml(prose,
  '<fieldset><legend>Grind</legend><input type="radio" value="Light"><input type="radio" value="Medium-dark"></fieldset>')),[]);
});
test('past lots and competing current notes-of lists cannot create a preferred roast',()=>{
 const old=prose.replace('this coffee had notes of chocolate, red apple, and mild nuttiness',
  'this coffee previously had notes of chocolate, red apple, and mild nuttiness');
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:old,options}),[]);
 const conflicting=prose.replace('As a light roast, this coffee had notes of chocolate, red apple, and mild nuttiness.',
  'As a light roast, this coffee had notes of chocolate, red apple, and mild nuttiness. This coffee has notes of papaya and clove.');
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:conflicting,options}),[]);
});
test('reject descriptions that are actually cup/roast guidance, not flavor descriptors',()=>{
 const corrupted=prose.replace('notes of chocolate, red apple, and mild nuttiness',
  'notes of brewing temperature, ratio, and roast profile');
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:corrupted,options}),[]);
});
test('existing Ketch Tier 2 before-notes format stays unchanged',()=>{
 const original=[
  'As a light roast, this coffee has floral and blackberry notes, moderate sweetness.',
  'As a medium-dark roast, this coffee has blackberry and caramelized sugar notes, moderate sweetness.'
 ].join(' ');
 const rows=extractSelectedCoffeeRoastVariants({description:original,options});
 assert.deepEqual(rows.map(row=>row.fields.tasting_notes),['Floral, blackberry','Blackberry, caramelized sugar']);
});
