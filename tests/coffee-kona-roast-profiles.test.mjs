import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedCoffeeRoastVariants} from '../src/server/coffee-roast-variants.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

// Selected Kona Earth product page, checked 2026-10-27; original603 unchanged.
const url='https://konaearth.com/products/100-kona-classic-coffee-8oz-1lb-5lb';
const options=[
 {name:'Size',values:['8oz.','16oz.','5 lb. (Includes discount + free shipping)']},
 {name:'Roast Profile',values:['Medium','Medium Dark (Full City)','Dark','Green Unroasted']}
];
const description=[
 '<p>Meet the everyday cup that started it all. Our 100% Kona Classic Coffee is smooth, full-bodied and roasted on the farm.</p>',
 "<p>Choose your roast; Medium, Medium Dark (Full City), or Dark, and you'll taste notes of nuts, chocolate, caramelized sugar, and bright citrus.</p>",
 '<h3>Details</h3><p>Origin: Award-winning 100% Kona, Hawaii<br>',
 'Roast options: Medium, Medium Dark (Full City), Dark<br>',
 'Grade: Kona Prime 16+<br>Format: Whole bean<br>Sizes: 8 oz, 16 oz, 5 lb<br>',
 'Tasting Notes by Roast:<br>',
 'Medium: Almond, brown sugar, cream, cocoa, apple, jasmine, milk chocolate, orange<br>',
 'Medium Dark (Full City): Roasted nuts, caramelized sugar, tobacco, bittersweet chocolate, lime<br>',
 'Dark: Molasses and bittersweet chocolate</p>',
 '<h3>Ingredients</h3><p>100% Kona coffee.</p>'
].join('');
const data={
 title:'100% Kona Classic Coffee, Award-Winning Whole Bean',
 handle:'100-kona-classic-coffee-8oz-1lb-5lb',
 vendor:'Kona Earth Coffee',options,description
};
const request=shopifyProductRequest(url);
const expected=[
 ['medium','Medium','Almond, brown sugar, cream, cocoa, apple, jasmine, milk chocolate, orange'],
 ['medium-dark','Medium-Dark','Roasted nuts, caramelized sugar, tobacco, bittersweet chocolate, lime'],
 ['dark','Dark','Molasses and bittersweet chocolate']
];
test('Kona Earth: exactly three roasted profiles; Green Unroasted is not a fourth roast',()=>{
 const found=extractSelectedCoffeeRoastVariants({description,options});
 assert.deepEqual(found.map(v=>[v.id,v.fields.roast_level,v.fields.tasting_notes]),expected);
 assert.ok(!found.some(v=>/green/i.test(v.label)));
 assert.ok(found.every(v=>v.roaster_recipe===undefined&&v.sensory===undefined));
});
test('Kona: exact roast notes override broad description, without selecting a default roast',()=>{
 const parsed=extractShopifyAjaxData(data,request);
 assert.equal(parsed?.ok,true);
 assert.deepEqual(parsed.roast_variants.map(v=>[v.id,v.fields.roast_level,v.fields.tasting_notes]),expected);
 assert.equal(parsed.fields.roast_level,undefined);
 assert.equal(parsed.fields.tasting_notes,undefined);
 assert.ok(!parsed.conflicts?.includes('tasting_notes'));
 const combined=mergePublicProductPreview({ok:true,source_url:url,fields:{name:data.title,tasting_notes:'nuts, chocolate, caramelized sugar, bright citrus'}},parsed);
 assert.equal(combined.fields.roast_level,undefined);
 assert.equal(combined.fields.tasting_notes,undefined);
 for(const [id,_,notes] of expected){
  const selected=coffeeRoastVariantPreview(combined,id);
  assert.equal(selected.fields.tasting_notes,notes);
  assert.equal(selected.fields.name,data.title);
  const html=coffeeUrlPreviewMarkup(selected);
  assert.doesNotMatch(html,/<img\b/i);
  assert.doesNotMatch(html,/No roast was selected automatically/);
 }
});
test('No purchased roast option prevents a guide or unrelated paragraph becoming a variant',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description,options:[]}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({
  description,options:[{name:'Grind',values:['Medium','Dark']}]}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({
  description:description.replace('Tasting Notes by Roast:','General information:'),
  options
 }),[]);
});
test('A missing roast-specific notes entry is never populated from generic whole-product prose',()=>{
 const partial=description.replace(/Medium Dark \(Full City\):[^<]+<br>/,'');
 const variants=extractSelectedCoffeeRoastVariants({description:partial,options});
 assert.equal(variants.length,3);
 assert.equal(variants.find(v=>v.id==='medium-dark')?.fields.tasting_notes,undefined);
});
