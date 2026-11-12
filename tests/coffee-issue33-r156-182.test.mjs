import test from 'node:test';
import assert from 'node:assert/strict';
import {original182,selected182Evidence} from '../scripts/audit/issue33-r156-182-check.mjs';
import {extractSelectedCoffeeRoastVariants,extractSelectedCoffeeRoastVariantsFromHtml} from '../src/server/coffee-roast-variants.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const options=[{name:'Roast Profile',values:['Medium','Medium Dark']}];
const description='<p>Our small farm Kona coffee.</p><h3>Details</h3><p>Origin: Award-winning 100% Kona, Big Island<br>Tasting Notes by Roast:<br>'+
 'Medium: Bittersweet chocolate, cream, prune, caramel<br>'+
 'Medium Dark: Caramel, butter, cocoa, toffee, creamy body, sweet spice</p><h3>Ingredients</h3><p>100% Kona coffee.</p>';
const ctl='<fieldset><legend>Roast Profile</legend><input type="radio" name="Roast Profile" value="Medium"><input type="radio" name="Roast Profile" value="Medium Dark"></fieldset>';
const page=(body=description,control=ctl,title=original182.name,extra='')=>
 '<html><head><title>Former coffee tasting notes: lemon &amp; cedar</title><meta name="description" content="Former lot roasted Dark"></head>'+
 '<body><nav>Other Kona Classic cacao</nav><main id="MainContent"><article class="product"><h1>'+title+'</h1>'+control+
 '<div class="product__description">'+body+'</div></article></main>'+extra+'<footer>Other coffee</footer></body></html>';
test('#182 explicit roast alternatives return two independent direct lists',()=>{
 const variants=extractSelectedCoffeeRoastVariants({description,options});
 assert.deepEqual(variants.map(v=>[v.id,v.fields.tasting_notes]),[
  ['medium',original182.medium],['medium-dark',original182.mediumDark]]);
});
test('#182 selected official HTML with offered roast controls recovers both profiles',()=>{
 const found=selected182Evidence(page());
 assert.equal(found.headingsMatch,true);assert.equal(found.directBoth,true);
 assert.equal(found.noExtraRoasts,true);assert.equal(found.mediumMatch,true);assert.equal(found.mediumDarkMatch,true);
});
test('#182 selected product must not auto-select roast or mix generic tastes',()=>{
 const found=selected182Evidence(page());
 const base={ok:true,fields:{name:original182.name,roaster:'Kona Earth Coffee'},roast_variants:found.variants};
 assert.match(coffeeUrlPreviewMarkup(base),/Which roast did you buy/);
 assert.equal(base.fields.tasting_notes,undefined);assert.equal(base.fields.roast_level,undefined);
 assert.equal(coffeeRoastVariantPreview(base,'medium').fields.tasting_notes,original182.medium);
 assert.equal(coffeeRoastVariantPreview(base,'medium-dark').fields.tasting_notes,original182.mediumDark);
});
test('#182 other-coffee SEO cannot replace selected product H1',()=>{
 assert.equal(selected182Evidence(page(description,ctl,'Kona 2027 Yellow Bourbon')).headingsMatch,false);
});
test('#182 missing selected roast list cannot borrow unrelated nav/footer/metadata',()=>{
 const removed=description.replace('Tasting Notes by Roast:','General notes').replace(original182.medium,'unknown');
 const e=selected182Evidence(page(removed,ctl,original182.name,'<aside>'+description+'</aside>'));
 assert.equal(e.directBoth,false);assert.equal(e.mediumMatch,false);
});
test('#182 marketing roast words without purchase controls cannot generate variants',()=>{
 for(const control of ['', '<div>Medium and Medium Dark are popular roasts</div>',
  '<fieldset><legend>Grinding</legend><input type="radio" value="Medium"><input type="radio" value="Medium Dark"></fieldset>']){
  assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(page(description,control)),[]);
 }
});
test('#182 single purchase roast cannot manufacture second option',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(page(description,ctl.replace('<input type="radio" name="Roast Profile" value="Medium Dark">',''))),[]);
});
test('#182 unrelated flavor labels are not used to fill a missing selected profile',()=>{
 const partial=description.replace('Medium Dark: '+original182.mediumDark,'Medium Dark: flavor profile not published');
 const variants=extractSelectedCoffeeRoastVariants({description:partial,options});
 assert.ok(!variants.length||!variants.find(v=>v.id==='medium-dark')?.fields.tasting_notes);
});
test('#182 other variant options and stale metadata must not force dark or decaf',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:original182.url});
 assert.ok(!p.ok||(!p.fields.decaffeination_method&&p.fields.roast_level!=='Dark'));
});
test('#182 unrelated pages lack positive product-scope purchase roast proof',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml('<html><body><nav>'+ctl+'</nav><section>'+description+'</section></body></html>'),[]);
});
test('#182 exact title qualification cannot be supplied by a related-product section',()=>{
 const html=page(description,ctl,'Kona Reserve','<section class="related-products"><h1>'+original182.name+'</h1></section>');
 assert.equal(selected182Evidence(html).headingsMatch,false);
});
test('#182 printed notes containing same-product Medium and Medium Dark stay separate',()=>{
 const choices=extractSelectedCoffeeRoastVariants({description,options});
 assert.equal(choices.find(v=>v.id==='medium').fields.tasting_notes.includes('sweet spice'),false);
 assert.equal(choices.find(v=>v.id==='medium-dark').fields.tasting_notes.includes('prune'),false);
});
