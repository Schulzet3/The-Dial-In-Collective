import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedCoffeeRoastVariants} from '../src/server/coffee-roast-variants.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.ketchcoffee.com/products/tier-2-decaf-colombia-el-vergel-estate-natural-process';
const name='Tier 2: Decaf Colombia EL Vergel Estate Natural Process';
const handle='tier-2-decaf-colombia-el-vergel-estate-natural-process';
const options=[{name:'Roast Level',values:['Light','Medium-dark']},{name:'Amount',values:['8 oz Bag','16 oz Bag']}];
const prose=[
 '<h3>FLAVOR PROFILE (What we taste)</h3>',
 '<p>The importers flavor notes included tropical fruits, strawberry, and orange. We struggled to pick out specific fruit notes.</p>',
 '<p>As a light roast, this coffee has red fruit notes that reminded us of raspberries, moderate sweetness, lower acidity, and a heavier body.</p>',
 '<p>As a medium-dark roast, this coffee has notes of cooked fruit and caramelized sugars, moderate sweetness, low acidity, and a heavier body.</p>',
 '<h3>RECOMMENDED BREWING METHODS</h3>',
 '<p>As a light roast, if you decide to brew it as espresso, we recommend 203-205F and a 1:3 ratio (e.g., 18 grams of coffee to 54 grams of coffee in the cup).</p>',
 '<p>As a medium-dark roast, for espresso, we recommend 200-202F and a 1:2 ratio.</p>',
 '<h3>ABOUT THIS COFFEE</h3>',
 '<p>Producers: Elias and Shady Bayter</p><p>Country: Colombia</p><p>Region: Tolima</p>',
 '<p>Varietals: Red and Yellow Caturra</p><p>Process: Natural + EA Sugarcane Decaf</p>',
 '<p>Altitude/elevation: 1450 MASL</p><p>Harvest Period: October to December 2025</p>'
].join('');
const selected={title:name,handle,vendor:'Ketch Coffee Roasters',options,description:prose};
test('#505 purchased roast flavors and espresso recipes do not mix or borrow importers notes',()=>{
 const v=extractSelectedCoffeeRoastVariants({description:prose,options});
 assert.deepEqual(v.map(x=>[x.id,x.fields.roast_level]),[['light','Light'],['medium-dark','Medium-Dark']]);
 assert.match(v[0].fields.tasting_notes,/red fruit/i);
 assert.match(v[1].fields.tasting_notes,/cooked fruit.*caramelized sugars/i);
 assert.doesNotMatch(JSON.stringify(v),/strawberry|orange|importer/i);
 assert.equal(v[0].roaster_recipe?.ratio,3);
 assert.equal(v[0].roaster_recipe?.dose_g,18);
 assert.equal(v[0].roaster_recipe?.yield_g,54);
 assert.equal(v[1].roaster_recipe?.ratio,2);
 assert.equal(v[1].roaster_recipe?.dose_g,undefined);
});
test('#505 exact selected Shopify coffee never chooses a roast, flavor or recipe without member action',()=>{
 const p=extractShopifyAjaxData(selected,shopifyProductRequest(url));
 assert.equal(p?.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,name);
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.tasting_notes,undefined);
 assert.equal(p.roaster_recipe,undefined);
 assert.deepEqual(p.roast_variants?.map(x=>x.id),['light','medium-dark']);
 const m=mergePublicProductPreview({ok:true,source_url:url,fields:{name}},p);
 assert.equal(m.fields.roast_level,undefined);
 assert.equal(m.fields.tasting_notes,undefined);
 assert.equal(m.roaster_recipe,undefined);
 assert.match(coffeeUrlPreviewMarkup(m),/Which roast did you buy\?/);
 assert.ok(coffeeSourceReviewSnapshot({...m,source_url:url}));
 const l=coffeeRoastVariantPreview(m,'light'),d=coffeeRoastVariantPreview(m,'medium-dark');
 assert.equal(l.fields.roast_level,'Light');
 assert.equal(d.fields.roast_level,'Medium-Dark');
 assert.notEqual(l.fields.tasting_notes,d.fields.tasting_notes);
 assert.equal(l.roaster_recipe.ratio,3);
 assert.equal(d.roaster_recipe.ratio,2);
});
test('other purchase controls, unavailable variant and washed sibling cannot transfer evidence',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:prose}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:prose,options:[{name:'Grind',values:['Light','Medium-dark']}]}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:prose,options:[{name:'Roast Level',values:['Light']}]}),[]);
 const washed=extractShopifyAjaxData({...selected,handle:'tier-2-decaf-colombia-el-vergel-estate-washed-process',description:prose.replace('Process: Natural','Process: Washed')},shopifyProductRequest(url));
 assert.equal(washed,null);
});
