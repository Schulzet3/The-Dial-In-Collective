// Small representative fragments, not copies of live HTML archives.
// The separately gated real-site job validates current public URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {applyCoffeeUrlFields,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';

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
test('product scope never mistakes the custom main-product-selector for an HTML main',()=>{
 const html='<main><h1>Wuri</h1><em class="product__ingredients">citra hops, mandarin, sugarcane</em>'+
  '<main-product-selector class="selector">Size</main-product-selector>'+
  '<h2>More coffees</h2><p>Another coffee tasting notes</p></main>';
 const once=productMarkup(html);
 const twice=productMarkup(once);
 assert.match(twice,/citra hops, mandarin, sugarcane/);
 assert.doesNotMatch(twice,/Another coffee tasting notes/);
 assert.match(twice,/main-product-selector/);
});
test('long Onyx H1 with real audio markup still exposes this lot tasting notes',()=>{
 const long='<audio src="'+('lot-sound'.repeat(700))+'"></audio>';
 const r=preview('onyxcoffeelab.com/products/ethiopia-lot-26','Onyx',
  '<p class="tasting-notes kapra"><span class="note">Strawberry</span>'+
  '<span class="note">Honeysuckle</span><span class="note">Pink Lemonade</span>'+
  '<span class="note">Peach</span></p>'+
  '<div class="a-stat" data-name="roast-level"><p>Ultra Light<br><label>ROAST LEVEL</label></p></div>',
  'Ethiopia Mullugeta Muntasha Natural');
 // The fixture's long H1 is inserted after the product title markup,
 // preserving the shape of Onyx audio metadata within its main title.
 const source='<html><head><meta property="og:type" content="product">'+
  '<meta property="og:title" content="Ethiopia Mullugeta Muntasha Natural">'+
  '<meta property="og:site_name" content="Onyx"></head><body><main>'+
  '<h1 class="blinds-text">Ethiopia Mullugeta Muntasha Natural'+long+'</h1>'+
  '<p class="tasting-notes kapra"><span class="note">Strawberry</span><span class="note">Honeysuckle</span>'+
  '<span class="note">Pink Lemonade</span><span class="note">Peach</span></p>'+
  '<div class="a-stat" data-name="roast-level"><p>Ultra Light<br><label>ROAST LEVEL</label></p></div></main></body></html>';
 assert.equal(r.fields.tasting_notes,'Strawberry, Honeysuckle, Pink Lemonade, Peach');
 const full=extractPublicCoffeeFacts(source,{source_url:'https://onyxcoffeelab.com/products/ethiopia-lot-26'});
 assert.equal(full.fields.tasting_notes,'Strawberry, Honeysuckle, Pink Lemonade, Peach');
});
test('Onyx named elevation modal is product evidence, adjacent education is not',()=>{
 const r=preview('onyxcoffeelab.com/products/ethiopia-lot','Onyx',
  '<div class="a-stat" data-name="roast-level"><p>Ultra Light<br><label>ROAST LEVEL</label></p></div>'+
  '<div class="a-stat-desc" data-stat-id="elevation"><h2>Elevation</h2><h4>2150 MASL</h4><p>General elevation article mentions 1800 MASL.</p></div>');
 assert.equal(r.fields.elevation_m,'2150 MASL');
 const bad=preview('onyxcoffeelab.com/products/other','Onyx',
  '<div class="a-stat" data-name="roast-level"><p>Ultra Light<br><label>ROAST LEVEL</label></p></div>'+
  '<div class="a-stat-desc" data-stat-id="origin"><h2>Elevation</h2><h4>2150 MASL</h4></div>');
 assert.equal(bad.fields.elevation_m,undefined);
});
test('PERC explicitly named grower is captured only from its own coffee story',()=>{
 for(const [name,grower,farm] of [
  ['Colombia Franky Hoyos Adv Washed','Franky Hoyos','El Encanto'],
  ['Outpost Coffee','Jhon Rodriguez','Rio Negro']]){
  const x=preview('perccoffee.com/products/'+name.toLowerCase().replace(/\s+/g,'-'),'PERC COFFEE',
   '<h2>THE DEETS!</h2><p>'+grower+' produces fantastic coffee at his farm, '+farm+
   '. This is a wonderful lot with distinct sweetness.</p><h2>BREW RECCS</h2><p>Another farm</p>',name);
  assert.equal(x.fields.producer,grower);
 }
 const noName=preview('perccoffee.com/products/unnamed','PERC COFFEE',
  '<h2>THE DEETS!</h2><p>This coffee is grown at El Encanto farm.</p>');
 assert.equal(noName.fields.producer,undefined);
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
   '<h2>850 Small Holder Farmers</h2><div>PRODUCER</div>'+ 
   '<main-product-selector class="selector">Size</main-product-selector>',title);
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
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/<dt>Tasting Notes<\/dt><dd>guava, raspberry &amp; milk chocolate<\/dd>/);
 // Crucial end-to-end boundary: real extracted tasting_notes goes into the
 // actual textarea field immediately on Autofill, without ever submitting.
 let changed=0;
 const notes={value:'',tagName:'TEXTAREA',dispatchEvent(){changed++;}};
 const name={value:'My manually entered bag name',tagName:'INPUT',dispatchEvent(){changed++;}};
 const form={elements:{namedItem(key){return {tasting_notes:notes,name}[key]||null;}}};
 assert.deepEqual(applyCoffeeUrlFields(form,r),{filled:1,skipped:1});
 assert.equal(notes.value,'guava, raspberry & milk chocolate');
 assert.equal(name.value,'My manually entered bag name');
 assert.equal(changed,1);
 // A subsequent lookup cannot erase or replace manually corrected notes.
 notes.value='Manually corrected flavors';
 assert.deepEqual(applyCoffeeUrlFields(form,r),{filled:0,skipped:2});
 assert.equal(notes.value,'Manually corrected flavors');
});

test('French selected-product tasting story yields only its literal named flavor notes',()=>{
 const r=preview('en.examplecoffee.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey','Example Roaster',
  '<p>Ce Gesha en process Honey issu du bloc Oma offre des notes florales éclatantes (bergamote), du citron confit et une sucrosité rappelant la pêche jaune.</p>'+
  '<h2>RELATED PRODUCTS</h2><p>Notes florales éclatantes (abricot), du citron séché et une sucrosité rappelant la cerise.</p>',
  'Ethiopia - Gesha Village - Lot #26/136 - Oma Honey');
 assert.equal(r.fields.tasting_notes,'bergamote, citron confit, pêche jaune');
 assert.equal(r.fields.release_label,'Lot #26/136');
 const unrelated=preview('en.examplecoffee.com/product-page/other-lot','Example Roaster',
  '<p>Only a Honey processing description.</p><h2>More Coffees</h2><p>Notes florales éclatantes (bergamote), du citron confit et une sucrosité rappelant la pêche jaune.</p>',
  'Other Lot');
 assert.equal(unrelated.fields.tasting_notes,undefined);
 assert.equal(unrelated.fields.release_label,undefined);
});

test('selected product flavor-profile chips become directly autofillable notes',()=>{
 const r=preview('roaster.example.com/products/banko-2026','Example',
  '<div class="product-flavor-profile"><span>Peach Brûlée</span><span>Cantaloupe</span><span>Honey</span></div>');
 assert.equal(r.fields.tasting_notes,'Peach Brûlée, Cantaloupe, Honey');
});
test('labeled selected-product tasting-note bullet list retains discrete notes',()=>{
 const r=preview('roaster.example.com/products/lot','Example',
  '<ul data-testid="product-tasting-notes"><li>Blackcurrant</li><li>Orange Zest</li><li>Brown Sugar</li></ul>');
 assert.equal(r.fields.tasting_notes,'Blackcurrant, Orange Zest, Brown Sugar');
});
test('unknown chips, processes, and related coffee are not promoted to tasting notes',()=>{
 const misc=preview('roaster.example.com/products/lot','Example',
  '<div class="selling-points"><span>Peach</span><span>Cantaloupe</span></div>');
 assert.equal(misc.fields.tasting_notes,undefined);
 const process=preview('roaster.example.com/products/lot','Example',
  '<ul class="tasting-notes"><li>Natural process</li><li>Anaerobic fermentation</li></ul>');
 assert.equal(process.fields.tasting_notes,undefined);
 const other=preview('roaster.example.com/products/lot','Example',
  '<h2>Related products</h2><div class="flavor-profile"><span>Peach</span><span>Melon</span></div>');
 assert.equal(other.fields.tasting_notes,undefined);
});
test('a short product-local tasting notes paragraph survives escaped ampersands',()=>{
 const r=preview('roaster.example.com/products/lot','Example',
  '<p class="tasting-notes">Raspberry, Bergamot &amp; Cacao</p>');
 assert.equal(r.fields.tasting_notes,'Raspberry, Bergamot & Cacao');
});
