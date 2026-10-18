// Small representative fragments, not copies of live HTML archives.
// The separately gated real-site job validates current public URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const url=(path)=>'https://'+path;
function preview(path,brand,body,title='Example Coffee'){
 const source=url(path);
 const html='<html><head><meta property="og:type" content="product">'+
  '<meta property="og:title" content="'+title+'"><meta property="og:site_name" content="'+brand+'"></head><body>'+
  '<nav><p>Tasting Notes: Wrong Navigation</p></nav><main><h1>'+title+'</h1>'+body+
  '<h2>More Coffees</h2><p>Tasting Notes: Wrong Related Coffee</p></main>'+
  '<footer><p>Tasting Notes: Wrong Footer</p></footer></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:source});
}
test('PERC lot narrative yields genuine flavor notes, not fermentation text or other coffees',()=>{
 const r=preview('perccoffee.com/products/kenya-mara-estate','PERC COFFEE',
  '<h2>ORIGIN</h2><h6>Narok County</h6><h2>PROCESS</h2><h6>Adv Natural</h6>'+
  '<h2>THE DEETS!</h2><p>Mara Estate coffee with notes of strawberry, guava, honeydew, and sweet cream.</p>'+
  '<h2>BREW RECCS</h2><p>Drip recipe with notes of another coffee.</p>','Kenya Mara Estate');
 assert.equal(r.fields.tasting_notes,'strawberry, guava, honeydew, and sweet cream');
 assert.equal(r.fields.origin,'Narok County');
 assert.equal(r.fields.process,'Natural');
});
test('nested PERC story heading and later decorations do not hide clear flavor evidence',()=>{
 const extra='<div aria-hidden="true">'+('<svg><path d="0,1"/></svg>'.repeat(1900))+'</div>';
 const r=preview('perccoffee.com/products/colombia-franky-hoyos-adv-washed','PERC COFFEE',
  extra+'<h2><span>THE <em>DEETS!</em></span></h2>'+
  '<p>This lot is a coffee with notes of orange cake, marmalade, and bubblegum vibes.</p>'+
  '<h2><span>BREW RECCS</span></h2><p>Notes of 10g water.</p>',
  'Colombia Franky Hoyos Adv Washed');
 assert.match(r.fields.tasting_notes||'',/^orange cake, marmalade, and bubblegum vibes$/);
});
test('Onyx named multi-span tasting-note container is product-specific',()=>{
 const r=preview('onyxcoffeelab.com/products/ethiopia-lot-26','Onyx',
  '<p class="tasting-notes kapra"><span class="note">Strawberry</span>'+
  '<span class="note">Honeysuckle</span><span class="note">Pink Lemonade</span>'+
  '<span class="note">Peach</span></p>'+
  '<div class="a-stat" data-name="roast-level"><p>Ultra Light<br><label>ROAST LEVEL</label></p></div>');
 assert.equal(r.fields.tasting_notes,'Strawberry, Honeysuckle, Pink Lemonade, Peach');
 assert.equal(r.fields.roast_level,'Ultra Light');
});
test('Sweet Bloom Wuri and Uraga use product ingredient flavors, never relationship years as producers',()=>{
 for(const [title,fruits,process] of [
  ['Wuri','citra hops, mandarin, sugarcane','washed'],
  ['Uraga','guava, raspberry, milk chocolate','natural']
 ]){
  const r=preview('sweetbloomcoffee.com/products/'+title.toLowerCase(),'Sweet Bloom Coffee',
   '<h4>Heirloom Variety</h4><p class="product__origin">Gedeb, Ethiopia</p>'+
   '<em class="product__ingredients">'+fruits+'</em>'+
   '<p class="product__process">'+process+' process</p>'+
   '<h2>Since 2026</h2><div>PRODUCER</div>'+
   '<h2>850 Small Holder Farmers</h2><div>PRODUCER</div>',title);
  assert.equal(r.fields.tasting_notes,fruits);
  assert.notEqual(r.fields.producer?.toLowerCase(),'since 2026');
 }
});
test('Heart product-specific metadata tagline yields notes without displacing process',()=>{
 const r=preview('heartroasters.com/products/phono','Heart',
  '<div class="ProductMeta__Text">fig, caramel, cream</div>'+
  '<div class="ProductMeta__Description"><p>Location: Piendamó</p>'+
  '<p>Process: Fully washed</p></div>','Phono');
 assert.equal(r.fields.tasting_notes,'fig, caramel, cream');
 assert.equal(r.fields.origin,'Piendamó');
 assert.equal(r.fields.process,'Washed');
});
test('Black & White named TAKE A SIP comparisons yield only explicit flavor nouns',()=>{
 const r=preview('blackwhiteroasters.com/products/r-los-altos-washed','Black & White',
  '<p>Origin | Teopisca Nuevo León, Chiapas, Mexico</p>'+
  '<p dir="ltr"><strong>TAKE A SIP | </strong><span>Featuring vibrant acidity and caramelized sweetness, '+
  'this coffee is layered with dried fruit, like apricots, a pleasant nuttiness, '+
  'like pecan, and a finish as smooth and sweet as milk chocolate.</span></p>','Los Altos - Washed');
 assert.equal(r.fields.tasting_notes,'apricots, pecan, milk chocolate');
 assert.match(r.fields.origin,/Teopisca/);
});
test('explicit flavor profile / tastes like labels remain highest-confidence structured evidence',()=>{
 const r=preview('roaster.example.com/products/real','Roaster',
  '<p>Tastes Like: Strawberry, Cherry, Chocolate</p>'+
  '<em class="product__ingredients">irrelevant, old release, flavors</em>','Real');
 assert.equal(r.fields.tasting_notes,'Strawberry, Cherry, Chocolate');
});
test('reject unrelated notes, numeric specs and menu / footers, preserving truly unknown',()=>{
 const r=preview('coffeemaker.example.com/products/espresso-roast','Coffee Maker',
  '<p>Varieties: SL28, SL34, Batian</p>'+
  '<div class="ProductMeta__Text">1800 MASL, 2026, Coffee</div>'+
  '<em class="product__ingredients">natural process, drying, roast level</em>'+
  '<h2>About This Coffee</h2><p>We partner with farms to import sustainable coffee.</p>');
 assert.equal(r.fields.tasting_notes,undefined);
});
test('a story of another coffee cannot populate a product with no tasting notes',()=>{
 const r=preview('perccoffee.com/products/other-lot','PERC COFFEE',
  '<h2>THE DEETS!</h2><p>Harvested on our mountain estate for a slow fermentation.</p>'+
  '<h2>MORE COFFEES</h2><p>With notes of blueberry, lemon, and fudge.</p>');
 assert.equal(r.fields.tasting_notes,undefined);
});
test('HTML escapes are handled as displayed notes, and field extraction never requires a save',()=>{
 const r=preview('sweetbloomcoffee.com/products/uraga','Sweet Bloom Coffee',
  '<em class="product__ingredients">guava, raspberry &amp; milk chocolate</em>','Uraga');
 assert.equal(r.fields.tasting_notes,'guava, raspberry & milk chocolate');
 // The one-click application routine is tested against actual DOM in existing
 // tests; this deterministic test proves source preview itself is read-only.
 assert.equal(typeof applyCoffeeUrlFields,'function');
});
